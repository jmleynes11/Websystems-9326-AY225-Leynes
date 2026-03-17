const express   = require("express");
const puppeteer = require("puppeteer");
const cors      = require("cors");
const path      = require("path");
const fs        = require("fs");

const app  = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/ping", (_req, res) => res.json({ ok: true }));

const ALLOWED = ["capcom-games.com", "www.capcom-games.com"];
function isValidURL(url) {
  try { return ALLOWED.includes(new URL(url).hostname); }
  catch { return false; }
}

let browser = null;
async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu"],
    });
  }
  return browser;
}

async function openPage(url, wait = 5000) {
  const b    = await getBrowser();
  const page = await b.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
  await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
  await page.setRequestInterception(true);
  page.on("request", r => {
    if (["media","font"].includes(r.resourceType())) r.abort();
    else r.continue();
  });
  const resp   = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 50000 });
  const status = resp ? resp.status() : 0;
  if (status === 404) { await page.close(); const e = new Error("404"); e.code="HTTP_404"; throw e; }
  try { await page.waitForNetworkIdle({ idleTime: 2000, timeout: 12000 }); } catch {}
  await new Promise(r => setTimeout(r, wait));
  await page.evaluate(async () => {
    for (let i = 0; i < 5; i++) { window.scrollBy(0, window.innerHeight); await new Promise(r => setTimeout(r, 500)); }
    window.scrollTo(0, 0);
  });
  await new Promise(r => setTimeout(r, 1500));
  return page;
}

app.post("/api/debug", async (req, res) => {
  let { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL" });
  url = url.trim();
  if (!url.startsWith("http")) url = "https://" + url;
  if (!isValidURL(url)) return res.status(400).json({ error: "Not a Capcom URL" });
  let page = null;
  try {
    page = await openPage(url, 5000);
    const info = await page.evaluate(() => {
      const allLinks = [...document.querySelectorAll("a[href]")].map(a => a.getAttribute("href")).filter(Boolean).slice(0, 80);
      const headings = [...document.querySelectorAll("h1,h2,h3,h4")].map(e => e.innerText?.trim()).filter(Boolean).slice(0, 20);
      const ogTitle  = document.querySelector("meta[property='og:title']")?.getAttribute("content");
      const gameEls  = [...document.querySelectorAll("[class*='game'],[class*='title'],[class*='card'],[class*='product'],[class*='lineup']")]
        .map(e => ({ tag: e.tagName, cls: e.className?.toString().slice(0,80), text: e.innerText?.trim()?.slice(0,80) }))
        .filter(e => e.text).slice(0, 30);
      const images   = [...document.querySelectorAll("img")].map(i => i.getAttribute("src")).filter(Boolean).slice(0, 15);
      return { pageTitle: document.title, ogTitle, allLinks, headings, gameEls, images };
    });
    await page.close();
    res.json(info);
  } catch(e) {
    if (page) { try { await page.close(); } catch {} }
    res.status(500).json({ error: e.message });
  }
});

function extractDateFromText(text) {
  if (!text) return null;
  const m = text.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}/i) || text.match(/\b\d{4}[\/\-]\d{2}[\/\-]\d{2}\b/);
  return m ? m[0] : null;
}
function extractPlatformsFromText(text) {
  if (!text) return null;
  const known = ["PlayStation 5","PS5","PlayStation 4","PS4","Xbox Series X","Xbox Series S","Xbox One","Nintendo Switch","Switch","PC","Steam","Windows"];
  const found = known.filter(p => text.includes(p));
  return found.length ? [...new Set(found)].join(", ") : null;
}

async function extractFromListingPage(page, baseURL) {
  return await page.evaluate((baseURL) => {
    function abs(src) {
      if (!src) return null;
      if (src.startsWith("http")) return src;
      if (src.startsWith("//")) return "https:" + src;
      try { return new URL(src, baseURL).href; } catch { return null; }
    }
    const games = []; const seen = new Set();
    const cards = [...document.querySelectorAll("a[href]")].filter(a => {
      const href = a.getAttribute("href") || "";
      if (!href || href === "/" || href === "#") return false;
      if (!a.querySelector("img")) return false;
      const txt = (a.innerText || a.textContent || "").trim();
      if (txt.length < 2 || txt.length > 300) return false;
      return true;
    });
    for (const card of cards) {
      const href = card.getAttribute("href") || "";
      const full = abs(href);
      if (!full || seen.has(full)) continue;
      seen.add(full);
      const titleEl = card.querySelector("h1,h2,h3,h4,h5,.title,.game-title,strong,b");
      const title   = (titleEl?.innerText || card.innerText || "").trim().split("\n")[0].trim();
      if (!title || title.length < 2 || title.length > 120) continue;
      const imgEl = card.querySelector("img");
      const img   = abs(imgEl?.getAttribute("src") || imgEl?.getAttribute("data-src") || null);
      const allText = (card.innerText || "").replace(/\s+/g," ").trim();
      games.push({ title: title.slice(0,120), sourceURL: full, coverImage: img, rawText: allText.slice(0,300) });
      if (games.length >= 20) break;
    }
    if (games.length === 0) {
      const containers = [...document.querySelectorAll("[class*='gameList'] [class*='item'],[class*='game-list'] li,[class*='lineup'] [class*='item'],[class*='productList'] [class*='item'],[class*='titleList'] [class*='item'],.swiper-slide,[class*='grid'] > *")];
      for (const el of containers) {
        const a = el.querySelector("a[href]") || (el.tagName==="A" ? el : null);
        const href = a?.getAttribute("href");
        if (!href) continue;
        const full = abs(href);
        if (!full || seen.has(full)) continue;
        seen.add(full);
        const titleEl = el.querySelector("h1,h2,h3,h4,h5,[class*='title'],[class*='name']");
        const title   = (titleEl?.innerText || el.innerText || "").trim().split("\n")[0].trim();
        if (!title || title.length < 2 || title.length > 120) continue;
        const imgEl = el.querySelector("img");
        const img   = abs(imgEl?.getAttribute("src") || imgEl?.getAttribute("data-src") || null);
        const allText = (el.innerText || "").replace(/\s+/g," ").trim();
        games.push({ title: title.slice(0,120), sourceURL: full, coverImage: img, rawText: allText.slice(0,300) });
        if (games.length >= 20) break;
      }
    }
    return games;
  }, baseURL);
}

async function extractGameDetail(page, game, baseURL) {
  const detail = await page.evaluate((pageURL, baseURL) => {
    const q = (...sels) => { for (const sel of sels) { try { const el = document.querySelector(sel); if (!el) continue; const v = (el.getAttribute("content") || el.innerText || el.textContent || "").replace(/\s+/g," ").trim(); if (v && v.length > 1) return v; } catch {} } return null; };
    const qAll = (...sels) => { for (const sel of sels) { try { const els = [...document.querySelectorAll(sel)]; const texts = els.map(e => (e.innerText||e.textContent||"").replace(/\s+/g," ").trim()).filter(t=>t.length>1&&t.length<200); if (texts.length) return texts; } catch {} } return []; };
    const labeled = (lbl) => { for (const el of document.querySelectorAll("dt,th,td,li,p,span,div,strong,b,label")) { const txt=(el.innerText||el.textContent||"").trim().toLowerCase(); if (txt===lbl||txt===lbl+":") { for (const next of [el.nextElementSibling,el.parentElement?.nextElementSibling,el.closest("tr,li,div")?.querySelector("dd,td:last-child")]) { if (!next) continue; const v=(next.innerText||next.textContent||"").replace(/\s+/g," ").trim(); if (v&&v.length>1&&v.length<120&&v.toLowerCase()!==lbl) return v; } } } return null; };
    const title = q("meta[property='og:title']") || q("h1") || document.title.split("|")[0].split("–")[0].split("-")[0].trim();
    let releaseDate = q("[class*='releaseDate'],[class*='release-date']","time") || labeled("release date") || labeled("release");
    if (!releaseDate) { const m = document.body.innerText.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}/i)||document.body.innerText.match(/\b\d{4}[\/\-]\d{2}[\/\-]\d{2}\b/); if (m) releaseDate=m[0]; }
    let keyFeatures = null;
    const feats = qAll("[class*='feature'] li","[class*='Feature'] li","[class*='highlight'] li","[class*='point'] li");
    if (feats.length>=2) keyFeatures=feats.slice(0,6).join(" | ");
    if (!keyFeatures) keyFeatures=q("meta[property='og:description']","meta[name='description']","[class*='description']","[class*='overview']");
    let plat=null;
    const platItems=qAll("[class*='platform'] li","[class*='Platform'] li","[class*='platform'] span","[class*='Platform'] span");
    if (platItems.length) plat=[...new Set(platItems.filter(p=>p.length<50))].join(", ");
    if (!plat) plat=labeled("platform")||labeled("platforms");
    if (!plat) { const known=["PlayStation 5","PS5","PlayStation 4","PS4","Xbox Series X|S","Xbox Series X","Xbox Series S","Xbox One","Nintendo Switch","Switch","PC","Steam","Windows","iOS","Android","Mobile"]; const found=known.filter(p=>document.body.innerText.includes(p)); if (found.length) plat=[...new Set(found)].join(", "); }
    const developer=q("[class*='developer'],[class*='Developer']")||labeled("developer")||labeled("developed by");
    const publisher=q("[class*='publisher'],[class*='Publisher']")||labeled("publisher")||labeled("published by");
    let cover=q("meta[property='og:image']","meta[property='og:image:secure_url']");
    if (!cover) { for (const sel of ["[class*='keyVisual'] img","[class*='hero'] img","[class*='cover'] img","img"]) { const el=document.querySelector(sel); const src=el?.getAttribute("src")||el?.getAttribute("data-src")||""; if (src&&src.length>5&&!src.match(/logo|icon|sprite|blank/i)){cover=src;break;} } }
    if (cover&&!cover.startsWith("http")) { if (cover.startsWith("//")) cover="https:"+cover; else { try{cover=new URL(cover,baseURL).href;}catch{cover=null;} } }
    return { title:(title||"").slice(0,120), releaseDate, keyFeatures, plat, developer, publisher, cover };
  }, game.sourceURL, baseURL);
  return {
    title: detail.title||game.title,
    releaseDate: detail.releaseDate||extractDateFromText(game.rawText)||"Not Available",
    keyFeatures: detail.keyFeatures||"Not Available",
    platformAvailability: detail.plat||extractPlatformsFromText(game.rawText)||"Not Available",
    developer: detail.developer||"Not Available",
    publisher: detail.publisher||"Not Available",
    coverImage: detail.cover||game.coverImage,
    sourceURL: game.sourceURL,
  };
}

app.post("/api/scrape", async (req, res) => {
  let { url } = req.body;
  if (!url||!url.trim()) return res.status(400).json({ error:"URL_EMPTY", message:"Please provide a URL." });
  url=url.trim();
  if (!url.startsWith("http")) url="https://"+url;
  if (!isValidURL(url)) return res.status(400).json({ error:"URL_INVALID", message:"Invalid URL. Only capcom-games.com URLs are accepted." });
  const baseURL=new URL(url).origin;
  const tryURLs=[url,baseURL+"/en-asia/",baseURL+"/en-us/",baseURL+"/"];
  const uniqueURLs=[...new Set(tryURLs)];
  let listingGames=[]; let usedURL=url;
  for (const tryURL of uniqueURLs) {
    let listPage=null;
    try {
      console.log(`[SCRAPE] Trying: ${tryURL}`);
      listPage=await openPage(tryURL,5000);
      listingGames=await extractFromListingPage(listPage,baseURL);
      await listPage.close(); listPage=null;
      if (listingGames.length>0) { usedURL=tryURL; console.log(`[SCRAPE] Found ${listingGames.length} games at: ${tryURL}`); break; }
      else console.log(`[SCRAPE] No games found at: ${tryURL}`);
    } catch(e) { if (listPage){try{await listPage.close();}catch{}} console.log(`[SCRAPE] Error at ${tryURL}: ${e.message}`); }
  }
  if (listingGames.length===0) return res.status(404).json({ error:"NO_GAMES_FOUND", message:"Could not find any game cards. Make sure https://www.capcom-games.com/en-asia/ is accessible in your browser." });
  const games=[]; let skipped=0;
  for (const stub of listingGames) {
    if (games.length>=15) break;
    let gPage=null;
    try {
      console.log(`[SCRAPE] → ${stub.title}`);
      gPage=await openPage(stub.sourceURL,4000);
      const full=await extractGameDetail(gPage,stub,baseURL);
      await gPage.close(); gPage=null;
      if (!games.find(g=>g.title===full.title)) { games.push(full); console.log(`[SCRAPE] ✅ ${full.title}`); } else skipped++;
    } catch(e) {
      if (gPage){try{await gPage.close();}catch{}}
      if (stub.title&&!games.find(g=>g.title===stub.title)) {
        games.push({ title:stub.title, releaseDate:extractDateFromText(stub.rawText)||"Not Available", keyFeatures:"Not Available", platformAvailability:extractPlatformsFromText(stub.rawText)||"Not Available", developer:"Not Available", publisher:"Not Available", coverImage:stub.coverImage, sourceURL:stub.sourceURL });
        console.log(`[SCRAPE] ⚠ Used listing data: ${stub.title}`);
      } else skipped++;
    }
  }
  if (games.length===0) return res.status(404).json({ error:"SCRAPE_EMPTY", message:"Could not extract game data." });
  const payload={scrapedAt:new Date().toISOString(),sourceURL:usedURL,count:games.length,games};
  fs.writeFileSync(path.join(__dirname,"public","scraped_data.json"),JSON.stringify(payload,null,2));
  console.log(`[SCRAPE] ✅ Done — ${games.length} games`);
  res.json({ success:true,count:games.length,games,scrapedAt:payload.scrapedAt });
});

app.get("/api/download/json",(req,res)=>{ const p=path.join(__dirname,"public","scraped_data.json"); if (!fs.existsSync(p)) return res.status(404).json({error:"No data yet."}); res.download(p,"capcom_games.json"); });
app.get("/api/download/csv",(req,res)=>{ const p=path.join(__dirname,"public","scraped_data.json"); if (!fs.existsSync(p)) return res.status(404).json({error:"No data yet."}); const {games}=JSON.parse(fs.readFileSync(p,"utf8")); const cols=["title","releaseDate","keyFeatures","platformAvailability","developer","publisher","sourceURL"]; const esc=v=>`"${String(v||"").replace(/"/g,'""')}"`; res.setHeader("Content-Type","text/csv"); res.setHeader("Content-Disposition",'attachment; filename="capcom_games.csv"'); res.send([cols.join(","),...games.map(g=>cols.map(c=>esc(g[c])).join(","))].join("\n")); });

process.on("SIGINT",async()=>{ if(browser) await browser.close(); process.exit(0); });
app.listen(PORT,()=>console.log(`🎮 Capcom Scraper running → http://localhost:${PORT}`));
