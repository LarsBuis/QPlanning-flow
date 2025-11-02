// --- Helper Functies ---
function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '-';
  try {
    const number = parseFloat(value);
    if (isNaN(number)) return '-';
    return '€ ' + number.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch (e) {
    return '-';
  }
}

function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return '-';
  }
}

document.addEventListener('DOMContentLoaded', function () {
  // --- Variabelen ---
  let klantenData = [];          // Volledige dataset klanten
  let gefilterdeKlanten = [];    // Getoonde dataset
  let geselecteerdeIds = new Set();
  const localStorageKey = 'qplanning_klanten_v2';

  let boekjarenData = [];        // [{jaar:"2025", budget:"10000"}, ...]
  const boekjaarStorageKey = 'qplanning_boekjaren_v1';

  // DOM Elementen
  const tabelBody = document.getElementById('klanten-tabel-body');
  const addKlantBtn = document.getElementById('add-klant-btn');
  const addBoekjaarBtn = document.getElementById('add-boekjaar-btn');

  // klant modal refs
  const modal = document.getElementById('klant-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalSaveBtn = document.getElementById('modal-save-btn');
  const closeModalBtn = document.getElementById('closeModal');
  const cancelBtn = document.getElementById('cancelBtn');
  const klantForm = document.getElementById('klant-form');

  // Boekjaar modal refs
  const boekjaarModal = document.getElementById('boekjaar-modal');
  const closeBoekjaarModalBtn = document.getElementById('closeBoekjaarModal');
  const cancelBoekjaarBtn = document.getElementById('cancelBoekjaarBtn');
  const boekjaarForm = document.getElementById('boekjaar-form');

  // Filters
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearch');
  const partnerFilter = document.getElementById('partnerFilter');
  const teamFilter = document.getElementById('teamFilter');
  const clearFiltersBtn = document.getElementById('clearFilters');
  const clearAllFiltersBtn = document.getElementById('clearAllFilters');

  // Bulk Actions
  const bulkActionsBar = document.getElementById('bulkActionsBar');
  const selectedCountEl = document.getElementById('selectedCount');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const bulkDeleteBtn = document.getElementById('bulkDelete');

  // Overige modals/elems
  const noResults = document.getElementById('noResults');
  const tableContainer = document.querySelector('.table-container');

  const confirmModal = document.getElementById('confirmModal');
  const confirmTitle = document.getElementById('confirmTitle');
  const confirmMessage = document.getElementById('confirmMessage');
  const confirmDetails = document.getElementById('confirmDetails');
  const confirmBtn = document.getElementById('confirmBtn');
  const closeConfirmModalBtn = document.getElementById('closeConfirmModal');
  const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');

  const successNotification = document.getElementById('successNotification');
  const successMessage = document.getElementById('successMessage');
  const closeSuccessNotificationBtn = document.getElementById('closeSuccessNotification');

  // klant boekjaar/budget velden
  const klantBoekjaarSelect = document.getElementById('klant-boekjaar-select');
  const klantBudgetInput = document.getElementById('klant-budget');

  // --- Dropdown Logica (Header) ---
  const dropdowns = document.querySelectorAll('.dropdown');
  const accountBtn = document.getElementById('accountBtn');
  const accountMenu = document.getElementById('accountMenu');

  dropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector('.dropdown-toggle');
    toggle.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      dropdowns.forEach(d => { if (d !== dropdown) d.classList.remove('active'); });
      dropdown.classList.toggle('active');
    });
  });
  const accountDropdown = document.querySelector('.account-dropdown');
  accountBtn.addEventListener('click', function (e) {
    e.preventDefault(); e.stopPropagation();
    accountDropdown.classList.toggle('active');
  });
  document.addEventListener('click', function () {
    dropdowns.forEach(d => d.classList.remove('active'));
    accountDropdown.classList.remove('active');
  });
  document.querySelectorAll('.dropdown-menu, .account-menu').forEach(menu => {
    menu.addEventListener('click', e => e.stopPropagation());
  });

  // --- Data & Opslag Logica ---
  function saveKlanten() {
    localStorage.setItem(localStorageKey, JSON.stringify(klantenData));
  }

  async function laadKlanten() {
    const opgeslagenData = localStorage.getItem(localStorageKey);
    let dataGeldig = false;

    if (opgeslagenData) {
      try {
        const data = JSON.parse(opgeslagenData);
        if (Array.isArray(data)) {
          klantenData = data;
          dataGeldig = true;
        }
      } catch (e) { dataGeldig = false; }
    }

    if (!dataGeldig) {
      console.log("Geen (of ongeldige) localStorage data, laden uit klanten.json...");
      try {
        const response = await fetch('/klanten/klanten.json');
        if (!response.ok) throw new Error('Kon klanten.json niet laden');
        klantenData = await response.json();
        saveKlanten();
      } catch (error) {
        console.error('Fout bij laden:', error);
        tabelBody.innerHTML = `<tr><td colspan="7">Kon data niet laden.</td></tr>`;
      }
    }

    populateFilters();
    applyFilters();
  }

  function saveBoekjaren() {
    localStorage.setItem(boekjaarStorageKey, JSON.stringify(boekjarenData));
  }

  function laadBoekjaren() {
    const opgeslagenBoekjaren = localStorage.getItem(boekjaarStorageKey);
    let geldig = false;

    if (opgeslagenBoekjaren) {
      try {
        const data = JSON.parse(opgeslagenBoekjaren);
        if (Array.isArray(data)) {
          boekjarenData = data;
          geldig = true;
        }
      } catch (e) { geldig = false; }
    }

    if (!geldig) {
      boekjarenData = [];
      saveBoekjaren();
    }

    vulBoekjaarDropdown();
  }

  // --- Boekjaar helpers & dropdown ---
  function getBoekjaarInfo(jaar) {
    return boekjarenData.find(b => b.jaar === jaar);
  }

  function vulBoekjaarDropdown() {
    klantBoekjaarSelect.innerHTML = '<option value="" disabled selected>Selecteer boekjaar...</option>';

    boekjarenData
      .sort((a, b) => b.jaar.localeCompare(a.jaar)) // nieuwste eerst
      .forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.jaar;
        const bedrag = parseFloat(item.budget || 0).toLocaleString('nl-NL');
        opt.textContent = `${item.jaar} (€ ${bedrag})`;
        klantBoekjaarSelect.appendChild(opt);
      });
  }

  // --- Filter Logica ---
  function populateFilters() {
    const partners = new Set(klantenData.map(k => k.partnerManager).filter(Boolean));
    const teams = new Set(klantenData.map(k => k.verantwoordelijkTeam).filter(Boolean));

    partnerFilter.innerHTML = '<option value="">Alle Partners</option>';
    partners.forEach(partner => {
      const option = new Option(partner, partner);
      partnerFilter.add(option);
    });

    teamFilter.innerHTML = '<option value="">Alle Teams</option>';
    teams.forEach(team => {
      const option = new Option(team, team);
      teamFilter.add(option);
    });
  }

  function applyFilters() {
    const zoekTerm = searchInput.value.toLowerCase();
    const partner = partnerFilter.value;
    const team = teamFilter.value;

    gefilterdeKlanten = klantenData.filter(klant => {
      const zoekMatch = !zoekTerm ||
        klant.klantNaam.toLowerCase().includes(zoekTerm) ||
        klant.partnerManager.toLowerCase().includes(zoekTerm) ||
        (klant.verantwoordelijkTeam && klant.verantwoordelijkTeam.toLowerCase().includes(zoekTerm));

      const partnerMatch = !partner || klant.partnerManager === partner;
      const teamMatch = !team || klant.verantwoordelijkTeam === team;

      return zoekMatch && partnerMatch && teamMatch;
    });

    renderTabel();
    updateBulkActionsBar();
  }

 function renderTabel() {
  tabelBody.innerHTML = '';

  if (gefilterdeKlanten.length === 0) {
    tableContainer.style.display = 'none';
    noResults.style.display = 'block';
  } else {
    tableContainer.style.display = 'block';
    noResults.style.display = 'none';
  }

  gefilterdeKlanten.forEach(klant => {
    const tr = document.createElement('tr');
    tr.dataset.id = klant.id;

    tr.innerHTML = `
      <td data-label="Klant naam">${klant.klantNaam || '-'}</td>
      <td data-label="Partner/Manager">${klant.partnerManager || '-'}</td>
      <td data-label="Budget">${formatCurrency(klant.budget)}</td>
      <td data-label="Startdatum">${formatDate(klant.startdatum)}</td>
      <td data-label="Einddatum">${formatDate(klant.einddatum)}</td>
      <td class="actions">
        <div class="action-buttons">
          <button class="btn-action btn-edit" data-id="${klant.id}" title="Bewerken">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            <span>Bewerken</span>
          </button>
          <button class="btn-action btn-delete" data-id="${klant.id}" title="Verwijderen">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Verwijderen</span>
          </button>
        </div>
      </td>
    `;
    tabelBody.appendChild(tr);
  });

  koppelTabelActies();
}

  // --- Koppel Acties ---
function koppelTabelActies() {
  // Edit
  tabelBody.querySelectorAll('.btn-edit').forEach(knop => {
    knop.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.dataset.id);
      openKlantModal('edit', id);
    });
  });

  // Individueel verwijderen
  tabelBody.querySelectorAll('.btn-delete').forEach(knop => {
    knop.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.dataset.id);
      const klant = klantenData.find(k => k.id === id);
      showConfirmDelete([id], klant ? `klant "${klant.klantNaam}"` : 'deze klant');
    });
  });
}


  // --- Bulk Actie Logica ---
function setupBulkSelection() { /* bulk selectie uitgeschakeld */ }

function updateBulkActionsBar() { /* bulk actions uitgeschakeld */ }


  // --- Modal Logica ---
  function openKlantModal(mode, klantId = null) {
    clearAllErrorsInline();
    klantForm.reset();

    // dropdown boekjaren altijd updaten
    vulBoekjaarDropdown();
    // budget NIET meer auto invullen op basis van boekjaar
    klantBudgetInput.value = '';

    document.getElementById('klant-id').value = '';

    if (mode === 'edit') {
      const klant = klantenData.find(k => k.id === klantId);
      if (!klant) return;

      modalTitle.textContent = 'Klant Bewerken';
      modalSaveBtn.textContent = 'Wijzigingen Opslaan';

      const setValueIfExists = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
      };

      setValueIfExists('klant-id', klant.id);
      setValueIfExists('klant-naam', klant.klantNaam);

      // boekjaar dropdown zetten
      if (klant.boekjaar) {
        klantBoekjaarSelect.value = klant.boekjaar;
      }

      // budget van de klant zelf laten staan
      if (klant.budget) {
        klantBudgetInput.value = klant.budget;
      } else {
        klantBudgetInput.value = '';
      }

      setValueIfExists('klant-partner', klant.partnerManager);
      setValueIfExists('klant-verantwoordelijk', klant.verantwoordelijkTeam);
      setValueIfExists('klant-planbaar', klant.planbaarDoorTeams);
      setValueIfExists('klant-startdatum', klant.startdatum);
      setValueIfExists('klant-einddatum', klant.einddatum);

    } else {
      modalTitle.textContent = 'Nieuwe klant toevoegen';
      modalSaveBtn.textContent = 'Opslaan';
    }

    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.style.display = 'none';
    clearAllErrorsInline();
    klantForm.reset();
  }

  function openBoekjaarModal() {
    boekjaarForm.reset();
    clearBoekjaarErrors();
    boekjaarModal.style.display = 'flex';
  }

  function closeBoekjaarModal() {
    boekjaarModal.style.display = 'none';
  }

  // --- Validatie Logica voor klant ---
  function validateForm() {
    const errors = [];

    // alle velden ophalen
    const klantNaamEl = document.getElementById('klant-naam');
    const boekjaarEl = document.getElementById('klant-boekjaar-select');
    const budgetEl = document.getElementById('klant-budget');
    const partnerEl = document.getElementById('klant-partner');
    const teamVerantwoordelijkEl = document.getElementById('klant-verantwoordelijk');
    const planbaarEl = document.getElementById('klant-planbaar');
    const startdatumEl = document.getElementById('klant-startdatum');
    const einddatumEl = document.getElementById('klant-einddatum');

    const klantNaamVal = klantNaamEl.value.trim();
    const boekjaarVal = boekjaarEl.value.trim();
    const budgetStr = budgetEl.value.trim();
    const partnerVal = partnerEl.value.trim();
    const teamVerantwoordelijkVal = teamVerantwoordelijkEl.value.trim();
    const planbaarVal = planbaarEl.value.trim();
    const startdatumVal = startdatumEl.value.trim();
    const einddatumVal = einddatumEl.value.trim();

    // helper: push error
    function addError(id, msg) {
      errors.push({ id, bericht: msg });
    }

    // Verplichtheid check voor ALLES
    if (!klantNaamVal) addError('klant-naam', 'Klant naam is verplicht.');
    if (!boekjaarVal) addError('klant-boekjaar-select', 'Boekjaar is verplicht.');
    if (!budgetStr) addError('klant-budget', 'Budget is verplicht.');
    if (!partnerVal) addError('klant-partner', 'Partner/Manager is verplicht.');
    if (!teamVerantwoordelijkVal) addError('klant-verantwoordelijk', 'Verantwoordelijk team is verplicht.');
    if (!planbaarVal) addError('klant-planbaar', 'Planbaar door teams is verplicht.');
    if (!startdatumVal) addError('klant-startdatum', 'Startdatum is verplicht.');
    if (!einddatumVal) addError('klant-einddatum', 'Einddatum is verplicht.');

    // Specifieke extra checks
    if (klantNaamVal && klantNaamVal.length < 2) {
      addError('klant-naam', 'Klant naam moet minimaal 2 karakters lang zijn.');
    }

    // budget validaties
    const gekozenJaar = boekjaarVal;
    const boekjaarInfo = getBoekjaarInfo(gekozenJaar);

    const budgetNum = budgetStr === '' ? NaN : parseFloat(budgetStr.replace(',', '.'));

    if (budgetStr !== '') {
      if (isNaN(budgetNum) || budgetNum < 0) {
        addError('klant-budget', 'Budget moet een getal zijn van 0 of hoger.');
      } else if (boekjaarInfo) {
        const maxBudgetNum = parseFloat(boekjaarInfo.budget);
        if (!isNaN(maxBudgetNum) && budgetNum > maxBudgetNum) {
          addError(
            'klant-budget',
            `Budget kan niet hoger zijn dan het boekjaarbudget (€ ${maxBudgetNum.toLocaleString('nl-NL')}).`
          );
        }
      }
    }

    // datum logica: einddatum mag niet vóór startdatum liggen
    if (startdatumVal && einddatumVal) {
      const startDate = new Date(startdatumVal);
      const endDate = new Date(einddatumVal);
      if (startDate.toString() !== 'Invalid Date' &&
        endDate.toString() !== 'Invalid Date' &&
        endDate < startDate) {
        addError('klant-einddatum', 'Einddatum mag niet vóór startdatum liggen.');
      }
    }

    return errors;
  }

  // Toon inline errors voor alle velden
  function showValidationErrorsInline(errors) {
    const grouped = {};
    for (const err of errors) {
      grouped[err.id] = err.bericht;
    }

    const fieldIds = [
      'klant-naam',
      'klant-boekjaar-select',
      'klant-budget',
      'klant-partner',
      'klant-verantwoordelijk',
      'klant-planbaar',
      'klant-startdatum',
      'klant-einddatum'
    ];

    fieldIds.forEach(id => {
      const fieldEl = document.getElementById(id);

      // veld-specifieke error element opzoeken
      let errorEl = document.getElementById(id + 'Error');

      // speciale gevallen waar de ID niet 1-op-1 matched
      if (!errorEl) {
        if (id === 'klant-boekjaar-select') {
          errorEl = document.getElementById('klantBoekjaarError');
        } else if (id === 'klant-budget') {
          errorEl = document.getElementById('klant-budgetError');
        } else if (id === 'klant-startdatum') {
          errorEl = document.getElementById('klant-startdatumError');
        } else if (id === 'klant-einddatum') {
          errorEl = document.getElementById('klant-einddatumError');
        } else if (id === 'klant-partner') {
          errorEl = document.getElementById('klant-partnerError');
        } else if (id === 'klant-verantwoordelijk') {
          errorEl = document.getElementById('klant-verantwoordelijkError');
        } else if (id === 'klant-planbaar') {
          errorEl = document.getElementById('klant-planbaarError');
        }
      }

      // reset
      if (fieldEl) fieldEl.classList.remove('error');
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('show');
      }

      // set error indien nodig
      if (grouped[id]) {
        if (fieldEl) fieldEl.classList.add('error');
        if (errorEl) {
          errorEl.textContent = grouped[id];
          errorEl.classList.add('show');
        }
      }
    });
  }

  // Haal ALLE error states weg
  function clearAllErrorsInline() {
    const fieldIds = [
      'klant-naam',
      'klant-boekjaar-select',
      'klant-budget',
      'klant-partner',
      'klant-verantwoordelijk',
      'klant-planbaar',
      'klant-startdatum',
      'klant-einddatum'
    ];

    fieldIds.forEach(id => {
      const fieldEl = document.getElementById(id);

      let errorEl = document.getElementById(id + 'Error');
      if (!errorEl) {
        if (id === 'klant-boekjaar-select') {
          errorEl = document.getElementById('klantBoekjaarError');
        } else if (id === 'klant-budget') {
          errorEl = document.getElementById('klant-budgetError');
        } else if (id === 'klant-startdatum') {
          errorEl = document.getElementById('klant-startdatumError');
        } else if (id === 'klant-einddatum') {
          errorEl = document.getElementById('klant-einddatumError');
        } else if (id === 'klant-partner') {
          errorEl = document.getElementById('klant-partnerError');
        } else if (id === 'klant-verantwoordelijk') {
          errorEl = document.getElementById('klant-verantwoordelijkError');
        } else if (id === 'klant-planbaar') {
          errorEl = document.getElementById('klant-planbaarError');
        }
      }

      if (fieldEl) fieldEl.classList.remove('error');
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('show');
      }
    });
  }

  // --- Validatie Logica voor boekjaar ---
  function validateBoekjaarForm() {
    const errors = [];

    const jaar = document.getElementById('boekjaar-jaar').value.trim();
    const budget = document.getElementById('boekjaar-budget').value.trim();

    if (!jaar) {
      errors.push({ id: 'boekjaar-jaar', bericht: 'Boekjaar is verplicht.' });
    } else if (!/^\d{4}$/.test(jaar)) {
      errors.push({ id: 'boekjaar-jaar', bericht: 'Boekjaar moet 4 cijfers zijn.' });
    }

    if (budget === '') {
      errors.push({ id: 'boekjaar-budget', bericht: 'Budget is verplicht.' });
    } else if (parseFloat(budget) < 0) {
      errors.push({ id: 'boekjaar-budget', bericht: 'Budget mag niet negatief zijn.' });
    }

    if (boekjarenData.some(b => b.jaar === jaar)) {
      errors.push({ id: 'boekjaar-jaar', bericht: 'Dit boekjaar bestaat al.' });
    }

    return errors;
  }

  function showBoekjaarErrors(errors) {
    clearBoekjaarErrors();
    const grouped = {};
    for (const err of errors) {
      grouped[err.id] = err.bericht;
    }

    ['boekjaar-jaar', 'boekjaar-budget'].forEach(id => {
      const el = document.getElementById(id);
      const msg = document.getElementById(id + 'Error');
      if (el) el.classList.remove('error');
      if (msg) {
        msg.textContent = '';
        msg.classList.remove('show');
      }

      if (grouped[id]) {
        if (el) el.classList.add('error');
        if (msg) {
          msg.textContent = grouped[id];
          msg.classList.add('show');
        }
      }
    });
  }

  function clearBoekjaarErrors() {
    ['boekjaar-jaar', 'boekjaar-budget'].forEach(id => {
      const el = document.getElementById(id);
      const msg = document.getElementById(id + 'Error');
      if (el) el.classList.remove('error');
      if (msg) { msg.textContent = ''; msg.classList.remove('show'); }
    });
  }

  // =========================
  // 🔢 Alleen cijfers/decimalen: boekjaar & budget
  // =========================
  const boekjaarJaarEl = document.getElementById('boekjaar-jaar');
  const boekjaarBudgetEl = document.getElementById('boekjaar-budget');
  const klantBudgetEl = document.getElementById('klant-budget');

  function preventInvalidKeysForDigits(evt) {
    const allowedCtrl = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'];
    if (allowedCtrl.includes(evt.key)) return;
    if (!/^\d$/.test(evt.key)) evt.preventDefault();
  }
  function sanitizeDigits(el, maxLen) {
    let v = el.value.replace(/\D/g, '');
    if (typeof maxLen === 'number') v = v.slice(0, maxLen);
    el.value = v;
  }
  function preventInvalidKeysForDecimal(evt) {
    const allowedCtrl = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'];
    if (allowedCtrl.includes(evt.key)) return;
    if (/^\d$/.test(evt.key)) return;
    if ((evt.key === '.' || evt.key === ',') && !evt.currentTarget.value.includes('.') && !evt.currentTarget.value.includes(',')) return;
    evt.preventDefault();
  }
  function sanitizeDecimal(el) {
    let v = el.value.replace(/[^0-9.,]/g, '');
    const hasDot = v.includes('.');
    const hasComma = v.includes(',');
    if (hasDot && hasComma) v = v.replace(/,/g, '.');
    const parts = v.split(/[.,]/);
    if (parts.length > 1) v = parts[0] + '.' + parts.slice(1).join('').replace(/[.]/g, '');
    el.value = v;
  }

  boekjaarJaarEl?.setAttribute('inputmode', 'numeric');
  klantBudgetEl?.setAttribute('inputmode', 'decimal');
  boekjaarBudgetEl?.setAttribute('inputmode', 'decimal');

  if (boekjaarJaarEl) {
    boekjaarJaarEl.addEventListener('keydown', preventInvalidKeysForDigits);
    boekjaarJaarEl.addEventListener('input', () => sanitizeDigits(boekjaarJaarEl, 4));
    boekjaarJaarEl.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text');
      boekjaarJaarEl.value = text.replace(/\D/g, '').slice(0, 4);
    });
  }

  [klantBudgetEl, boekjaarBudgetEl].forEach((el) => {
    if (!el) return;
    el.addEventListener('keydown', preventInvalidKeysForDecimal);
    el.addEventListener('input', () => sanitizeDecimal(el));
    el.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text');
      const tmp = text.replace(/[^0-9.,]/g, '');
      el.value = tmp;
      sanitizeDecimal(el);
    });
  });

  // =========================
  // 🔴 LIVE VALIDATIE (per veld, met jouw eigen foutteksten)
  // =========================

  // Mapping helper: haal het juiste error-element bij een field-id
  function getErrorElementByFieldId(id) {
    let errorEl = document.getElementById(id + 'Error');
    if (!errorEl) {
      if (id === 'klant-boekjaar-select') errorEl = document.getElementById('klantBoekjaarError');
      else if (id === 'klant-budget') errorEl = document.getElementById('klant-budgetError');
      else if (id === 'klant-startdatum') errorEl = document.getElementById('klant-startdatumError');
      else if (id === 'klant-einddatum') errorEl = document.getElementById('klant-einddatumError');
      else if (id === 'klant-partner') errorEl = document.getElementById('klant-partnerError');
      else if (id === 'klant-verantwoordelijk') errorEl = document.getElementById('klant-verantwoordelijkError');
      else if (id === 'klant-planbaar') errorEl = document.getElementById('klant-planbaarError');
    }
    return errorEl;
  }

  function setFieldError(id, message) {
    const fieldEl = document.getElementById(id);
    const errorEl = getErrorElementByFieldId(id);
    if (fieldEl) fieldEl.classList.add('error');
    if (errorEl) {
      errorEl.textContent = message; // gebruik je eigen teksten uit validateForm()
      errorEl.classList.add('show');
    }
  }

  function clearFieldError(id) {
    const fieldEl = document.getElementById(id);
    const errorEl = getErrorElementByFieldId(id);
    if (fieldEl) fieldEl.classList.remove('error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('show');
    }
  }

  // Valideer alleen één specifiek veld, met dezelfde regels/teksten als validateForm()
  function validateSingleField(id) {
    const allErrors = validateForm(); // bereken alles met jouw huidige logica
    const errForField = allErrors.find(e => e.id === id);

    if (errForField) {
      setFieldError(id, errForField.bericht);
      return false;
    } else {
      clearFieldError(id);
      return true;
    }
  }

  // Als start/einddatum wijzigt: beide checken i.v.m. volgorde-eis
  function validateDatesPair() {
    validateSingleField('klant-startdatum');
    validateSingleField('klant-einddatum');
  }

  // Koppel live events
  const liveFieldIds = [
    'klant-naam',
    'klant-boekjaar-select',
    'klant-budget',
    'klant-partner',
    'klant-verantwoordelijk',
    'klant-planbaar',
    'klant-startdatum',
    'klant-einddatum'
  ];

  liveFieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    const handler = () => {
      // budget hangt af van boekjaar; bij wijzigen van een van beide, hercontrole
      if (id === 'klant-budget' || id === 'klant-boekjaar-select') {
        validateSingleField('klant-budget');
      } else if (id === 'klant-startdatum' || id === 'klant-einddatum') {
        validateDatesPair();
      } else {
        validateSingleField(id);
      }
    };

    // input voor typen, blur voor verlaten, change voor select/date
    el.addEventListener('input', handler);
    el.addEventListener('blur', handler);
    el.addEventListener('change', handler);
  });

  // =========================
  // EINDE LIVE VALIDATIE
  // =========================

  // --- Formulier Submit Klant ---
  klantForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAllErrorsInline();
    const errors = validateForm();

    if (errors.length > 0) {
      showValidationErrorsInline(errors);
      return;
    }

    modalSaveBtn.classList.add('loading');
    modalSaveBtn.disabled = true;

    const id = parseInt(document.getElementById('klant-id').value);
    const data = {
      klantNaam: document.getElementById('klant-naam').value.trim(),
      boekjaar: document.getElementById('klant-boekjaar-select').value.trim(),
      budget: document.getElementById('klant-budget').value.trim(),
      partnerManager: document.getElementById('klant-partner').value.trim(),
      verantwoordelijkTeam: document.getElementById('klant-verantwoordelijk').value.trim(),
      planbaarDoorTeams: document.getElementById('klant-planbaar').value.trim(),
      startdatum: document.getElementById('klant-startdatum').value.trim(),
      einddatum: document.getElementById('klant-einddatum').value.trim()
    };

    // simulatie "opslaan"
    setTimeout(() => {
      if (id) {
        const index = klantenData.findIndex(k => k.id === id);
        if (index > -1) {
          klantenData[index] = { ...klantenData[index], ...data };
        }
        showSuccessNotification('Klant succesvol bijgewerkt!');
      } else {
        data.id = Date.now(); // Simpel ID
        klantenData.push(data);
        showSuccessNotification('Klant succesvol toegevoegd!');
      }

      saveKlanten();
      populateFilters();
      applyFilters();
      closeModal();

      modalSaveBtn.classList.remove('loading');
      modalSaveBtn.disabled = false;
    }, 500);
  });

  // --- Formulier Submit Boekjaar ---
  boekjaarForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearBoekjaarErrors();

    const errors = validateBoekjaarForm();
    if (errors.length > 0) {
      showBoekjaarErrors(errors);
      return;
    }

    const jaar = document.getElementById('boekjaar-jaar').value.trim();
    const budget = document.getElementById('boekjaar-budget').value.trim();

    boekjarenData.push({ jaar, budget });

    saveBoekjaren();
    vulBoekjaarDropdown();

    showSuccessNotification(`Boekjaar ${jaar} aangemaakt.`);
    closeBoekjaarModal();
  });

  // --- Bevestiging & Notificatie Logica ---
  function showConfirmDelete(ids, naam) {
    confirmTitle.textContent = 'Klant(en) Verwijderen';
    confirmMessage.textContent = `Weet je zeker dat je ${naam} wilt verwijderen?`;
    confirmDetails.style.display = 'none';
    confirmBtn.textContent = 'Verwijderen';
    confirmBtn.className = 'btn btn-danger';

    confirmModal.style.display = 'flex';

    confirmBtn.onclick = () => {
      handleDelete(ids);
      confirmModal.style.display = 'none';
    };
  }

  function handleDelete(ids) {
    klantenData = klantenData.filter(k => !ids.includes(k.id));
    geselecteerdeIds.clear();
    saveKlanten();
    populateFilters();
    applyFilters();
    showSuccessNotification(`${ids.length} klant(en) succesvol verwijderd.`);
  }

  function showSuccessNotification(message) {
    successNotification.style.display = 'flex';
    successMessage.textContent = message;
    setTimeout(() => {
      successNotification.style.display = 'none';
    }, 3000);
  }

  // --- Event Listeners Toewijzen ---
  // Modals sluiten
  closeModalBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  closeConfirmModalBtn.addEventListener('click', () => confirmModal.style.display = 'none');
  cancelConfirmBtn.addEventListener('click', () => confirmModal.style.display = 'none');

  closeSuccessNotificationBtn.addEventListener('click', () => successNotification.style.display = 'none');

  // Open modals
  addKlantBtn.addEventListener('click', () => openKlantModal('new'));
  addBoekjaarBtn.addEventListener('click', openBoekjaarModal);

  // Boekjaar modal sluiten
  closeBoekjaarModalBtn.addEventListener('click', closeBoekjaarModal);
  cancelBoekjaarBtn.addEventListener('click', closeBoekjaarModal);

  // Filters
  searchInput.addEventListener('input', () => {
    clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
    applyFilters();
  });
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    applyFilters();
  });
  [partnerFilter, teamFilter].forEach(el => el.addEventListener('change', applyFilters));
  clearFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    partnerFilter.value = '';
    teamFilter.value = '';
    applyFilters();
  });
  clearAllFiltersBtn.addEventListener('click', () => clearFiltersBtn.click());

  // Bulk selectie
  setupBulkSelection();

  // --- Initialisatie ---
  laadBoekjaren();
  laadKlanten();
});
