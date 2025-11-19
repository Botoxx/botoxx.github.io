/**
 * Modern Portfolio JavaScript
 * Using Intersection Observer for better performance
 */

document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // Smooth Scrolling for Anchor Links
    // ============================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href').substring(1);
            if (!targetId) return; // Skip if the href is just "#"

            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                e.preventDefault();

                // Smooth scroll with offset
                const navHeight = document.querySelector('.main-nav')?.offsetHeight || 64;
                const targetPosition = targetElement.offsetTop - navHeight - 32;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                // Update nav active state
                updateActiveNav(this);
            }
        });
    });

    // ============================================
    // Intersection Observer for Active Nav
    // ============================================
    const sections = document.querySelectorAll('.section[id]');
    const navLinks = document.querySelectorAll('.main-nav a');

    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0
    };

    const observerCallback = (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.getAttribute('id');
                const correspondingLink = document.querySelector(`.main-nav a[href="#${sectionId}"]`);

                if (correspondingLink) {
                    navLinks.forEach(link => link.classList.remove('active'));
                    correspondingLink.classList.add('active');
                }
            }
        });
    };

    const sectionObserver = new IntersectionObserver(observerCallback, observerOptions);
    sections.forEach(section => sectionObserver.observe(section));

    // Helper function to update active nav
    function updateActiveNav(clickedLink) {
        navLinks.forEach(link => link.classList.remove('active'));
        clickedLink.classList.add('active');
    }

    // ============================================
    // Sticky Nav Background on Scroll
    // ============================================
    const mainNav = document.querySelector('.main-nav');
    let lastScrollY = window.scrollY;

    const updateNavBackground = () => {
        const currentScrollY = window.scrollY;

        if (currentScrollY > 100) {
            mainNav?.classList.add('scrolled');
        } else {
            mainNav?.classList.remove('scrolled');
        }

        lastScrollY = currentScrollY;
    };

    // Throttle scroll events for better performance
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (scrollTimeout) return;

        scrollTimeout = setTimeout(() => {
            updateNavBackground();
            updateBackToTop();
            scrollTimeout = null;
        }, 50);
    }, { passive: true });

    // Initial check
    updateNavBackground();

    // ============================================
    // Back to Top Button
    // ============================================
    const backToTopButton = document.querySelector('.back-to-top');

    const updateBackToTop = () => {
        if (window.scrollY > 400) {
            backToTopButton?.classList.add('show');
        } else {
            backToTopButton?.classList.remove('show');
        }
    };

    if (backToTopButton) {
        backToTopButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        updateBackToTop();
    }

    // ============================================
    // Initial Active Nav State
    // ============================================
    const setInitialActiveNav = () => {
        const hash = window.location.hash;

        if (hash) {
            const targetLink = document.querySelector(`.main-nav a[href="${hash}"]`);
            if (targetLink) {
                updateActiveNav(targetLink);
                return;
            }
        }

        // Default to first link
        const firstLink = document.querySelector('.main-nav a');
        if (firstLink) {
            firstLink.classList.add('active');
        }
    };

    setInitialActiveNav();

    // ============================================
    // Fade-in Animations on Scroll
    // ============================================
    const fadeElements = document.querySelectorAll('.section-content > *');

    const fadeObserverOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const fadeObserverCallback = (entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 50); // Stagger animations
            }
        });
    };

    const fadeObserver = new IntersectionObserver(fadeObserverCallback, fadeObserverOptions);
    fadeElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(1rem)';
        element.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
        fadeObserver.observe(element);
    });
});
