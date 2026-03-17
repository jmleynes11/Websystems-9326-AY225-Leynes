/* ── STATE ───────────────────────────────────── */
let allGames = [];
let currentView = 'grid';

/* ── SERVER CHECK ON LOAD ────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  if (window.location.protocol === 'file:') {
    showSetupBanner('FILE_PROTOCOL');
    return;
  }
  // Ping the server silently
  fetch('/api/ping').catch(() => showSetupBanner('SERVER_DOWN'));
});

function showSetupBanner(reason) {
  const existing = document.getElementById('setup-banner');
  if (existing) return;

  const isFile = reason === 'FILE_PROTOCOL';
  const banner = document.createElement('div');
  banner.id = 'setup-banner';
  banner.innerHTML = `
    <div class="setup-banner-inner">
      <div class="setup-icon">${isFile ? '📁' : '⚡'}</div>
      <div class="setup-text">
        <strong>${isFile ? 'Wrong launch method' : 'Server not running'}</strong>
        ${isFile
          ? 'You opened the HTML file directly. This app requires the Node.js server.'
          : 'The Node.js backend is not reachable. Start it with the steps below.'}
      </div>
      <div class="setup-steps">
        <div class="setup-step"><span class="step-num">1</span><code>cd capcom-scraper</code></div>
        <div class="setup-step"><span class="step-num">2</span><code>npm install</code></div>
        <div class="setup-step"><span class="step-num">3</span><code>npm start</code></div>
        <div class="setup-step"><span class="step-num">4</span><span>Open <a href="http://localhost:3000" target="_blank">http://localhost:3000</a> in your browser</span></div>
      </div>
      <button class="setup-dismiss" onclick="document.getElementById('setup-banner').remove()">✕ Dismiss</button>
    </div>
  `;
  document.body.insertBefore(banner, document.body.firstChild);
}

/* ── PARTICLES ───────────────────────────────── */
(function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * 2000,
      y: Math.random() * 1200,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(230,0,18,${p.alpha})`;
      ctx.fill();
    });
    // draw connecting lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(230,0,18,${0.06 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ── SCRAPE ──────────────────────────────────── */
async function startScrape() {
  const input = document.getElementById('url-input');
  const url = input.value.trim();
  const errorEl = document.getElementById('url-error');

  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  if (!url) {
    showError('⚠ Please enter a URL before executing.');
    return;
  }

  let testURL = url;
  if (!testURL.startsWith('http')) testURL = 'https://' + testURL;

  try {
    new URL(testURL);
  } catch {
    showError('⚠ That doesn\'t look like a valid URL. Check the format and try again.');
    return;
  }

  const allowed = ['capcom-games.com', 'www.capcom-games.com'];
  const host = new URL(testURL).hostname;
  if (!allowed.includes(host)) {
    showError(`✕ INVALID URL — Only capcom-games.com URLs are accepted. Got: "${host}"`);
    animateInvalidInput(input);
    return;
  }

  showLoading(true);
  animateProgress();

  try {
    const res = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: testURL }),
    });

    const data = await res.json();
    hideLoading();

    if (!res.ok || !data.success) {
      showError(formatAPIError(data));
      return;
    }

    allGames = data.games;
    renderResults(data);
    document.getElementById('empty-state').classList.add('hidden');

  } catch (err) {
    hideLoading();
    if (window.location.protocol === 'file:') {
      showError('📁 You opened this file directly. Run the Node.js server and visit http://localhost:3000 instead.');
      showSetupBanner('FILE_PROTOCOL');
    } else {
      showError('⚡ Server not reachable. Open a terminal in the capcom-scraper folder and run: npm install && npm start');
      showSetupBanner('SERVER_DOWN');
    }
  }
}

function formatAPIError(data) {
  const icons = {
    URL_INVALID: '✕',
    URL_EMPTY: '⚠',
    NO_GAMES_FOUND: '🔍',
    SCRAPE_EMPTY: '📄',
    NETWORK_ERROR: '📡',
    ACCESS_DENIED: '🚫',
    PAGE_NOT_FOUND: '404',
    SERVER_ERROR: '⚙',
  };
  const icon = icons[data.error] || '⚠';
  return `${icon} ${data.message || 'An unknown error occurred.'}`;
}

function showError(msg) {
  const el = document.getElementById('url-error');
  el.textContent = msg;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = 'shake 0.3s ease';
}

function animateInvalidInput(input) {
  input.style.color = '#ff6b6b';
  setTimeout(() => input.style.color = '', 1000);
}

/* ── LOADING ─────────────────────────────────── */
let progressInterval = null;

function showLoading(show) {
  const overlay = document.getElementById('loading-overlay');
  const btn = document.getElementById('scrape-btn');
  if (show) {
    overlay.classList.remove('hidden');
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'RUNNING...';
  } else {
    overlay.classList.add('hidden');
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'EXECUTE';
  }
}

function hideLoading() {
  showLoading(false);
  clearInterval(progressInterval);
  document.getElementById('progress-bar').style.width = '100%';
  setTimeout(() => { document.getElementById('progress-bar').style.width = '0%'; }, 300);
}

function animateProgress() {
  const bar = document.getElementById('progress-bar');
  const statusEl = document.getElementById('loader-status');
  const steps = [
    [10, 'Connecting to target...'],
    [25, 'Fetching game listings...'],
    [45, 'Parsing HTML structure...'],
    [60, 'Extracting game details...'],
    [75, 'Processing metadata...'],
    [88, 'Compiling results...'],
    [95, 'Almost done...'],
  ];
  let idx = 0;
  bar.style.width = '5%';
  clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    if (idx < steps.length) {
      bar.style.width = steps[idx][0] + '%';
      statusEl.textContent = steps[idx][1];
      idx++;
    }
  }, 900);
}

/* ── RENDER RESULTS ──────────────────────────── */
function renderResults(data) {
  updateStats(data);
  document.getElementById('stats-bar').classList.remove('hidden');
  document.getElementById('filter-bar').classList.remove('hidden');
  document.getElementById('search-input').value = '';
  renderGames(data.games);
}

function updateStats(data) {
  document.getElementById('stat-count').textContent = data.games.length;
  document.getElementById('stat-source').textContent = shortenURL(data.sourceURL || document.getElementById('url-input').value);
  document.getElementById('stat-time').textContent = data.scrapedAt
    ? new Date(data.scrapedAt).toLocaleTimeString()
    : new Date().toLocaleTimeString();
}

function shortenURL(url) {
  try { return new URL(url).pathname.slice(0, 24) + '…'; }
  catch { return url.slice(0, 30); }
}

function renderGames(games) {
  if (currentView === 'grid') renderGrid(games);
  else renderTable(games);
}

function renderGrid(games) {
  const grid = document.getElementById('games-grid');
  document.getElementById('games-table-wrap').classList.add('hidden');
  grid.classList.remove('hidden');
  grid.innerHTML = '';

  if (games.length === 0) {
    grid.innerHTML = '<div class="no-results">No games match your search.</div>';
    return;
  }

  games.forEach((g, i) => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.style.animationDelay = `${i * 60}ms`;
    card.onclick = () => openModal(g);

    const platformChips = splitField(g.platformAvailability)
      .slice(0, 3)
      .map(p => `<span class="chip">${p}</span>`)
      .join('');

    card.innerHTML = `
      <span class="card-click-hint">CLICK FOR DETAILS</span>
      ${g.coverImage
        ? `<img src="${g.coverImage}" alt="${escHtml(g.title)}" class="card-cover" onerror="this.parentElement.querySelector('.card-cover') && this.replaceWith(makePlaceholder('${escHtml(g.title)}'))">`
        : `<div class="card-cover-placeholder">${escHtml(g.title.slice(0,12))}</div>`
      }
      <div class="card-body">
        <div class="card-title">${escHtml(g.title)}</div>
        <div class="card-meta">
          ${g.releaseDate !== 'Not Available' ? `<span class="chip red">${escHtml(g.releaseDate)}</span>` : ''}
          ${platformChips}
        </div>
        <div class="card-dev">${escHtml(g.developer !== 'Not Available' ? g.developer : 'Capcom')}</div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderTable(games) {
  const wrap = document.getElementById('games-table-wrap');
  document.getElementById('games-grid').classList.add('hidden');
  wrap.classList.remove('hidden');
  const tbody = document.getElementById('games-table-body');
  tbody.innerHTML = '';

  if (games.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="no-results">No games match your search.</td></tr>';
    return;
  }

  games.forEach((g, i) => {
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${i * 40}ms`;
    tr.onclick = () => openModal(g);
    tr.innerHTML = `
      <td><span class="chip">${i + 1}</span></td>
      <td class="td-title">${escHtml(g.title)}</td>
      <td>${escHtml(g.releaseDate)}</td>
      <td>${escHtml(g.platformAvailability.slice(0, 40))}${g.platformAvailability.length > 40 ? '…' : ''}</td>
      <td>${escHtml(g.developer)}</td>
      <td>${escHtml(g.publisher)}</td>
      <td><button class="view-detail-btn" onclick="event.stopPropagation(); openModal(allGames[${i}])">DETAILS</button></td>
    `;
    tbody.appendChild(tr);
  });
}

/* ── FILTER ──────────────────────────────────── */
function filterGames() {
  const q = document.getElementById('search-input').value.toLowerCase().trim();
  if (!q) { renderGames(allGames); return; }
  const filtered = allGames.filter(g =>
    g.title.toLowerCase().includes(q) ||
    g.developer.toLowerCase().includes(q) ||
    g.publisher.toLowerCase().includes(q) ||
    g.platformAvailability.toLowerCase().includes(q) ||
    g.releaseDate.toLowerCase().includes(q) ||
    g.keyFeatures.toLowerCase().includes(q)
  );
  renderGames(filtered);
}

/* ── VIEW TOGGLE ─────────────────────────────── */
function setView(v) {
  currentView = v;
  document.getElementById('btn-grid').classList.toggle('active', v === 'grid');
  document.getElementById('btn-table').classList.toggle('active', v === 'table');
  filterGames();
}

/* ── MODAL ───────────────────────────────────── */
function openModal(g) {
  const modal = document.getElementById('game-modal');
  const cover = document.getElementById('modal-cover');

  document.getElementById('modal-title').textContent = g.title;
  document.getElementById('modal-release').textContent = g.releaseDate;
  document.getElementById('modal-dev').textContent = g.developer;
  document.getElementById('modal-pub').textContent = g.publisher;
  document.getElementById('modal-link').href = g.sourceURL || '#';

  // Platform badge
  const platforms = splitField(g.platformAvailability);
  document.getElementById('modal-platform-badge').textContent = platforms.join(' · ') || 'CAPCOM TITLE';

  // Platform chips
  const platformsEl = document.getElementById('modal-platforms');
  platformsEl.innerHTML = platforms.length > 0
    ? platforms.map(p => `<span class="chip">${escHtml(p)}</span>`).join('')
    : '<span class="chip">Not Available</span>';

  // Features
  const featuresEl = document.getElementById('modal-features');
  const feats = splitField(g.keyFeatures, '|');
  featuresEl.innerHTML = feats.length > 0 && g.keyFeatures !== 'Not Available'
    ? feats.map(f => `<div class="feature-item">${escHtml(f.trim())}</div>`).join('')
    : '<div class="feature-item">Not Available</div>';

  // Cover image
  if (g.coverImage) {
    cover.src = g.coverImage;
    cover.style.display = '';
  } else {
    cover.style.display = 'none';
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(e) {
  if (e.target === document.getElementById('game-modal')) closeModalBtn();
}

function closeModalBtn() {
  document.getElementById('game-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// Close with ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModalBtn();
});

// Enter key on input
document.getElementById('url-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') startScrape();
});

/* ── DOWNLOAD ────────────────────────────────── */
function downloadJSON() {
  window.open('/api/download/json', '_blank');
}
function downloadCSV() {
  window.open('/api/download/csv', '_blank');
}

/* ── HELPERS ─────────────────────────────────── */
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function splitField(val, sep = ',') {
  if (!val || val === 'Not Available') return [];
  return val.split(sep).map(s => s.trim()).filter(Boolean);
}

function makePlaceholder(title) {
  const div = document.createElement('div');
  div.className = 'card-cover-placeholder';
  div.textContent = title.slice(0, 12);
  return div;
}