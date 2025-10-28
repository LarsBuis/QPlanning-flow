fetch('/Header/header.html')
    .then(response => response.text())
    .then(data => {
        document.getElementById('header-container').innerHTML = data;

        // Pas hier de dropdowns initialiseren
        const dropdowns = document.querySelectorAll('.dropdown');
        const accountBtn = document.getElementById('accountBtn');
        const accountDropdown = document.querySelector('.account-dropdown');

        // Main navigation dropdowns
        dropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector('.dropdown-toggle');
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                // Close other dropdowns
                dropdowns.forEach(d => {
                    if (d !== dropdown) d.classList.remove('active');
                });

                dropdown.classList.toggle('active');
            });
        });

        // Account dropdown
        accountBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            accountDropdown.classList.toggle('active');
        });

        // Klik buiten sluit dropdownsS
        document.addEventListener('click', function() {
            dropdowns.forEach(d => d.classList.remove('active'));
            accountDropdown.classList.remove('active');
        });

        // Klik binnen menu niet sluiten
        document.querySelectorAll('.dropdown-menu, .account-menu').forEach(menu => {
            menu.addEventListener('click', e => e.stopPropagation());
        });
    })
    .catch(err => console.error('Fout bij inladen header:', err));
