
        //Filter dropdown setup
        function setupDropdown(inputId, dropdownId) {
            const input = document.getElementById(inputId);
            const dropdown = document.getElementById(dropdownId);
            const items = dropdown.querySelectorAll(".suggestion-item");

            // Open dropdown bij focus
            input.addEventListener("focus", () => {
            dropdown.style.display = "block";
            });

            // Filter tijdens typen
            input.addEventListener("input", () => {
            const filter = input.value.toLowerCase();
            let visible = false;
            items.forEach(item => {
                if (item.textContent.toLowerCase().includes(filter)) {
                item.style.display = "block";
                visible = true;
                } else {
                item.style.display = "none";
                }
            });
            dropdown.style.display = visible ? "block" : "none";
            });

            // Klik op suggestie → vul veld in
            items.forEach(item => {
            item.addEventListener("click", () => {
                input.value = item.textContent;
                dropdown.style.display = "none";
            });
            });

            // Klik buiten → sluit dropdown
            document.addEventListener("click", (e) => {
            if (!dropdown.contains(e.target) && e.target !== input) {
                dropdown.style.display = "none";
            }
            });
        }

        // Activeer dropdowns
        setupDropdown("medewerker", "medewerkerDropdown");
        setupDropdown("klant", "klantDropdown");

        // Dropdown functionality
        document.addEventListener('DOMContentLoaded', function() {
            const dropdowns = document.querySelectorAll('.dropdown');
            const accountBtn = document.getElementById('accountBtn');
            const accountMenu = document.getElementById('accountMenu');

            // Handle main navigation dropdowns
            dropdowns.forEach(dropdown => {
                const toggle = dropdown.querySelector('.dropdown-toggle');
                const menu = dropdown.querySelector('.dropdown-menu');

                toggle.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Close other dropdowns
                    dropdowns.forEach(otherDropdown => {
                        if (otherDropdown !== dropdown) {
                            otherDropdown.classList.remove('active');
                        }
                    });
                    
                    // Toggle current dropdown
                    dropdown.classList.toggle('active');
                });
            });

            // Handle account dropdown
            const accountDropdown = document.querySelector('.account-dropdown');
            accountBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                accountDropdown.classList.toggle('active');
            });

            // Close dropdowns when clicking outside
            document.addEventListener('click', function() {
                dropdowns.forEach(dropdown => {
                    dropdown.classList.remove('active');
                });
                accountDropdown.classList.remove('active');
            });

            // Prevent dropdown menus from closing when clicking inside them
            document.querySelectorAll('.dropdown-menu, .account-menu').forEach(menu => {
                menu.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
            });

            // Modal functionality
            const addEmployeeBtn = document.getElementById('addEmployeeBtn');
            const modal = document.getElementById('boekingModal');
            const closeModal = document.getElementById('closeModal');
            const cancelBtn = document.getElementById('cancelBtn');
            const boekingForm = document.getElementById('boekingForm');

            // Error modal functionality
            const errorModal = document.getElementById('errorModal');
            const closeErrorModal = document.getElementById('closeErrorModal');
            const closeErrorBtn = document.getElementById('closeErrorBtn');

            addEmployeeBtn.addEventListener('click', function() {
                openboekingModal('new');
            });

            closeModal.addEventListener('click', function() {
                modal.style.display = 'none';
                // Clear all errors when closing modal
                clearAllErrors();
                boekingForm.reset();
                boekingForm.removeAttribute('data-employee-id');
            });

            cancelBtn.addEventListener('click', function() {
                modal.style.display = 'none';
                // Clear all errors when canceling
                clearAllErrors();
                boekingForm.reset();
                boekingForm.removeAttribute('data-employee-id');
            });

            // Close modal when clicking outside
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    // Clear all errors when closing modal
                    clearAllErrors();
                    boekingForm.reset();
                    boekingForm.removeAttribute('data-employee-id');
                }
            });

            // Error modal event listeners
            closeErrorModal.addEventListener('click', function() {
                errorModal.style.display = 'none';
            });

            closeErrorBtn.addEventListener('click', function() {
                errorModal.style.display = 'none';
            });

            // Close error modal when clicking outside
            errorModal.addEventListener('click', function(e) {
                if (e.target === errorModal) {
                    errorModal.style.display = 'none';
                }
            });

            // Form validation and submission
            boekingForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Clear previous errors
                clearAllErrors();
                
                // Validate all fields
                const errors = validateForm();
                
                if (errors.length > 0) {
                    showValidationErrors(errors);
                    return;
                }
                
                // Show loading state
                const submitBtn = document.querySelector('button[type="submit"]');
                submitBtn.classList.add('loading');
                submitBtn.disabled = true;
                
                // Simulate API call
                setTimeout(() => {
                    // Here you would normally send the data to a server
                    alert('Boeking succesvol toegevoegd!');
                    modal.style.display = 'none';
                    boekingForm.reset();
                    clearAllErrors();
                    
                    // Reset button state
                    submitBtn.classList.remove('loading');
                    submitBtn.disabled = false;
                }, 1500);
            });

            // Real-time validation
            const formInputs = boekingForm.querySelectorAll('input, select');
            formInputs.forEach(input => {
                input.addEventListener('blur', function() {
                    // Special validation for dropdown inputs
                    if (this.id === 'functie' || this.id === 'team') {
                        validateDropdownInput(this);
                    } else {
                        validateField(this);
                    }
                });
                
                input.addEventListener('input', function() {
                    if (this.classList.contains('error')) {
                        validateField(this);
                    }
                });
            });
            
            // Validate dropdown inputs to only allow predefined options
            function validateDropdownInput(input) {
                const inputId = input.id;
                const dropdown = document.getElementById(inputId + 'Dropdown');
                const suggestions = dropdown.querySelectorAll('.suggestion-item');
                const validOptions = Array.from(suggestions).map(s => s.getAttribute('data-value').toLowerCase());
                const inputValue = input.value.toLowerCase().trim();
                
                if (inputValue && !validOptions.includes(inputValue)) {
                    // Clear invalid input
                    input.value = '';
                    // Show error
                    const errorElement = document.getElementById(inputId + 'Error');
                    if (errorElement) {
                        errorElement.textContent = 'Selecteer een geldige optie uit de lijst';
                        errorElement.classList.add('show');
                    }
                    input.classList.add('error');
                } else {
                    // Clear error if valid
                    const errorElement = document.getElementById(inputId + 'Error');
                    if (errorElement) {
                        errorElement.textContent = '';
                        errorElement.classList.remove('show');
                    }
                    input.classList.remove('error');
                }
            }

            // Dropdown functionality for input fields
            setupDropdownInput('functie', 'functieDropdown');
            setupDropdownInput('team', 'teamDropdown');
            
            // Toggle functionality for planbaar
            setupToggle('planbaar', 'planbaarLabel');

            // Search and filter functionality
            setupSearchAndFilters();

            function setupDropdownInput(inputId, dropdownId) {
                const input = document.getElementById(inputId);
                const dropdown = document.getElementById(dropdownId);
                const suggestions = dropdown.querySelectorAll('.suggestion-item');
                
                // Show dropdown on focus
                input.addEventListener('focus', function() {
                    dropdown.style.display = 'block';
                    filterSuggestions(input.value, suggestions);
                });
                
                // Hide dropdown when clicking outside
                document.addEventListener('click', function(e) {
                    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                        dropdown.style.display = 'none';
                    }
                });
                
                // Filter suggestions as user types
                input.addEventListener('input', function() {
                    filterSuggestions(input.value, suggestions);
                    dropdown.style.display = 'block';
                });
                
                // Handle suggestion selection
                suggestions.forEach(suggestion => {
                    suggestion.addEventListener('click', function() {
                        input.value = this.textContent;
                        dropdown.style.display = 'none';
                        validateField(input);
                    });
                    
                    suggestion.addEventListener('mouseenter', function() {
                        suggestions.forEach(s => s.classList.remove('highlighted'));
                        this.classList.add('highlighted');
                    });
                });
                
                // Keyboard navigation
                input.addEventListener('keydown', function(e) {
                    const highlighted = dropdown.querySelector('.highlighted');
                    
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (highlighted) {
                            highlighted.classList.remove('highlighted');
                            const next = highlighted.nextElementSibling;
                            if (next) {
                                next.classList.add('highlighted');
                            }
                        } else {
                            suggestions[0]?.classList.add('highlighted');
                        }
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (highlighted) {
                            highlighted.classList.remove('highlighted');
                            const prev = highlighted.previousElementSibling;
                            if (prev) {
                                prev.classList.add('highlighted');
                            }
                        }
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (highlighted) {
                            input.value = highlighted.textContent;
                            dropdown.style.display = 'none';
                            validateField(input);
                        }
                    } else if (e.key === 'Escape') {
                        dropdown.style.display = 'none';
                    }
                });
            }
            
            function setupToggle(toggleId, labelId) {
                const toggle = document.getElementById(toggleId);
                const label = document.getElementById(labelId);
                
                toggle.addEventListener('change', function() {
                    if (this.checked) {
                        label.textContent = 'Ja';
                        this.value = 'ja';
                    } else {
                        label.textContent = 'Nee';
                        this.value = 'nee';
                    }
                    validateField(this);
                });
            }
            
            function filterSuggestions(query, suggestions) {
                const lowerQuery = query.toLowerCase();
                let hasVisible = false;
                
                suggestions.forEach(suggestion => {
                    const text = suggestion.textContent.toLowerCase();
                    if (text.includes(lowerQuery)) {
                        suggestion.style.display = 'block';
                        hasVisible = true;
                    } else {
                        suggestion.style.display = 'none';
                    }
                });
                
                // Show/hide dropdown based on results
                const dropdown = suggestions[0]?.parentElement;
                if (dropdown) {
                    dropdown.style.display = hasVisible ? 'block' : 'none';
                }
            }

            // Validation functions
            function validateForm() {
                const errors = [];
                
                // Required field validation
                const requiredFields = [
                    { id: 'firstName', name: 'Voornaam' },
                    { id: 'lastName', name: 'Achternaam' },
                    { id: 'email', name: 'E-mailadres' },
                    { id: 'tarief', name: 'Tarief' },
                    { id: 'internTarief', name: 'Intern tarief' },
                    { id: 'functie', name: 'Functie' },
                    { id: 'team', name: 'Team' },
                    { id: 'planbaar', name: 'Planbaar door teams' }
                ];
                
                requiredFields.forEach(field => {
                    const element = document.getElementById(field.id);
                    if (!element.value.trim()) {
                        errors.push(`${field.name} is verplicht`);
                    }
                });
                
                // Email validation
                const email = document.getElementById('email').value.trim();
                if (email && !isValidEmail(email)) {
                    errors.push('E-mailadres heeft een ongeldig formaat');
                }
                
                // Tarief validation
                const tarief = parseFloat(document.getElementById('tarief').value);
                const internTarief = parseFloat(document.getElementById('internTarief').value);
                
                if (tarief && (tarief < 0 || tarief > 999.99)) {
                    errors.push('Tarief moet tussen €0,00 en €999,99 liggen');
                }
                
                if (internTarief && (internTarief < 0 || internTarief > 999.99)) {
                    errors.push('Intern tarief moet tussen €0,00 en €999,99 liggen');
                }
                
                if (tarief && internTarief && internTarief > tarief) {
                    errors.push('Intern tarief mag niet hoger zijn dan het normale tarief');
                }
                
                // Name validation
                const firstName = document.getElementById('firstName').value.trim();
                const lastName = document.getElementById('lastName').value.trim();
                const tussenvoegsel = document.getElementById('tussenvoegsel').value.trim();
                
                if (firstName && firstName.length < 2) {
                    errors.push('Voornaam moet minimaal 2 karakters bevatten');
                }
                
                if (firstName && !isValidName(firstName)) {
                    errors.push('Voornaam moet beginnen met een hoofdletter en mag geen cijfers of speciale tekens bevatten');
                }
                
                if (lastName && lastName.length < 2) {
                    errors.push('Achternaam moet minimaal 2 karakters bevatten');
                }
                
                if (lastName && !isValidName(lastName)) {
                    errors.push('Achternaam moet beginnen met een hoofdletter en mag geen cijfers of speciale tekens bevatten');
                }
                
                if (tussenvoegsel && !isValidTussenvoegsel(tussenvoegsel)) {
                    errors.push('Tussenvoegsel mag alleen letters, spaties, apostrofen en punten bevatten');
                }
                
                // Check for duplicate email (only for new employees, not when editing)
                const isEditMode = boekingForm.getAttribute('data-employee-id') !== null;
                if (email && isDuplicateEmail(email) && !isEditMode) {
                    errors.push('Dit e-mailadres is al in gebruik');
                }
                
                return errors;
            }
            
            function validateField(field) {
                const fieldId = field.id;
                const value = field.value.trim();
                let errorMessage = '';
                
                // Clear previous error state
                field.classList.remove('error', 'success');
                const errorElement = document.getElementById(fieldId + 'Error');
                errorElement.classList.remove('show');
                errorElement.textContent = '';
                
                // Required field validation - only show error on blur or form submission
                const requiredFields = ['firstName', 'lastName', 'email', 'tarief', 'internTarief', 'functie', 'team'];
                if (requiredFields.includes(fieldId) && !value) {
                    // Don't show required error immediately, only after user interaction
                    return;
                }
                
                // Specific field validations
                switch (fieldId) {
                    case 'firstName':
                        if (value && value.length < 2) {
                            errorMessage = 'Moet minimaal 2 karakters bevatten';
                        } else if (value && !isValidName(value)) {
                            errorMessage = 'Moet beginnen met een hoofdletter en mag geen cijfers of speciale tekens bevatten';
                        }
                        break;
                        
                    case 'lastName':
                        if (value && value.length < 2) {
                            errorMessage = 'Moet minimaal 2 karakters bevatten';
                        } else if (value && !isValidName(value)) {
                            errorMessage = 'Moet beginnen met een hoofdletter en mag geen cijfers of speciale tekens bevatten';
                        }
                        break;
                        
                    case 'tussenvoegsel':
                        if (value && !isValidTussenvoegsel(value)) {
                            errorMessage = 'Mag alleen letters, spaties, apostrofen en punten bevatten';
                        }
                        break;
                        
                    case 'email':
                        if (value && !isValidEmail(value)) {
                            errorMessage = 'Ongeldig e-mailadres formaat';
                        } else if (value && isDuplicateEmail(value)) {
                            // Only show duplicate error for new employees, not when editing
                            const isEditMode = boekingForm.getAttribute('data-employee-id') !== null;
                            if (!isEditMode) {
                                errorMessage = 'Dit e-mailadres is al in gebruik';
                            }
                        }
                        break;
                        
                    case 'tarief':
                    case 'internTarief':
                        const numValue = parseFloat(value);
                        if (value && (isNaN(numValue) || numValue < 0 || numValue > 999.99)) {
                            errorMessage = 'Voer een geldig bedrag in (€0,00 - €999,99)';
                        }
                        break;
                }
                
                // Show error or success
                if (errorMessage) {
                    field.classList.add('error');
                    errorElement.textContent = errorMessage;
                    errorElement.classList.add('show');
                } else if (value) {
                    field.classList.add('success');
                }
            }
            
            
            function isValidName(name) {
                // Name must start with capital letter, only contain letters, hyphens, and spaces
                // No numbers or special characters except hyphens
                const nameRegex = /^[A-Z][a-zA-Z\s\-]*$/;
                return nameRegex.test(name) && name.length >= 2;
            }
            
            function isValidTussenvoegsel(tussenvoegsel) {
                // Tussenvoegsel can contain letters, spaces, apostrophes, and periods
                // Examples: van, de, van der, 't, d'
                const tussenvoegselRegex = /^[a-zA-Z\s'\.]*$/;
                return tussenvoegselRegex.test(tussenvoegsel);
            }
            
            function showValidationErrors(errors) {
                const errorList = document.getElementById('errorList');
                
                errorList.innerHTML = '';
                errors.forEach(error => {
                    const div = document.createElement('div');
                    div.className = 'error-item';
                    div.textContent = '• ' + error;
                    errorList.appendChild(div);
                });
                
                errorModal.style.display = 'block';
            }
            
            function clearAllErrors() {
                // Clear all error states
                const errorElements = document.querySelectorAll('.error-message');
                errorElements.forEach(element => {
                    element.classList.remove('show');
                    element.textContent = '';
                });
                
                const formElements = document.querySelectorAll('input, select, textarea');
                formElements.forEach(element => {
                    element.classList.remove('error', 'success');
                });
                
                // Hide error modal
                errorModal.style.display = 'none';
                
                // Also clear any validation summary
                const errorList = document.getElementById('errorList');
                if (errorList) {
                    errorList.innerHTML = '';
                }
            }

            // LocalStorage functionality
            function getEmployees() {
                const employees = localStorage.getItem('employees');
                return employees ? JSON.parse(employees) : [];
            }

            function saveEmployees(employees) {
                localStorage.setItem('employees', JSON.stringify(employees));
            }

            function getNextId() {
                const employees = getEmployees();
                return employees.length > 0 ? Math.max(...employees.map(emp => emp.id)) + 1 : 1;
            }

            function addEmployee(employeeData) {
                const employees = getEmployees();
                const newEmployee = {
                    id: getNextId(),
                    ...employeeData,
                    status: 'actief'
                };
                employees.push(newEmployee);
                saveEmployees(employees);
                return newEmployee;
            }

            function updateEmployee(id, employeeData) {
                const employees = getEmployees();
                const index = employees.findIndex(emp => emp.id === id);
                if (index !== -1) {
                    employees[index] = { ...employees[index], ...employeeData };
                    saveEmployees(employees);
                    return employees[index];
                }
                return null;
            }

            function deleteEmployee(id) {
                const employees = getEmployees();
                const filteredEmployees = employees.filter(emp => emp.id !== id);
                saveEmployees(filteredEmployees);
            }

            function toggleEmployeeStatus(id) {
                const employees = getEmployees();
                const index = employees.findIndex(emp => emp.id === id);
                if (index !== -1) {
                    employees[index].status = employees[index].status === 'actief' ? 'inactief' : 'actief';
                    saveEmployees(employees);
                    return employees[index];
                }
                return null;
            }

            // Search and filter functionality
            function setupSearchAndFilters() {
                const searchInput = document.getElementById('searchInput');
                const clearSearchBtn = document.getElementById('clearSearch');
                const geboektFilter = document.getElementById('geboektFilter');
                const teamFilter = document.getElementById('teamFilter');
                const functieFilter = document.getElementById('functieFilter');
                const medewerkerFilter = document.getElementById('medewerkerFilter');
                const clearFiltersBtn = document.getElementById('clearFilters');
                const clearAllFiltersBtn = document.getElementById('clearAllFilters');
                const tableBody = document.getElementById('employeeTableBody');
                const noResults = document.getElementById('noResults');
                const tableContainer = document.querySelector('.table-container');
                const loadingOverlay = document.getElementById('loadingOverlay');

                // Get employees from localStorage or use global array if available
                let employees = window.currentEmployees || getEmployees();
                let filteredEmployees = [...employees];
                
                // Make employees array globally accessible for updates
                window.currentEmployees = employees;

                // Search functionality
                searchInput.addEventListener('input', function() {
                    const query = this.value.toLowerCase().trim();
                    if (query) {
                        clearSearchBtn.style.display = 'block';
                    } else {
                        clearSearchBtn.style.display = 'none';
                    }
                    applyFilters();
                });

                // Clear search
                clearSearchBtn.addEventListener('click', function() {
                    searchInput.value = '';
                    this.style.display = 'none';
                    applyFilters();
                });

                // Filter change events
                [geboektFilter, teamFilter, medewerkerFilter, functieFilter].forEach(filter => {
                    filter.addEventListener('change', applyFilters);
                });

                // Clear filters
                clearFiltersBtn.addEventListener('click', function() {
                    geboektFilter.value = '';
                    teamFilter.value = '';
                    medewerkerFilter.value = '';
                    functieFilter.value = '';
                    searchInput.value = '';
                    clearSearchBtn.style.display = 'none';
                    applyFilters();
                });

                // Clear all filters (from no results)
                clearAllFiltersBtn.addEventListener('click', function() {
                    geboektFilter.value = '';
                    teamFilter.value = '';
                    medewerkerFilter.value = '';
                    functieFilter.value = '';
                    searchInput.value = '';
                    clearSearchBtn.style.display = 'none';
                    applyFilters();
                });

                function applyFilters() {
                    // Get fresh data from localStorage
                    employees = getEmployees();
                    window.currentEmployees = employees;
                    
                    const searchQuery = searchInput.value.toLowerCase().trim();
                    const statusValue = geboektFilter.value;
                    const teamValue = teamFilter.value;
                    const functieValue = functieFilter.value;
                    const planbaarValue = medewerkerFilter.value;

                    filteredEmployees = employees.filter(employee => {
                        // Search filter
                        const fullName = `${employee.firstName} ${employee.tussenvoegsel ? employee.tussenvoegsel + ' ' : ''}${employee.lastName}`.toLowerCase();
                        const matchesSearch = !searchQuery || 
                            fullName.includes(searchQuery) ||
                            employee.email.toLowerCase().includes(searchQuery) ||
                            employee.functie.toLowerCase().includes(searchQuery) ||
                            employee.team.toLowerCase().includes(searchQuery);

                        // Status filter
                        const matchesStatus = !statusValue || 
                            (statusValue === 'actief' && employee.status === 'actief') ||
                            (statusValue === 'inactief' && employee.status === 'inactief');

                        // Team filter
                        const matchesTeam = !teamValue || 
                            employee.team.toLowerCase() === teamValue;

                        // Planbaar filter
                        const matchesPlanbaar = !planbaarValue || 
                            (planbaarValue === 'ja' && employee.planbaar === 'ja') ||
                            (planbaarValue === 'nee' && employee.planbaar === 'nee');

                        return matchesSearch && matchesStatus && matchesTeam && matchesPlanbaar;
                    });

                    renderTable();
                }

                function renderTable() {
                    if (filteredEmployees.length === 0) {
                        tableContainer.style.display = 'none';
                        noResults.style.display = 'block';
                    } else {
                        tableContainer.style.display = 'block';
                        noResults.style.display = 'none';
                        
                        const tbody = tableBody;
                        tbody.innerHTML = '';

                        filteredEmployees.forEach(employee => {
                            const row = document.createElement('tr');
                            row.setAttribute('data-employee-id', employee.id);
                            row.innerHTML = `
                                <td>${employee.firstName} ${employee.tussenvoegsel ? employee.tussenvoegsel + ' ' : ''}${employee.lastName}</td>
                                <td>${employee.email}</td>
                                <td>€${employee.tarief}/uur</td>
                                <td>€${employee.internTarief}/uur</td>
                                <td>${employee.functie}</td>
                                <td>${employee.team}</td>
                                <td><span class="status-badge ${employee.planbaar === 'ja' ? 'status-yes' : 'status-no'}">${employee.planbaar === 'ja' ? 'Ja' : 'Nee'}</span></td>
                                <td><span class="status-badge ${employee.status === 'actief' ? 'status-active' : 'status-inactive'}">${employee.status === 'actief' ? 'Actief' : 'Inactief'}</span></td>
                                <td class="actions">
                                    <div class="action-buttons">
                                        <button class="btn-action" title="Bewerken">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                            <span>Bewerken</span>
                                        </button>
                                        <button class="btn-action ${employee.status === 'actief' ? 'btn-warning' : 'btn-success'}" 
                                                title="${employee.status === 'actief' ? 'Deactiveren' : 'Activeren'}">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                ${employee.status === 'actief' ? 
                                                    '<path d="M18 6L6 18M6 6l12 12"></path>' : 
                                                    '<path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
                                                }
                                            </svg>
                                            <span>${employee.status === 'actief' ? 'Deactiveren' : 'Activeren'}</span>
                                        </button>
                                    </div>
                                </td>
                            `;
                            tbody.appendChild(row);
                        });

                        // Re-setup edit buttons and toggle status buttons
                        setupEditButtons();
                        setupToggleStatusButtons();
                    }
                }


                // Initialize
                applyFilters();
            }

            // Bulk selection functionality
            function setupBulkSelection() {
                const selectAllCheckbox = document.getElementById('selectAll');
                const rowCheckboxes = document.querySelectorAll('.row-checkbox');
                const bulkActionsBar = document.getElementById('bulkActionsBar');
                const selectedCount = document.getElementById('selectedCount');

                // Select all functionality
                selectAllCheckbox.addEventListener('change', function() {
                    rowCheckboxes.forEach(checkbox => {
                        checkbox.checked = this.checked;
                    });
                    updateBulkActionsBar();
                });

                // Individual row checkboxes
                rowCheckboxes.forEach(checkbox => {
                    checkbox.addEventListener('change', function() {
                        updateSelectAllState();
                        updateBulkActionsBar();
                    });
                });

                function updateSelectAllState() {
                    const checkedBoxes = document.querySelectorAll('.row-checkbox:checked');
                    const totalBoxes = document.querySelectorAll('.row-checkbox');
                    
                    selectAllCheckbox.checked = checkedBoxes.length === totalBoxes.length;
                    selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < totalBoxes.length;
                }

                function updateBulkActionsBar() {
                    const checkedBoxes = document.querySelectorAll('.row-checkbox:checked');
                    const count = checkedBoxes.length;
                    
                    if (count > 0) {
                        selectedCount.textContent = count;
                        bulkActionsBar.style.display = 'flex';
                    } else {
                        bulkActionsBar.style.display = 'none';
                    }
                }
            }

            // Employee modal functionality
            function openboekingModal(mode, employeeId = null) {
                const modalTitle = document.getElementById('modalTitle');
                const submitBtn = document.querySelector('button[type="submit"]');
                
                // Always clear all errors and reset form state first
                clearAllErrors();
                boekingForm.reset();
                
                if (mode === 'new') {
                    modalTitle.textContent = 'Nieuwe medewerker';
                    submitBtn.textContent = 'Opslaan';
                    // Remove any edit mode attributes
                    boekingForm.removeAttribute('data-employee-id');
                } else if (mode === 'edit') {
                    modalTitle.textContent = 'Medewerker bewerken';
                    submitBtn.textContent = 'Bijwerken';
                    loadEmployeeData(employeeId);
                }
                
                modal.style.display = 'block';
            }

            function loadEmployeeData(employeeId) {
                // Find employee data from localStorage
                const employees = getEmployees();
                const employee = employees.find(emp => emp.id === parseInt(employeeId));
                
                if (employee) {
                    document.getElementById('firstName').value = employee.firstName;
                    document.getElementById('tussenvoegsel').value = employee.tussenvoegsel || '';
                    document.getElementById('lastName').value = employee.lastName;
                    document.getElementById('email').value = employee.email;
                    document.getElementById('tarief').value = employee.tarief;
                    document.getElementById('internTarief').value = employee.internTarief;
                    document.getElementById('functie').value = employee.functie;
                    document.getElementById('team').value = employee.team;
                    document.getElementById('planbaar').checked = employee.planbaar === 'ja';
                    document.getElementById('planbaarLabel').textContent = employee.planbaar === 'ja' ? 'Ja' : 'Nee';
                    
                    // Store employee ID for update
                    boekingForm.setAttribute('data-employee-id', employeeId);
                }
            }

            // Edit button functionality
            function setupEditButtons() {
                const editButtons = document.querySelectorAll('.btn-action[title="Bewerken"]');
                editButtons.forEach(button => {
                    button.addEventListener('click', function() {
                        const row = this.closest('tr');
                        const employeeId = row.getAttribute('data-employee-id');
                        openboekingModal('edit', employeeId);
                    });
                });
            }

            // Toggle status functionality
            function setupToggleStatusButtons() {
                const toggleButtons = document.querySelectorAll('.btn-action[title="Deactiveren"], .btn-action[title="Activeren"]');
                toggleButtons.forEach(button => {
                    button.addEventListener('click', function() {
                        const row = this.closest('tr');
                        const employeeId = row.getAttribute('data-employee-id');
                        const currentStatus = this.getAttribute('title');
                        
                        // Show confirmation modal
                        showToggleConfirmation(employeeId, currentStatus);
                    });
                });
            }

            function showToggleConfirmation(employeeId, currentStatus) {
                const confirmModal = document.getElementById('confirmModal');
                const confirmTitle = document.getElementById('confirmTitle');
                const confirmMessage = document.getElementById('confirmMessage');
                const confirmBtn = document.getElementById('confirmBtn');
                
                if (currentStatus === 'Deactiveren') {
                    confirmTitle.textContent = 'Medewerker deactiveren';
                    confirmMessage.textContent = 'Weet je zeker dat je deze medewerker wilt deactiveren?';
                    confirmBtn.textContent = 'Deactiveren';
                    confirmBtn.className = 'btn btn-warning';
                } else {
                    confirmTitle.textContent = 'Medewerker activeren';
                    confirmMessage.textContent = 'Weet je zeker dat je deze medewerker wilt activeren?';
                    confirmBtn.textContent = 'Activeren';
                    confirmBtn.className = 'btn btn-success';
                }
                
                confirmModal.style.display = 'block';
                
                // Handle confirmation
                confirmBtn.onclick = function() {
                    toggleEmployeeStatus(parseInt(employeeId));
                    confirmModal.style.display = 'none';
                };
            }

            function toggleEmployeeStatus(employeeId) {
                // Get current employee data
                const employees = getEmployees();
                const employee = employees.find(emp => emp.id === employeeId);
                
                if (employee) {
                    // Toggle status
                    const newStatus = employee.status === 'actief' ? 'inactief' : 'actief';
                    const updatedEmployee = updateEmployee(employeeId, { status: newStatus });
                    
                    if (updatedEmployee) {
                        // Show success notification
                        const message = newStatus === 'actief' ? 'Medewerker succesvol geactiveerd!' : 'Medewerker succesvol gedeactiveerd!';
                        showSuccessNotification(message);
                        
                        // Refresh table
                        refreshTableData();
                    }
                }
            }

            // Update form submission to handle both new and edit
            boekingForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Clear previous errors
                clearAllErrors();
                
                // Validate all fields
                const errors = validateForm();
                
                if (errors.length > 0) {
                    showValidationErrors(errors);
                    return;
                }
                
                // Show loading state
                const submitBtn = document.querySelector('button[type="submit"]');
                submitBtn.classList.add('loading');
                submitBtn.disabled = true;
                
                // Determine if this is new or edit
                const employeeId = this.getAttribute('data-employee-id');
                const isEdit = employeeId !== null;
                
                // Get form data
                const formData = new FormData(boekingForm);
                const employeeData = {
                    firstName: formData.get('firstName'),
                    tussenvoegsel: formData.get('tussenvoegsel') || '',
                    lastName: formData.get('lastName'),
                    email: formData.get('email'),
                    tarief: parseFloat(formData.get('tarief')),
                    internTarief: parseFloat(formData.get('internTarief')),
                    functie: formData.get('functie'),
                    team: formData.get('team'),
                    planbaar: formData.get('planbaar') ? 'ja' : 'nee'
                };

                // Simulate API call
                setTimeout(() => {
                    if (isEdit) {
                        // Update existing employee
                        const updatedEmployee = updateEmployee(parseInt(employeeId), employeeData);
                        if (updatedEmployee) {
                            showSuccessNotification('Medewerker succesvol bijgewerkt!');
                        }
                    } else {
                        // Add new employee
                        const newEmployee = addEmployee(employeeData);
                        showSuccessNotification('Medewerker succesvol toegevoegd!');
                    }
                    
                    modal.style.display = 'none';
                    boekingForm.reset();
                    clearAllErrors();
                    
                    // Remove data attribute for edit mode
                    this.removeAttribute('data-employee-id');
                    
                    // Reset form state completely
                    const formElements = document.querySelectorAll('input, select, textarea');
                    formElements.forEach(element => {
                        element.classList.remove('error', 'success');
                    });
                    
                    // Reset button state
                    submitBtn.classList.remove('loading');
                    submitBtn.disabled = false;
                    
                    // Refresh the table with updated data from localStorage
                    refreshTableData();
                }, 1500);
            });

            // Success notification function
            function showSuccessNotification(message) {
                const successNotification = document.getElementById('successNotification');
                const successMessage = document.getElementById('successMessage');
                
                successMessage.textContent = message;
                successNotification.style.display = 'flex';
                
                // Auto-hide after 3 seconds
                setTimeout(() => {
                    successNotification.style.display = 'none';
                }, 3000);
            }

            // Close success notification
            document.getElementById('closeSuccessNotification').addEventListener('click', function() {
                document.getElementById('successNotification').style.display = 'none';
            });

            // Function to refresh table data from localStorage
            function refreshTableData() {
                // Get fresh data from localStorage
                const employees = getEmployees();
                
                // Update the global employees array
                window.currentEmployees = employees;
                
                // Re-apply current filters to show updated data
                const searchInput = document.getElementById('searchInput');
                const geboektFilter = document.getElementById('geboektFilter');
                const teamFilter = document.getElementById('teamFilter');
                const functieFilter = document.getElementById('functieFilter');
                const medewerkerFilter = document.getElementById('medewerkerFilter');
                
                if (searchInput && geboektFilter && teamFilter && functieFilter && medewerkerFilter) {
                    // Trigger the filter function to update the table
                    const event = new Event('change');
                    geboektFilter.dispatchEvent(event);
                }
                
                // Also trigger search if there's a search query
                if (searchInput && searchInput.value.trim()) {
                    const event = new Event('input');
                    searchInput.dispatchEvent(event);
                }
            }

            // Initialize edit buttons and toggle status buttons on page load
            setupEditButtons();
            setupToggleStatusButtons();
        });
