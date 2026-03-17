// main.js - Main JavaScript file for Bacoor City Website

document.addEventListener('DOMContentLoaded', function() {
    // ========== MOBILE MENU TOGGLE ==========
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            this.classList.toggle('active');
        });
    }

    // ========== SINGLE PAGE NAVIGATION ==========
    const navLinks = document.querySelectorAll('.nav-link');
    const pageSections = document.querySelectorAll('.page-section');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get the target page
            const targetPage = this.getAttribute('data-page');
            
            // Show target section and hide others
            pageSections.forEach(section => {
                section.classList.remove('active');
            });
            
            // Show the target section
            const targetSection = document.getElementById(targetPage);
            if (targetSection) {
                targetSection.classList.add('active');
                
                // Update URL hash without scrolling
                history.pushState(null, null, `#${targetPage}`);
            }
            
            // Update active nav link
            navLinks.forEach(navLink => {
                navLink.classList.remove('active');
            });
            this.classList.add('active');
            
            // Close mobile menu if open
            if (navMenu) {
                navMenu.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            }
            
            // Scroll to top smoothly
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    });

    // ========== CHECK INITIAL HASH ON PAGE LOAD ==========
    function checkInitialHash() {
        const hash = window.location.hash.substring(1);
        if (hash && document.getElementById(hash)) {
            // Remove active from all sections
            pageSections.forEach(section => {
                section.classList.remove('active');
            });
            
            // Add active to hash section
            document.getElementById(hash).classList.add('active');
            
            // Update nav links
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('data-page') === hash) {
                    link.classList.add('active');
                }
            });
        }
    }
    
    checkInitialHash();

    // ========== ACCORDION FUNCTIONALITY ==========
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    
    accordionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const content = this.nextElementSibling;
            const icon = this.querySelector('.accordion-icon');
            
            // Toggle active class
            content.classList.toggle('active');
            
            // Toggle icon
            if (content.classList.contains('active')) {
                icon.textContent = '−';
                content.style.maxHeight = content.scrollHeight + 'px';
            } else {
                icon.textContent = '+';
                content.style.maxHeight = '0px';
            }
            
            // Close other accordion items in the same parent
            const parentAccordion = this.closest('.accordion');
            if (parentAccordion) {
                const otherHeaders = parentAccordion.querySelectorAll('.accordion-header');
                otherHeaders.forEach(otherHeader => {
                    if (otherHeader !== this) {
                        const otherContent = otherHeader.nextElementSibling;
                        otherContent.classList.remove('active');
                        otherContent.style.maxHeight = '0px';
                        otherHeader.querySelector('.accordion-icon').textContent = '+';
                    }
                });
            }
        });
        
        // Initialize accordion heights
        const content = header.nextElementSibling;
        if (content.classList.contains('active')) {
            content.style.maxHeight = content.scrollHeight + 'px';
            header.querySelector('.accordion-icon').textContent = '−';
        } else {
            content.style.maxHeight = '0px';
        }
    });

    // ========== FORM VALIDATION AND SUBMISSION ==========
    // Service Request Form
    const serviceForm = document.getElementById('serviceForm');
    if (serviceForm) {
        serviceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Simple validation
            let isValid = true;
            const requiredFields = this.querySelectorAll('[required]');
            
            requiredFields.forEach(field => {
                field.style.borderColor = '#ddd';
                if (!field.value.trim()) {
                    field.style.borderColor = '#e74c3c';
                    isValid = false;
                }
            });
            
            if (isValid) {
                // Show success message
                alert('Service request submitted successfully! We will contact you within 24 hours.');
                
                // Generate reference number
                const refNumber = 'SR-' + Date.now().toString().slice(-8);
                alert(`Your reference number is: ${refNumber}`);
                
                // Reset form
                this.reset();
                
                // Store in localStorage (simulating database)
                const serviceRequest = {
                    name: document.getElementById('name').value,
                    email: document.getElementById('email').value,
                    service: document.getElementById('service').value,
                    message: document.getElementById('message').value,
                    reference: refNumber,
                    date: new Date().toISOString(),
                    status: 'pending'
                };
                
                saveToStorage('serviceRequests', serviceRequest);
            } else {
                alert('Please fill in all required fields.');
            }
        });
    }

    // Contact Form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Simple validation
            let isValid = true;
            const requiredFields = this.querySelectorAll('[required]');
            
            requiredFields.forEach(field => {
                field.style.borderColor = '#ddd';
                if (!field.value.trim()) {
                    field.style.borderColor = '#e74c3c';
                    isValid = false;
                }
            });
            
            // Email validation
            const emailField = document.getElementById('contactEmail');
            if (emailField && emailField.value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(emailField.value)) {
                    emailField.style.borderColor = '#e74c3c';
                    isValid = false;
                    alert('Please enter a valid email address.');
                }
            }
            
            if (isValid) {
                // Show success message
                alert('Message sent successfully! Thank you for contacting Bacoor City LGU.');
                
                // Store contact message
                const contactMessage = {
                    name: document.getElementById('contactName').value,
                    email: document.getElementById('contactEmail').value,
                    subject: document.getElementById('contactSubject').value,
                    message: document.getElementById('contactMessage').value,
                    date: new Date().toISOString(),
                    read: false
                };
                
                saveToStorage('contactMessages', contactMessage);
                
                // Reset form
                this.reset();
            } else {
                alert('Please fill in all required fields correctly.');
            }
        });
    }

    // ========== ANNOUNCEMENTS FUNCTIONALITY ==========
    function loadAnnouncements() {
        const announcementsGrid = document.querySelector('.announcements-grid');
        if (!announcementsGrid) return;
        
        // Sample announcements data
        const announcements = [
            {
                id: 1,
                title: '🚧 Road Construction Notice',
                content: 'Major road rehabilitation along Molino Boulevard from November 15-30, 2024. Expect traffic rerouting.',
                category: 'Advisory',
                date: '2024-11-10',
                urgent: true
            },
            {
                id: 2,
                title: '🏥 Free Medical Mission',
                content: 'Free medical and dental services at City Hall grounds on November 20, 2024, 8AM-5PM.',
                category: 'Event',
                date: '2024-11-12',
                urgent: false
            },
            {
                id: 3,
                title: '💼 Business Permit Renewal',
                content: 'Renewal of business permits starts January 1, 2025. Early renewals get 10% discount until Dec 15.',
                category: 'Program',
                date: '2024-11-08',
                urgent: false
            },
            {
                id: 4,
                title: '🎄 Christmas Festival 2024',
                content: 'Join our Christmas Festival from December 15-25 featuring concerts, bazaars, and fireworks.',
                category: 'Event',
                date: '2024-11-05',
                urgent: false
            }
        ];
        
        // Load announcements from localStorage if available
        const savedAnnouncements = getFromStorage('announcements');
        const displayAnnouncements = savedAnnouncements && savedAnnouncements.length > 0 ? savedAnnouncements : announcements;
        
        // Clear existing content
        announcementsGrid.innerHTML = '';
        
        // Create announcement cards
        displayAnnouncements.forEach(announcement => {
            const card = document.createElement('div');
            card.className = 'announcement-card';
            if (announcement.urgent) {
                card.classList.add('urgent');
            }
            
            card.innerHTML = `
                <h3>${announcement.title}</h3>
                <p>${announcement.content}</p>
                <div class="announcement-meta">
                    <span class="category ${announcement.category.toLowerCase()}">${announcement.category}</span>
                    <span class="date">${formatDate(announcement.date)}</span>
                </div>
            `;
            
            // Add click event to view details
            card.addEventListener('click', function() {
                viewAnnouncement(announcement);
            });
            
            announcementsGrid.appendChild(card);
        });
    }
    
    // Load announcements when page loads
    loadAnnouncements();

    // ========== VIEW ANNOUNCEMENT DETAILS ==========
    function viewAnnouncement(announcement) {
        const modalHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2>${announcement.title}</h2>
                <p class="announcement-date">Posted on: ${formatDate(announcement.date)}</p>
                <div class="announcement-details">
                    <p>${announcement.content}</p>
                    ${announcement.details ? `<p>${announcement.details}</p>` : ''}
                </div>
                ${announcement.urgent ? '<div class="urgent-badge">URGENT</div>' : ''}
            </div>
        `;
        
        // Create and show modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = modalHTML;
        document.body.appendChild(modal);
        
        // Show modal
        setTimeout(() => modal.classList.add('active'), 10);
        
        // Close modal events
        modal.querySelector('.close-modal').addEventListener('click', function() {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });
        
        // Close on background click
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        });
    }

    // ========== CITY STATS COUNTER ANIMATION ==========
    function animateStats() {
        const statCards = document.querySelectorAll('.link-card h3');
        statCards.forEach(card => {
            const value = card.textContent;
            if (!isNaN(parseInt(value.replace(/,/g, '')))) {
                const finalValue = parseInt(value.replace(/,/g, ''));
                card.textContent = '0';
                
                // Animate counter
                let current = 0;
                const increment = finalValue / 100;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= finalValue) {
                        card.textContent = finalValue.toLocaleString();
                        clearInterval(timer);
                    } else {
                        card.textContent = Math.floor(current).toLocaleString();
                    }
                }, 20);
            }
        });
    }
    
    // Animate stats when they come into view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateStats();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    const statsSection = document.querySelector('.city-stats');
    if (statsSection) {
        observer.observe(statsSection);
    }

    // ========== SEARCH FUNCTIONALITY ==========
    const searchInput = document.getElementById('departmentSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const announcementCards = document.querySelectorAll('.announcement-card');
            let visibleCount = 0;
            
            announcementCards.forEach(card => {
                const title = card.querySelector('h3').textContent.toLowerCase();
                const content = card.querySelector('p').textContent.toLowerCase();
                
                if (title.includes(searchTerm) || content.includes(searchTerm)) {
                    card.style.display = 'block';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });
            
            // Show no results message if needed
            const noResults = document.getElementById('noResults');
            if (noResults) {
                noResults.style.display = visibleCount === 0 ? 'block' : 'none';
            }
        });
    }

    // ========== UTILITY FUNCTIONS ==========
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }
    
    function saveToStorage(key, data) {
        try {
            // Get existing data
            let existingData = JSON.parse(localStorage.getItem(key)) || [];
            
            // Add new data
            if (Array.isArray(existingData)) {
                existingData.push(data);
            } else {
                existingData = [existingData, data];
            }
            
            // Save back to localStorage
            localStorage.setItem(key, JSON.stringify(existingData));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }
    
    function getFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    }

    // ========== MODAL STYLES INJECTION ==========
    const modalStyles = `
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.7);
            z-index: 2000;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .modal.active {
            display: flex;
            justify-content: center;
            align-items: center;
            opacity: 1;
        }
        
        .modal-content {
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
            transform: translateY(-20px);
            transition: transform 0.3s ease;
        }
        
        .modal.active .modal-content {
            transform: translateY(0);
        }
        
        .close-modal {
            position: absolute;
            top: 15px;
            right: 15px;
            font-size: 24px;
            cursor: pointer;
            color: #666;
        }
        
        .close-modal:hover {
            color: #333;
        }
        
        .urgent-badge {
            display: inline-block;
            background: #e74c3c;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: bold;
            margin-top: 10px;
        }
        
        .announcement-meta {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #eee;
            font-size: 0.9rem;
            color: #666;
        }
        
        .category {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: bold;
        }
        
        .category.advisory {
            background: #3498db;
            color: white;
        }
        
        .category.event {
            background: #2ecc71;
            color: white;
        }
        
        .category.program {
            background: #9b59b6;
            color: white;
        }
        
        .announcement-card.urgent {
            border-left: 5px solid #e74c3c;
        }
        
        .announcement-card {
            cursor: pointer;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .announcement-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.15);
        }
    `;
    
    // Inject modal styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = modalStyles;
    document.head.appendChild(styleSheet);

    // ========== SCROLL TO TOP BUTTON ==========
    function createScrollToTopButton() {
        const scrollButton = document.createElement('button');
        scrollButton.innerHTML = '↑';
        scrollButton.className = 'scroll-to-top';
        scrollButton.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 50px;
            height: 50px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 24px;
            cursor: pointer;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s ease;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(scrollButton);
        
        // Show/hide button based on scroll position
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                scrollButton.style.opacity = '1';
                scrollButton.style.transform = 'translateY(0)';
            } else {
                scrollButton.style.opacity = '0';
                scrollButton.style.transform = 'translateY(20px)';
            }
        });
        
        // Scroll to top on click
        scrollButton.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    createScrollToTopButton();

    // ========== RESPONSIVE BEHAVIOR ==========
    function handleResponsive() {
        const headerContent = document.querySelector('.header-content');
        if (window.innerWidth <= 768) {
            headerContent.style.display = 'flex';
            headerContent.style.justifyContent = 'space-between';
            headerContent.style.alignItems = 'center';
        } else {
            headerContent.style.display = 'block';
        }
    }
    
    // Initial call and resize listener
    handleResponsive();
    window.addEventListener('resize', handleResponsive);

    // ========== SESSION MANAGEMENT ==========
    // Store last visited section
    window.addEventListener('beforeunload', function() {
        const activeSection = document.querySelector('.page-section.active');
        if (activeSection) {
            sessionStorage.setItem('lastVisited', activeSection.id);
        }
    });
    
    // Load last visited section if coming back
    const lastVisited = sessionStorage.getItem('lastVisited');
    if (lastVisited && lastVisited !== 'home') {
        const targetLink = document.querySelector(`.nav-link[data-page="${lastVisited}"]`);
        if (targetLink) {
            targetLink.click();
        }
    }

    // ========== INITIALIZE ALL COMPONENTS ==========
    console.log('Bacoor City Website initialized successfully!');
});

// ========== GLOBAL FUNCTIONS ==========
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        padding: 15px 25px;
        border-radius: 5px;
        z-index: 3000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(notification);
    
    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Example usage: showNotification('Message sent successfully!', 'success');