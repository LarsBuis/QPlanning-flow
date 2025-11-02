document.addEventListener('DOMContentLoaded', function() {
  // --- Normalisatie helpers ---
  function normalizeWhitespace(str) {
    return (str || '').replace(/\s+/g, ' ').trim();
  }
  const DUTCH_PARTICLES = new Set(['de','den','der','van','het','te','ten','ter','op','aan','bij','uit','in','von','vom','am','auf']);
  function capitalizeToken(token) {
    return token.split(/([-’'–—])/).map((part) => {
      if (/^[-’'–—]$/.test(part)) return part;
      if (!part) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }).join('');
  }
  function toNameCase(full, {treatParticlesLower = true} = {}) {
    full = normalizeWhitespace(full);
    if (!full) return '';
    const words = full.split(' ');
    return words.map((w, i) => {
      const lower = w.toLowerCase();
      if (i === 0) return capitalizeToken(lower);
      if (treatParticlesLower && DUTCH_PARTICLES.has(lower)) return lower;
      return capitalizeToken(lower);
    }).join(' ');
  }
  function toTussenvoegselCase(v) {
    v = normalizeWhitespace(v);
    if (!v) return '';
    return v.split(' ').map(w => w.toLowerCase()).join(' ');
  }

  // Letter-regexen (Unicode)
  const ONLY_LETTERS = /^[\p{L}]+$/u;        // letters (naamvelden)
  const LETTERS_SPACES = /^[\p{L}\s]+$/u;    // letters + spaties (tussenvoegsel)

  // --- State
  let gebruikersData = [];
  let gefilterdeGebruikers = [];
  let geselecteerdeIds = new Set();
  const storageKey = 'qplanning_gebruikers_v2';

  // --- DOM refs
  const tabelBody = document.getElementById('gebruikers-tabel-body');
  const addBtn = document.getElementById('add-gebruiker-btn');
  const modal = document.getElementById('gebruiker-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalSaveBtn = document.getElementById('modal-save-btn');
  const closeModalBtn = document.getElementById('closeModal');
  const cancelBtn = document.getElementById('cancelBtn');
  const gebruikerForm = document.getElementById('gebruiker-form');

  const voornaamEl = document.getElementById('voornaam');
  const tussenvoegselEl = document.getElementById('tussenvoegsel');
  const achternaamEl = document.getElementById('achternaam');
  const emailEl = document.getElementById('email');
  const rolEl = document.getElementById('rol');

  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearch');
  const rolFilter = document.getElementById('rolFilter');

  const bulkActionsBar = document.getElementById('bulkActionsBar');
  const selectedCountEl = document.getElementById('selectedCount');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const bulkDeleteBtn = document.getElementById('bulkDelete');

  const confirmModal = document.getElementById('confirmModal');
  const confirmBtn = document.getElementById('confirmBtn');

  const successNotification = document.getElementById('successNotification');
  const successMessage = document.getElementById('successMessage');
  const closeSuccessNotificationBtn = document.getElementById('closeSuccessNotification');

  // --- Header dropdowns ---
  const dropdowns = document.querySelectorAll('.dropdown');
  const accountBtn = document.getElementById('accountBtn');
  const accountDropdown = document.querySelector('.account-dropdown');
  dropdowns.forEach(d => {
    const t = d.querySelector('.dropdown-toggle');
    t.addEventListener('click', (e)=>{e.preventDefault();e.stopPropagation();
      dropdowns.forEach(x=>{if(x!==d) x.classList.remove('active');});
      d.classList.toggle('active');
    });
  });
  accountBtn.addEventListener('click', (e)=>{e.preventDefault();e.stopPropagation();accountDropdown.classList.toggle('active');});
  document.addEventListener('click', ()=>{ dropdowns.forEach(d=>d.classList.remove('active')); accountDropdown.classList.remove('active');});
  document.querySelectorAll('.dropdown-menu, .account-menu').forEach(m=>m.addEventListener('click', e=>e.stopPropagation()));

  // --- Helpers ---
  function fullName(g) { return [g.voornaam, g.tussenvoegsel, g.achternaam].filter(Boolean).join(' '); }
  function saveGebruikers() { localStorage.setItem(storageKey, JSON.stringify(gebruikersData)); }

  // MIGRATIE: oude data -> enkele rol + geen wachtwoord
  function migrateRoles(list) {
    return list.map(g => {
      if (g.rol && typeof g.rol === 'string') return g;
      if (Array.isArray(g.rollen) && g.rollen.length > 0) g.rol = g.rollen[0];
      else if (typeof g.rollen === 'string') g.rol = g.rollen;
      else if (!g.rol) g.rol = '';
      if ('wachtwoord' in g) delete g.wachtwoord;
      return g;
    });
  }

  async function laadGebruikers() {
    const ls = localStorage.getItem(storageKey);
    let ok = false;
    if (ls) {
      try {
        const data = JSON.parse(ls);
        if (Array.isArray(data)) {
          gebruikersData = migrateRoles(data);
          ok = true;
        }
      } catch(e){}
    }
    if (!ok) {
      try {
        const resp = await fetch('/Gebruikers/Gebruikers.json');
        if (!resp.ok) throw new Error('Kon Gebruikers.json niet laden');
        const fileData = await resp.json();
        gebruikersData = migrateRoles(Array.isArray(fileData) ? fileData : []);
        saveGebruikers();
      } catch (e) { console.error(e); gebruikersData = []; }
    }
    populateFilters();
    applyFilters();
  }

  // --- Filters ---
  function populateFilters() {
    const rollen = new Set( gebruikersData.map(g => g.rol).filter(Boolean) );
    rolFilter.innerHTML = '<option value="">Alle Rollen</option>';
    Array.from(rollen).sort().forEach(r => rolFilter.add(new Option(r, r)));
  }

  function applyFilters() {
    const term = (searchInput.value || '').toLowerCase();
    const rol = rolFilter.value;

    gefilterdeGebruikers = gebruikersData.filter(g => {
      const gebruikersnaamForSearch = g.gebruikersnaam || g.email || '';
      const tMatch = !term ||
        fullName(g).toLowerCase().includes(term) ||
        (g.email || '').toLowerCase().includes(term) ||
        gebruikersnaamForSearch.toLowerCase().includes(term);

      const rMatch = !rol || (g.rol === rol);
      return tMatch && rMatch;
    });

    renderTabel();
    updateBulkActionsBar();
  }

  // --- Render tabel ---
  function renderTabel() {
    tabelBody.innerHTML = '';
    const tableContainer = document.querySelector('.table-container');
    const noResults = document.getElementById('noResults');

    if (gefilterdeGebruikers.length === 0) {
      tableContainer.style.display = 'none';
      noResults.style.display = 'block';
      return;
    }
    tableContainer.style.display = 'block';
    noResults.style.display = 'none';

    gefilterdeGebruikers.forEach(g => {
      const tr = document.createElement('tr');
      const checked = geselecteerdeIds.has(g.id);
      const gebruikersnaamShown = g.gebruikersnaam || g.email || '-';

      tr.innerHTML = `
        <td data-label="Naam">${fullName(g) || '-'}</td>
        <td data-label="E-mail">${g.email || '-'}</td>
        <td data-label="Gebruikersnaam">${gebruikersnaamShown}</td>
        <td data-label="Rollen">${g.rol || '-'}</td>
        <td class="actions">
          <div class="action-buttons">
            <button class="btn-action btn-edit" data-id="${g.id}" title="Bewerken">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>Bewerken</span>
            </button>
            <button class="btn-action btn-delete" data-id="${g.id}" title="Verwijderen">
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

  // --- Koppel acties ---
  function koppelTabelActies() {
    tabelBody.querySelectorAll('.row-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = parseInt(e.target.dataset.id);
        if (e.target.checked) geselecteerdeIds.add(id);
        else geselecteerdeIds.delete(id);
        updateBulkActionsBar();
      });
    });
    tabelBody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => openGebruikerModal('edit', parseInt(e.currentTarget.dataset.id)));
    });
    tabelBody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const g = gebruikersData.find(x => x.id === id);
        showConfirmDelete([id], g ? `gebruiker "${fullName(g)}"` : 'deze gebruiker');
      });
    });
  }

  // --- Bulk selectie ---
  function setupBulkSelection() {}
  function updateBulkActionsBar() {}

  // --- Validatie (inline) ---
  function clearError(id) {
    const el = document.getElementById(id);
    const errEl = document.getElementById(id + 'Error');
    if (el) el.classList.remove('error');
    if (errEl) { errEl.textContent = ''; errEl.classList.remove('show'); }
  }
  function showError(id, msg) {
    const el = document.getElementById(id);
    const errEl = document.getElementById(id + 'Error');
    if (el) el.classList.add('error');
    if (errEl) { errEl.textContent = msg; errEl.classList.add('show'); }
  }
  function clearAllErrors() {
    ['voornaam','achternaam','tussenvoegsel','email','rol'].forEach(clearError);
  }

  function validateField(id) {
    const raw = document.getElementById(id).value;
    const val = (raw || '').trim();
    clearError(id);

    switch (id) {
      case 'voornaam':
        if (!val) { showError(id, 'Voornaam is verplicht.'); break; }
        if (!ONLY_LETTERS.test(val)) { showError(id, 'Alleen letters toegestaan.'); break; }
        if (val.length < 2) { showError(id, 'Minimaal 2 karakters.'); }
        break;

      case 'achternaam':
        if (!val) { showError(id, 'Achternaam is verplicht.'); break; }
        if (!ONLY_LETTERS.test(val)) { showError(id, 'Alleen letters toegestaan.'); break; }
        if (val.length < 2) { showError(id, 'Minimaal 2 karakters.'); }
        break;

      case 'tussenvoegsel':
        if (val && !LETTERS_SPACES.test(val)) { showError(id, 'Alleen letters en spaties toegestaan.'); }
        break;

      case 'email':
        if (!val) { showError(id, 'E-mailadres moet een geldig formaat hebben (bijv. naam@domein.com)'); break; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { showError(id, 'Ongeldig e-mailadres.'); }
        break;

      case 'rol':
        if (!val) { showError(id, 'Selecteer een rol.'); }
        break;
    }
  }

  // Live input-filtering (alleen letters bij naam, letters/spaties bij tussenvoegsel)
  function filterLetters(e) {
    const start = e.target.selectionStart, end = e.target.selectionEnd;
    const before = e.target.value;
    const after = before.replace(/[^\p{L}]/gu, '');
    if (before !== after) {
      e.target.value = after;
      const delta = before.length - after.length;
      e.target.setSelectionRange(Math.max(0, start - delta), Math.max(0, end - delta));
    }
  }
  function filterLettersSpaces(e) {
    const start = e.target.selectionStart, end = e.target.selectionEnd;
    const before = e.target.value;
    const after = before.replace(/[^\p{L}\s]/gu, '');
    if (before !== after) {
      e.target.value = after;
      const delta = before.length - after.length;
      e.target.setSelectionRange(Math.max(0, start - delta), Math.max(0, end - delta));
    }
  }

  // Koppel live filtering + inline validatie events
  voornaamEl.addEventListener('input', filterLetters);
  achternaamEl.addEventListener('input', filterLetters);
  tussenvoegselEl.addEventListener('input', filterLettersSpaces);

  ;['voornaam','tussenvoegsel','achternaam','email','rol'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('blur', () => validateField(id));
    el.addEventListener('input', () => clearError(id));
  });

  // --- Modal ---
  function openGebruikerModal(mode, id=null) {
    clearAllErrors();
    gebruikerForm.reset();
    document.getElementById('gebruiker-id').value = '';

    if (mode === 'edit') {
      const g = gebruikersData.find(x => x.id === id);
      if (!g) return;
      modalTitle.textContent = 'Gebruiker bewerken';
      modalSaveBtn.textContent = 'Opslaan';

      document.getElementById('gebruiker-id').value = g.id;
      voornaamEl.value = g.voornaam || '';
      tussenvoegselEl.value = g.tussenvoegsel || '';
      achternaamEl.value = g.achternaam || '';
      emailEl.value = g.email || '';
      rolEl.value = g.rol || '';
    } else {
      modalTitle.textContent = 'Nieuwe gebruiker';
      modalSaveBtn.textContent = 'Toevoegen';
    }

    // Extra: zorg dat gebruikersnaam “live” synchroon blijft met e-mail (voor intern gebruik)
    emailEl.dispatchEvent(new Event('input'));

    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.style.display = 'none';
    gebruikerForm.reset();
    clearAllErrors();
  }

  // --- Confirm + Success ---
  function showConfirmDelete(ids, naam) {
    const title = ids.length > 1 ? 'Gebruikers verwijderen' : 'Gebruiker verwijderen';
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = `Weet je zeker dat je ${naam} wilt verwijderen?`;
    confirmModal.style.display = 'flex';
    confirmBtn.onclick = () => { handleDelete(ids); confirmModal.style.display = 'none'; };
  }
  function handleDelete(ids) {
    gebruikersData = gebruikersData.filter(g => !ids.includes(g.id));
    geselecteerdeIds.clear();
    saveGebruikers();
    populateFilters();
    applyFilters();
    showSuccess('Gebruiker(s) succesvol verwijderd.');
  }
  function showSuccess(msg) {
    successMessage.textContent = msg;
    successNotification.style.display = 'flex';
    setTimeout(()=>{ successNotification.style.display='none'; }, 3000);
  }

  // --- Events ---
  document.getElementById('clearFilters').addEventListener('click', ()=>{
    searchInput.value = '';
    rolFilter.value = '';
    clearSearchBtn.style.display = 'none';
    applyFilters();
  });
  document.getElementById('clearAllFilters').addEventListener('click', ()=>document.getElementById('clearFilters').click());
  rolFilter.addEventListener('change', applyFilters);

  addBtn.addEventListener('click', ()=>openGebruikerModal('new'));
  closeModalBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  document.getElementById('closeConfirmModal').addEventListener('click', ()=>document.getElementById('confirmModal').style.display='none');
  document.getElementById('cancelConfirmBtn').addEventListener('click', ()=>document.getElementById('confirmModal').style.display='none');
  closeSuccessNotificationBtn.addEventListener('click', ()=>successNotification.style.display='none');

  searchInput.addEventListener('input', ()=>{
    clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
    applyFilters();
  });
  clearSearchBtn.addEventListener('click', ()=>{
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    applyFilters();
  });

  // --- Submit ---
  gebruikerForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    clearAllErrors();

    // Normaliseer vóór valideren/opslaan
    voornaamEl.value = toNameCase(voornaamEl.value, {treatParticlesLower: false});
    achternaamEl.value = toNameCase(achternaamEl.value);
    tussenvoegselEl.value = toTussenvoegselCase(tussenvoegselEl.value);
    emailEl.value = normalizeWhitespace(emailEl.value).toLowerCase();

    // Validatie
    ['voornaam','tussenvoegsel','achternaam','email','rol'].forEach(validateField);
    const errors = document.querySelectorAll('.error-message.show');
    if (errors.length > 0) return;

    // Gebruikersnaam = e-mail
    const gebruikersnaamAuto = emailEl.value;

    modalSaveBtn.classList.add('loading');
    modalSaveBtn.disabled = true;

    const id = parseInt(document.getElementById('gebruiker-id').value);
    const data = {
      voornaam: voornaamEl.value,
      tussenvoegsel: tussenvoegselEl.value,
      achternaam: achternaamEl.value,
      email: emailEl.value,
      gebruikersnaam: gebruikersnaamAuto,
      rol: rolEl.value
    };

    setTimeout(()=>{
      if (id) {
        const idx = gebruikersData.findIndex(g => g.id === id);
        if (idx > -1) gebruikersData[idx] = { ...gebruikersData[idx], ...data };
        showSuccess('Gebruiker succesvol bijgewerkt!');
      } else {
        data.id = Date.now();
        gebruikersData.push(data);
        showSuccess('Gebruiker succesvol toegevoegd!');
      }
      saveGebruikers();
      populateFilters();
      applyFilters();
      closeModal();
      modalSaveBtn.classList.remove('loading');
      modalSaveBtn.disabled = false;
    }, 300);
  });

  // --- Opstart ---
  setupBulkSelection();
  laadGebruikers();
});
