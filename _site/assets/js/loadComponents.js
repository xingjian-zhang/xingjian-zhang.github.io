document.addEventListener('DOMContentLoaded', function() {
    // Load header
    fetch('/components/header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header-placeholder').innerHTML = data;
            
            // Update active link
            const currentPage = window.location.pathname;
            const navLinks = document.querySelectorAll('.nav-links a');
            navLinks.forEach(link => {
                if (currentPage === '/' && link.getAttribute('href') === '/') {
                    link.classList.add('active');
                } else if (currentPage !== '/' && link.getAttribute('href').includes(currentPage)) {
                    link.classList.add('active');
                }
            });
        });
}); 