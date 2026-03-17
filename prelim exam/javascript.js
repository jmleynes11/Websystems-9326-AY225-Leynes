// Main JavaScript file for Bacoor City Website

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

    // ========== SET ACTIVE NAV LINK ==========
    function setActiveNavLink() {
        const currentPage = document.body.dataset.page;
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            if (link.getAttribute('href') === currentPage + '.html' || 
                (currentPage === 'home' && link.getAttribute('href') === 'index.html')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
    
    setActiveNavLink();

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
            
            if (validateForm(this)) {
                // Show success message
                const successMessage = document.getElementById('formSuccessMessage');
                if (successMessage) {
                    // Generate reference number
                    const refNumber = 'SR-' + Date.now().toString().slice(-8);
                    document.getElementById('referenceNumber').textContent = refNumber;
                    
                    successMessage.style.display = 'block';
                    serviceForm.style.display = 'none';
                    
                    // Store in localStorage
                    const serviceRequest = {
                        name: document.getElementById('fullName').value,
                        email: document.getElementById('email').value,
                        phone: document.getElementById('phone').value,
                        barangay: document.getElementById('barangay').value,
                        service: document.getElementById('serviceType').value,
                        message: document.getElementById('message').value,
                        reference: refNumber,
                        date: new Date().toISOString(),
                        status: 'pending'
                    };
                    
                    saveToStorage('serviceRequests', serviceRequest);
                } else {
                    showNotification('Service request submitted successfully! We will contact you within 24 hours.', 'success');
                    this.reset();
                }
            }
        });
    }

    // Contact Form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (validateForm(this)) {
                const successMessage = document.getElementById('contactSuccessMessage');
                if (successMessage) {
                    successMessage.style.display = 'block';
                    contactForm.style.display = 'none';
                    
                    // Store contact message
                    const contactMessage = {
                        name: document.getElementById('contactName').value,
                        email: document.getElementById('contactEmail').value,
                        phone: document.getElementById('contactPhone').value,
                        subject: document.getElementById('contactSubject').value,
                        message: document.getElementById('contactMessage').value,
                        date: new Date().toISOString(),
                        read: false
                    };
                    
                    saveToStorage('contactMessages', contactMessage);
                } else {
                    showNotification('Message sent successfully! Thank you for contacting us.', 'success');
                    this.reset();
                }
            }
        });
    }

    // Form validation helper
    function validateForm(form) {
        let isValid = true;
        const requiredFields = form.querySelectorAll('[required]');
        const errorMessages = form.querySelectorAll('.error-message');
        
        // Clear previous errors
        errorMessages.forEach(msg => msg.textContent = '');
        
        requiredFields.forEach(field => {
            field.style.borderColor = '#ddd';
            
            if (!field.value.trim()) {
                field.style.borderColor = '#e74c3c';
                const errorId = field.id + 'Error';
                const errorElement = document.getElementById(errorId);
                if (errorElement) {
                    errorElement.textContent = 'This field is required';
                }
                isValid = false;
            }
            
            // Email validation
            if (field.type === 'email' && field.value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(field.value)) {
                    field.style.borderColor = '#e74c3c';
                    const errorId = field.id + 'Error';
                    const errorElement = document.getElementById(errorId);
                    if (errorElement) {
                        errorElement.textContent = 'Please enter a valid email address';
                    }
                    isValid = false;
                }
            }
            
            // Phone validation
            if (field.type === 'tel' && field.value) {
                const phoneRegex = /^[0-9\s\-\(\)]+$/;
                if (!phoneRegex.test(field.value)) {
                    field.style.borderColor = '#e74c3c';
                    const errorId = field.id + 'Error';
                    const errorElement = document.getElementById(errorId);
                    if (errorElement) {
                        errorElement.textContent = 'Please enter a valid phone number';
                    }
                    isValid = false;
                }
            }
        });
        
        return isValid;
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
                details: 'Affected areas: Molino Blvd from Zapote to Almanza. Alternate routes: Aguinaldo Highway and Daang Hari. Work hours: 9PM to 4AM.',
                category: 'Advisory',
                date: '2024-11-10',
                urgent: true
            },
            {
                id: 2,
                title: '🏥 Free Medical Mission',
                content: 'Free medical and dental services at City Hall grounds on November 20, 2024, 8AM-5PM.',
                details: 'Services include: medical consultation, dental check-up, free medicines, blood pressure monitoring, and vaccination.',
                category: 'Event',
                date: '2024-11-12',
                urgent: false
            },
            {
                id: 3,
                title: '💼 Business Permit Renewal',
                content: 'Renewal of business permits starts January 1, 2025. Early renewals get 10% discount until Dec 15.',
                details: 'Requirements: Previous business permit, Barangay Clearance, BIR registration, and Mayor\'s Permit. Online renewal available at services.bacoor.gov.ph',
                category: 'Program',
                date: '2024-11-08',
                urgent: false
            },
            {
                id: 4,
                title: '🎄 Christmas Festival 2024',
                content: 'Join our Christmas Festival from December 15-25 featuring concerts, bazaars, and fireworks.',
                details: 'Daily activities: Christmas bazaar (10AM-10PM), Nightly concerts (6PM-10PM), Food festival, Fireworks display every night at 9PM.',
                category: 'Event',
                date: '2024-11-05',
                urgent: false
            },
            {
                id: 5,
                title: '💧 Water Interruption Schedule',
                content: 'Scheduled water service interruption on November 25, 2024, 8AM-4PM for pipeline maintenance.',
                details: 'Affected barangays: Molino I-III, Talaba I-III, Queens Row. Please store water ahead of time.',
                category: 'Advisory',
                date: '2024-11-03',
                urgent: false
            },
            {
                id: 6,
                title: '🎓 Scholarship Program Application',
                content: 'Applications for City Scholarship Program now open until November 30, 2024.',
                details: 'Eligibility: Bacoor resident, graduating high school student, family income below 150,000/year. Submit requirements to City Scholarship Office.',
                category: 'Program',
                date: '2024-11-01',
                urgent: false
            }
        ];
        
        // Clear existing content
        announcementsGrid.innerHTML = '';
        
        // Create announcement cards
        announcements.forEach(announcement => {
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
                <button class="close-modal">&times;</button>
                <h2>${announcement.title}</h2>
                <p class="announcement-date"><strong>Posted on:</strong> ${formatDate(announcement.date)}</p>
                <div class="announcement-details">
                    <p><strong>Summary:</strong> ${announcement.content}</p>
                    ${announcement.details ? `<p><strong>Details:</strong> ${announcement.details}</p>` : ''}
                </div>
                ${announcement.urgent ? '<div class="urgent-badge">URGENT NOTICE</div>' : ''}
                <div class="mt-20">
                    <p><small>Category: <span class="category ${announcement.category.toLowerCase()}">${announcement.category}</span></small></p>
                </div>
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
        
        // Close on Escape key
        document.addEventListener('keydown', function closeOnEscape(e) {
            if (e.key === 'Escape') {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.remove();
                    document.removeEventListener('keydown', closeOnEscape);
                }, 300);
            }
        });
    }

    // ========== CITY STATS COUNTER ANIMATION ==========
    function animateStats() {
        const statCards = document.querySelectorAll('.stat-card h3');
        statCards.forEach(card => {
            const value = card.textContent;
            if (!isNaN(parseInt(value.replace(/,/g, '')))) {
                const finalValue = parseInt(value.replace(/,/g, ''));
                card.textContent = '0';
                
                // Animate counter
                let current = 0;
                const increment = finalValue / 50;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= finalValue) {
                        card.textContent = finalValue.toLocaleString();
                        clearInterval(timer);
                    } else {
                        card.textContent = Math.floor(current).toLocaleString();
                    }
                }, 30);
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

    // ========== SCROLL TO TOP BUTTON ==========
    function createScrollToTopButton() {
        const scrollButton = document.createElement('button');
        scrollButton.innerHTML = '↑';
        scrollButton.className = 'scroll-to-top';
        document.body.appendChild(scrollButton);
        
        // Show/hide button based on scroll position
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                scrollButton.classList.add('visible');
            } else {
                scrollButton.classList.remove('visible');
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
            existingData.push(data);
            
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
    }// ========== TABS FUNCTIONALITY FOR ABOUT PAGE ==========
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    if (tabButtons.length === 0) return;
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Show corresponding tab content
            const tabId = this.getAttribute('onclick').match(/'([^']+)'/)[1];
            const tabContent = document.getElementById(tabId);
            if (tabContent) {
                tabContent.classList.add('active');
            }
        });
    });
    
    // Activate first tab by default
    if (tabButtons.length > 0 && tabContents.length > 0) {
        tabButtons[0].classList.add('active');
        tabContents[0].classList.add('active');
    }
}

    // ========== NOTIFICATION SYSTEM ==========
    window.showNotification = function(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 5px;
            z-index: 3000;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            color: white;
        `;
        
        // Add background color based on type
        if (type === 'success') {
            notification.style.backgroundColor = '#2ecc71';
        } else if (type === 'error') {
            notification.style.backgroundColor = '#e74c3c';
        } else {
            notification.style.backgroundColor = '#3498db';
        }
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // ========== INITIALIZE ALL COMPONENTS ==========
    console.log('Bacoor City Website initialized successfully!');
    
    // Add animation to cards on load
    setTimeout(() => {
        const cards = document.querySelectorAll('.link-card, .announcement-card, .vm-card');
        cards.forEach((card, index) => {
            card.style.animation = `fadeIn 0.5s ease ${index * 0.1}s both`;
        });
    }, 100);
});// ========== INITIALIZE ALL COMPONENTS ==========
console.log('Bacoor City Website initialized successfully!');

// Initialize tabs if they exist
initTabs();

// Add animation to cards on load
setTimeout(() => {
    const cards = document.querySelectorAll('.link-card, .announcement-card, .vm-card, .official-card, .stat-card');
    cards.forEach((card, index) => {
        card.style.animation = `fadeIn 0.5s ease ${index * 0.1}s both`;
    });
}, 100);