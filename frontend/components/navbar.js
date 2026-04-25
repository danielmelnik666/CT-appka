(function initNavbar() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');

    // Scroll shadow
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 10);
    });

    // Hamburger toggle
    hamburger?.addEventListener('click', () => {
        mobileMenu.classList.toggle('open');
    });

    // Close mobile menu on link click
    mobileMenu?.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', () => mobileMenu.classList.remove('open'));
    });
})();
