document.addEventListener("DOMContentLoaded", () => {
    // ====== CONFIG ======
    const PAGE_SIZE = 5;
    let currentPage = 1;

    // ====== STATE ======
    let editingId = null;
    let pendingDeleteId = null;

    // ====== FILTER STATE ======
    let searchText = "";
    let filterStatus = "";      // 'actief' | 'inactief' | ''
    let filterMedewerker = "";  // naam van medewerker of ''
    let filterFunctie = "";     // bv 'Support' of ''
    let filterTeam = "";        // bv 'Limburg' of ''

    // ====== MEDEWERKER DATA ======
    const medewerkersMap = {
        "Jan de Vries": { functie: "Manager", team: "Limburg" },
        "Lisa Janssen": { functie: "Assistent manager", team: "Brabant" },
        "Tom Peters": { functie: "Extern", team: "Healthcare" },
        "Sara Willems": { functie: "Stagiair", team: "Noord-Holland" },
        "Rik van den Berg": { functie: "IT", team: "Zuid-Holland" }
    };

    // ====== ELEMENTEN ======
    const boekingModal = document.getElementById("boekingModal");
    const boekingModalContent = boekingModal?.querySelector(".modal-content");
    const addEmployeeBtn = document.getElementById("addEmployeeBtn");
    const closeModalBtn = document.getElementById("closeModal");
    const cancelBtn = document.getElementById("cancelBtn");
    const boekingForm = document.getElementById("boekingForm");
    const ExportExcelBtn = document.getElementById("ExportExcelBtn");

    const planDatumInput = document.getElementById("planbaar");
    const weekInput = document.getElementById("weekNumber");
    const yearInput = document.getElementById("year");
    const urenInput = document.getElementById("hours");

    const weekError = document.getElementById("weekNumberError");
    const yearError = document.getElementById("yearError");
    const planError = document.getElementById("planbaarError");
    const urenError = document.getElementById("hoursError");

    const searchInput = document.getElementById("searchInput");
    const clearSearchBtn = document.getElementById("clearSearch");

    const geboektFilter = document.getElementById("geboektFilter");
    const medewerkerFilter = document.getElementById("medewerkerFilter");
    const functieFilter = document.getElementById("functieFilter");
    const teamFilter = document.getElementById("teamFilter");
    const clearFiltersBtn = document.getElementById("clearFilters");
    const clearAllFiltersBtn = document.getElementById("clearAllFilters");

    const noResultsEl = document.getElementById("noResults");
    const loadingOverlay = document.getElementById("loadingOverlay");

    const paginationContainer = document.getElementById("pagination");

    const tableEl = document.querySelector(".data-table");
    if (!tableEl) {
        console.error("data-table element niet gevonden");
        return;
    }
    let tableBody = document.querySelector(".data-table tbody");
    if (!tableBody) {
        tableBody = document.createElement("tbody");
        tableEl.appendChild(tableBody);
    }

    // Confirm modal elementen
    const confirmModal = document.getElementById("confirmModal");
    const confirmTitle = document.getElementById("confirmTitle");
    const confirmMessage = document.getElementById("confirmMessage");
    const confirmDetails = document.getElementById("confirmDetails");
    const confirmBtn = document.getElementById("confirmBtn");
    const closeConfirmModalBtn = document.getElementById("closeConfirmModal");
    const cancelConfirmBtn = document.getElementById("cancelConfirmBtn");

    // Success toast elementen
    const successNotification = document.getElementById("successNotification");
    const successMessage = document.getElementById("successMessage");
    const closeSuccessNotificationBtn = document.getElementById("closeSuccessNotification");


/* === VALIDATIE: helpers === */
/* === VALIDATIE: helpers (GEUPDATE) === */
/* === VALIDATIE: helpers (GEFIXT) === */

/** Normaliseer naam voor tolerante vergelijking (case/spaties/accenten) */
function normalizeName(s) {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/** Zorg dat er een foutmelding-element bestaat onder een input */
function ensureFieldError(inputId, errorId){
  let el = document.getElementById(errorId);
  if(!el){
    const input = document.getElementById(inputId);
    if(input && input.parentElement){
      el = document.createElement("div");
      el.id = errorId;
      el.className = "error-message";
      input.parentElement.appendChild(el);
    }
  }
  return el;
}

/** Toon/verberg fout bij veld – sluit exact aan op jouw CSS */
function setFieldError(inputId, errorId, message){
  const input = document.getElementById(inputId);
  const el = ensureFieldError(inputId, errorId);
  if(!el) return;

  if(message){
    el.textContent = message;
    el.classList.add("show");     // toont .error-message
    input?.classList.add("error"); // rode rand (input.error)
  }else{
    el.textContent = "";
    el.classList.remove("show");
    input?.classList.remove("error");
  }
}

/** Maak alle errors leeg (voor open/close modal) */
function clearInputErrors() {
  [
    ["medewerker","employeeError"],
    ["klant","customerError"],
    ["weekNumber","weekNumberError"],
    ["year","yearError"],
    ["hours","hoursError"],
    ["planbaar","planbaarError"],
    ["opdracht","opdrachtError"],
    ["indirecteUren","indirecteUrenError"]
  ].forEach(([inputId, errId]) => setFieldError(inputId, errId, ""));
}


/* Zorg dat foutcontainers bestaan */
(function ensureErrorEls(){
  [
    ["medewerker","employeeError"],
    ["klant","customerError"],
    ["weekNumber","weekNumberError"],
    ["year","yearError"],
    ["hours","hoursError"],
    ["planbaar","planbaarError"],
    ["opdracht","opdrachtError"],
    ["indirecteUren","indirecteUrenError"]
  ].forEach(([i,e])=>ensureFieldError(i,e));
})();

/* Live inputregels (alleen toegestane tekens) */
/* ===== Medewerker & Klant: alleen letters + spaties; geen cijfers/leestekens ===== */
const nameAllowed = /^[A-Za-zÀ-ÿ\s]*$/; // lege string toegestaan tijdens typen

const medewerkerEl = document.getElementById("medewerker");
if (medewerkerEl) {
  medewerkerEl.addEventListener("input", () => {
    const v = medewerkerEl.value;
    if (!nameAllowed.test(v)) {
      setFieldError("medewerker", "employeeError", "Alleen letters en spaties toegestaan.");
    } else {
      // geen fout op 'alleen-letters' meer; lege check gebeurt op blur/submit
      setFieldError("medewerker", "employeeError", "");
    }
  });
  medewerkerEl.addEventListener("blur", () => {
    const v = medewerkerEl.value.trim();
    if (!v) {
      setFieldError("medewerker", "employeeError", "");
      return;
    }
    if (!nameAllowed.test(v)) {
      setFieldError("medewerker", "employeeError", "Alleen letters en spaties toegestaan.");
      return;
    }
    // dropdown-verplichting (keuze uit lijst)
    const dd = document.getElementById("medewerkerDropdown");
    const items = dd ? Array.from(dd.querySelectorAll(".suggestion-item")).map(n => n.textContent.trim()) : [];
    if (items.length && !items.includes(v)) {
      setFieldError("medewerker", "employeeError", "Selecteer een waarde uit de lijst.");
      return;
    }
    setFieldError("medewerker", "employeeError", "");
  });
}

const klantEl = document.getElementById("klant");
if (klantEl) {
  klantEl.addEventListener("input", () => {
    const v = klantEl.value;
    if (!nameAllowed.test(v)) {
      setFieldError("klant", "customerError", "Alleen letters en spaties toegestaan.");
    } else {
      setFieldError("klant", "customerError", "");
    }
  });
  klantEl.addEventListener("blur", () => {
    const v = klantEl.value.trim();
    if (!v) {
      setFieldError("klant", "customerError", "");
      return;
    }
    if (!nameAllowed.test(v)) {
      setFieldError("klant", "customerError", "Alleen letters en spaties toegestaan.");
      return;
    }
    const dd = document.getElementById("klantDropdown");
    const items = dd ? Array.from(dd.querySelectorAll(".suggestion-item")).map(n => n.textContent.trim()) : [];
    if (items.length && !items.includes(v)) {
      setFieldError("klant", "customerError", "Selecteer een waarde uit de lijst.");
      return;
    }
    setFieldError("klant", "customerError", "");
  });
}



if(weekInput){
  weekInput.addEventListener("input", ()=>{
    weekInput.value = weekInput.value.replace(/\D/g,"");
    setFieldError("weekNumber","weekNumberError","");
  });
}
if(yearInput){
  yearInput.addEventListener("input", ()=>{
    yearInput.value = yearInput.value.replace(/\D/g,"");
    setFieldError("year","yearError","");
  });
}
/* ===== Uren: alleen cijfers; letters/leestekens → rode rand + melding ===== */
if (urenInput) {
  urenInput.addEventListener("input", () => {
    const v = urenInput.value;
    // Leeg = nog aan het typen → geen melding. Invalid = onmiddelijk tonen.
    if (v !== "" && !/^\d+$/.test(v)) {
      setFieldError("hours", "hoursError", "Alleen cijfers toegestaan.");
    } else {
      setFieldError("hours", "hoursError", "");
    }
  });
  urenInput.addEventListener("blur", () => {
    const v = urenInput.value.trim();
    if (!v) {
      setFieldError("hours", "hoursError", "Dit veld is verplicht.");
    } else if (!/^\d+$/.test(v)) {
      setFieldError("hours", "hoursError", "Alleen cijfers toegestaan.");
    } else {
      setFieldError("hours", "hoursError", "");
    }
  });
}
if(planDatumInput){
  planDatumInput.addEventListener("change", ()=>{
    setFieldError("planbaar","planbaarError","");
  });
}

// === Live clearing voor 'opdracht' en 'indirecteUren' ===
const opdrachtField = document.getElementById("opdracht");
if (opdrachtField) {
  const clearOpdracht = () => {
    if ((opdrachtField.value || "").trim() !== "") {
      setFieldError("opdracht", "opdrachtError", "");
    }
  };
  opdrachtField.addEventListener("input", clearOpdracht);
  opdrachtField.addEventListener("change", clearOpdracht);
  opdrachtField.addEventListener("blur", clearOpdracht);
}

const indirecteUrenField = document.getElementById("indirecteUren");
if (indirecteUrenField) {
  const clearIndirecte = () => {
    if ((indirecteUrenField.value || "").trim() !== "") {
      setFieldError("indirecteUren", "indirecteUrenError", "");
    }
  };
  indirecteUrenField.addEventListener("input", clearIndirecte);
  indirecteUrenField.addEventListener("change", clearIndirecte);
  indirecteUrenField.addEventListener("blur", clearIndirecte);
}


/* Kernvalidatie vóór opslaan */
function validateBookingFormBeforeSave(){
  clearInputErrors();

  const medewerker = (medewerkerEl?.value || "").trim();
  const klant = (klantEl?.value || "").trim();
  const week = (weekInput?.value || "").trim();
  const jaar = (yearInput?.value || "").trim();
  const uren = (urenInput?.value || "").trim();
  const datum = (planDatumInput?.value || "").trim();
  const opdracht = (document.getElementById("opdracht")?.value || "").trim();
  const indirecteUren = (document.getElementById("indirecteUren")?.value || "").trim();

  let ok = true;

  // ===== Medewerker & Klant =====
  [["medewerker","employeeError","medewerkerDropdown",medewerker,"Medewerker"],
   ["klant","customerError","klantDropdown",klant,"Klant"]
  ].forEach(([inputId,errId,ddId,val,label])=>{
    if(!val){
      setFieldError(inputId,errId,`${label} is verplicht.`); ok=false; return;
    }
    if(!/^[A-Za-zÀ-ÿ\s]+$/.test(val)){
      setFieldError(inputId,errId,`${label} mag alleen letters en spaties bevatten.`); ok=false; return;
    }
    const dd = document.getElementById(ddId);
    const items = dd ? Array.from(dd.querySelectorAll(".suggestion-item")).map(n=>n.textContent) : [];
    const inList = !items.length || items.some(txt => normalizeName(txt) === normalizeName(val));
    if(!inList){
      setFieldError(inputId,errId,`Selecteer een waarde uit de lijst voor ${label.toLowerCase()}.`); ok=false; return;
    }
    setFieldError(inputId,errId,"");
  });

  // ===== Uren =====
  if(!uren){
    setFieldError("hours","hoursError","Uren is verplicht."); ok=false;
  } else if(!/^\d+$/.test(uren)){
    setFieldError("hours","hoursError","Uren mag alleen cijfers bevatten."); ok=false;
  } else {
    setFieldError("hours","hoursError","");
  }

  // ===== Week =====
  const w = parseInt(week||"0",10);
  if(!week){
    setFieldError("weekNumber","weekNumberError","Weeknummer is verplicht."); ok=false;
  } else if(!/^\d+$/.test(week) || w<1 || w>52){
    setFieldError("weekNumber","weekNumberError","Voer een geldig weeknummer in (1–52)."); ok=false;
  }

  // ===== Jaar =====
  const y = parseInt(jaar||"0",10);
  const minY = parseInt(yearInput?.min || "2020",10);
  const maxY = parseInt(yearInput?.max || "2100",10);
  if(!jaar){
    setFieldError("year","yearError","Jaar is verplicht."); ok=false;
  } else if(!/^\d+$/.test(jaar) || y<minY || y>maxY){
    setFieldError("year","yearError",`Voer een geldig jaar in (${minY}–${maxY}).`); ok=false;
  }

  // ===== Datum =====
  if(!datum){
    setFieldError("planbaar","planbaarError","Plan datum is verplicht."); ok=false;
  } else {
    const d = new Date(datum);
    if(isNaN(d)){ setFieldError("planbaar","planbaarError","Ongeldige datum."); ok=false; }
  }

  // ===== Opdracht + Indirecte uren =====
  if(!opdracht){ setFieldError("opdracht","opdrachtError","Opdracht is verplicht."); ok=false; }
  if(!indirecteUren){ setFieldError("indirecteUren","indirecteUrenError","Indirecte uren is verplicht."); ok=false; }

  // ===== Focus eerste fout =====
  if(!ok){
    const firstErr = document.querySelector("input.error, select.error, textarea.error");
    if(firstErr){
      firstErr.scrollIntoView({behavior:"smooth", block:"center"});
      firstErr.focus?.();
    }
  }
  return ok;
}


  setupNumericAndDateFields();
  renderBookings();

    // ====== LOCALSTORAGE HELPERS ======
    function getBookings() {
        try {
            const bookings = localStorage.getItem("bookings");
            return bookings ? JSON.parse(bookings) : [];
        } catch (err) {
            console.error("Fout bij lezen bookings uit localStorage:", err);
            return [];
        }
    }

    function saveBookings(bookings) {
        localStorage.setItem("bookings", JSON.stringify(bookings));
    }

    function getNextId() {
        const bookings = getBookings();
        return bookings.length > 0
            ? Math.max(...bookings.map(b => b.id)) + 1
            : 1;
    }

    // ====== WEEK/JAAR/DATUM LOGICA ======
    function getWeekNumber(d) {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = date.getUTCDay() || 7;
        date.setUTCDate(date.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    }

    function getMondayOfWeek(week, year) {
        const simple = new Date(year, 0, 1 + (week - 1) * 7);
        const dow = simple.getDay();
        const monday = new Date(simple);
        if (dow <= 4) {
            monday.setDate(simple.getDate() - simple.getDay() + 1);
        } else {
            monday.setDate(simple.getDate() + 8 - simple.getDay());
        }
        return monday;
    }

    function clearInputErrors() {
  // Verwijder foutstijlen en foutmeldingen van alle velden
  const FIELDS = [
    ["medewerker","employeeError"],
    ["klant","customerError"],
    ["weekNumber","weekNumberError"],
    ["year","yearError"],
    ["hours","hoursError"],
    ["planbaar","planbaarError"],
    ["opdracht","opdrachtError"],
    ["indirecteUren","indirecteUrenError"]
  ];

  FIELDS.forEach(([inputId, errId]) => {
    // verwijder foutmelding en rode rand
    setFieldError(inputId, errId, "");
  });
}


    function fillDefaultsWeekYearPlan() {
        const today = new Date();
        const weekNr = getWeekNumber(today);
        const year = today.getFullYear();
        const isoDate = today.toISOString().split("T")[0];

        if (weekInput) weekInput.value = weekNr;
        if (yearInput) yearInput.value = year;
        if (planDatumInput) planDatumInput.value = isoDate;

        clearInputErrors();
    }

    function updatePlanDateFromWeekYear() {
        if (!weekInput || !yearInput || !planDatumInput) return;

        let week = parseInt(weekInput.value) || 1;
        let year = parseInt(yearInput.value) || new Date().getFullYear();

        if (week < 1) week = 1;
        if (week > 52) week = 52;

        const monday = getMondayOfWeek(week, year);
        planDatumInput.value = monday.toISOString().split("T")[0];
    }

    function setupNumericAndDateFields() {
        if (weekInput) {
            weekInput.type = "number";
            weekInput.min = 1;
            weekInput.max = 52;
            weekInput.step = 1;
        }

        if (yearInput) {
            yearInput.type = "number";
            yearInput.min = 2020;
            yearInput.max = 2100;
            yearInput.step = 1;
        }

        if (planDatumInput) {
            planDatumInput.type = "date";
        }

        if (urenInput) {
            urenInput.type = "number";
            urenInput.min = 0;
            urenInput.step = 1;
        }

        [weekInput, yearInput, urenInput].forEach(el => {
            if (!el) return;
            el.addEventListener("input", () => {
                const cleaned = String(el.value).replace(/\D/g, "");
                if (el.value !== cleaned) el.value = cleaned;

                if (el === weekInput) {
                    updatePlanDateFromWeekYear();
                    if (weekError) weekError.textContent = "";
                }
                if (el === yearInput) {
                    updatePlanDateFromWeekYear();
                    if (yearError) yearError.textContent = "";
                }
                if (el === urenInput && urenError) {
                    urenError.textContent = "";
                }
            });
        });

        if (weekInput) {
            weekInput.addEventListener("keydown", (e) => {
                if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                    e.preventDefault();

                    let week = parseInt(weekInput.value || "1", 10);
                    let year = parseInt(yearInput.value || new Date().getFullYear(), 10);

                    if (e.key === "ArrowUp") {
                        if (week >= 52) {
                            week = 1;
                            year += 1;
                        } else {
                            week += 1;
                        }
                    } else {
                        if (week <= 1) {
                            week = 52;
                            year -= 1;
                        } else {
                            week -= 1;
                        }
                    }

                    weekInput.value = week;
                    yearInput.value = year;
                    if (weekError) weekError.textContent = "";
                    if (yearError) yearError.textContent = "";

                    updatePlanDateFromWeekYear();
                }
            });

            weekInput.addEventListener("blur", () => {
                let val = parseInt(weekInput.value || "0", 10);
                if (!val || val < 1 || val > 52) {
                    if (weekError) {
                        weekError.textContent = "Voer een geldig weeknummer in (1–52).";
                    }
                    if (!val || val < 1) weekInput.value = 1;
                    if (val > 52) weekInput.value = 52;
                } else if (weekError) {
                    weekError.textContent = "";
                }
                updatePlanDateFromWeekYear();
            });
        }

        if (yearInput) {
            yearInput.addEventListener("keydown", (e) => {
                if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                    e.preventDefault();
                    let cur = parseInt(yearInput.value || "0", 10);
                    cur = e.key === "ArrowUp" ? cur + 1 : cur - 1;

                    const minY = parseInt(yearInput.min, 10) || 2020;
                    const maxY = parseInt(yearInput.max, 10) || 2100;
                    cur = Math.min(Math.max(cur, minY), maxY);

                    yearInput.value = cur;
                    if (yearError) yearError.textContent = "";

                    updatePlanDateFromWeekYear();
                }
            });

            yearInput.addEventListener("blur", () => {
                let val = parseInt(yearInput.value || "0", 10);
                const minY = parseInt(yearInput.min, 10) || 2020;
                const maxY = parseInt(yearInput.max, 10) || 2100;
                if (!val || val < minY || val > maxY) {
                    if (yearError) {
                        yearError.textContent = `Voer een geldig jaar in (${minY}–${maxY}).`;
                    }
                    if (!val || val < minY) yearInput.value = minY;
                    if (val > maxY) yearInput.value = maxY;
                } else if (yearError) {
                    yearError.textContent = "";
                }
                updatePlanDateFromWeekYear();
            });
        }

        if (urenInput) {
            urenInput.addEventListener("blur", () => {
                const val = urenInput.value.trim();
                if (val === "" || !/^\d+$/.test(val)) {
                    if (urenError) urenError.textContent = "Voer een geldig aantal uren in (alleen cijfers).";
                } else if (urenError) {
                    urenError.textContent = "";
                }
            });
        }

        if (planDatumInput) {
            planDatumInput.addEventListener("change", () => {
                if (!planDatumInput.value) return;
                const selectedDate = new Date(planDatumInput.value);
                if (isNaN(selectedDate)) {
                    if (planError) planError.textContent = "Ongeldige datum.";
                    return;
                }
                if (planError) planError.textContent = "";

                const weekNr = getWeekNumber(selectedDate);
                const yr = selectedDate.getFullYear();

                if (weekInput) weekInput.value = weekNr;
                if (yearInput) yearInput.value = yr;
            });
        }
    }

    // ====== CRUD HELPERS ======

    function applyEmployeeInfo(rawBookingData) {
        // We vullen functie en team afgeleid van medewerker, maar we tonen die velden niet meer in het formulier
        const { medewerker } = rawBookingData;
        if (medewerker && medewerkersMap[medewerker]) {
            return {
                ...rawBookingData,
                functie: medewerkersMap[medewerker].functie,
                team: medewerkersMap[medewerker].team
            };
        }
        return rawBookingData;
    }

    function addBooking(data) {
        const enforced = applyEmployeeInfo(data);
        const bookings = getBookings();
        const newBooking = { id: getNextId(), ...enforced, status: "actief" };
        bookings.push(newBooking);
        saveBookings(bookings);
        return newBooking;
    }

    function updateBooking(id, data) {
        const enforced = applyEmployeeInfo(data);
        const bookings = getBookings();
        const i = bookings.findIndex(b => b.id === id);
        if (i !== -1) {
            bookings[i] = { ...bookings[i], ...enforced };
            saveBookings(bookings);
            return bookings[i];
        }
        return null;
    }

    function deleteBooking(id) {
        const bookings = getBookings().filter(b => b.id !== id);
        saveBookings(bookings);

        const totalPages = Math.max(1, Math.ceil(bookings.length / PAGE_SIZE));
        if (currentPage > totalPages) {
            currentPage = totalPages;
        }

        renderBookings();
    }

    // ====== MODAL LOGICA ======
    function openCreateModal() {
        editingId = null;
        if (boekingForm) boekingForm.reset();
        clearInputErrors();
        fillDefaultsWeekYearPlan();

        const modalTitleEl = document.getElementById("modalTitle");
        if (modalTitleEl) modalTitleEl.textContent = "Nieuwe boeking";

        if (boekingModal) {
            boekingModal.style.display = "flex";
        }
    }

    function openEditModal(booking) {
        editingId = booking.id;

        if (boekingForm) boekingForm.reset();
        clearInputErrors();

        const medewerkerEl = document.getElementById("medewerker");
        if (medewerkerEl) medewerkerEl.value = booking.medewerker || "";

        const klantEl = document.getElementById("klant");
        if (klantEl) klantEl.value = booking.klant || "";

        if (urenInput) urenInput.value = booking.uren ?? "";
        if (planDatumInput) planDatumInput.value = booking.planDatum || "";

        const indirecteUrenEl = document.getElementById("indirecteUren");
        if (indirecteUrenEl) indirecteUrenEl.value = booking.indirecteUren || "";

        const opdrachtEl = document.getElementById("opdracht");
        if (opdrachtEl) opdrachtEl.value = booking.opdracht || "";

        if (booking.planDatum) {
            const d = new Date(booking.planDatum);
            if (!isNaN(d)) {
                if (weekInput) weekInput.value = getWeekNumber(d);
                if (yearInput) yearInput.value = d.getFullYear();
            }
        }

        const modalTitleEl = document.getElementById("modalTitle");
        if (modalTitleEl) modalTitleEl.textContent = "Boeking bewerken";

        if (boekingModal) {
            boekingModal.style.display = "flex";
        }
    }

    function closeBookingModal() {
        if (boekingModal) boekingModal.style.display = "none";
        if (boekingForm) boekingForm.reset();
        clearInputErrors();
        editingId = null;
    }

    if (boekingModalContent) {
        boekingModalContent.addEventListener("click", (e) => {
            e.stopPropagation();
        });
    }

    if (closeModalBtn) closeModalBtn.addEventListener("click", closeBookingModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeBookingModal);
    if (addEmployeeBtn) addEmployeeBtn.addEventListener("click", openCreateModal);

    // ====== FILTER LOGICA ======
    function normalize(str) {
    return (str || "")
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "");          // spaties eruit voor vergelijkingen als "Jan de Vries" vs "JandeVries"
}

function getFilteredBookings() {
    const all = getBookings();

    const term = (searchText || "").toLowerCase().trim();

    return all.filter(b => {
        // --- vrije zoekterm door alle zichtbare kolommen ---
        if (term) {
            const d = new Date(b.planDatum);
            const week = !isNaN(d) ? getWeekNumber(d) : "";
            const year = !isNaN(d) ? d.getFullYear() : "";

            const haystack = [
                year,
                week,
                b.uren,
                b.indirecteUren,
                b.opdracht,
                b.medewerker,
                b.functie,
                b.team,
                b.klant
            ]
                .map(x => (x ?? "").toString().toLowerCase())
                .join(" ");

            if (!haystack.includes(term)) {
                return false;
            }
        }

        // === FILTER "Geboekt op" ===
        // geboektFilter moet matchen met b.indirecteUren
        // Voorbeeld: filterStatus = "InterneProjecten"
        //            b.indirecteUren = "Interne projecten"
        // normalize() haalt spaties weg en lowercaset, dus dit gaat gelijk zijn
        if (filterStatus) {
            // alleen filteren als dit niet de default-optie is
            const wanted = normalize(filterStatus);
            const actual = normalize(b.indirecteUren);
            if (wanted && wanted !== "" && wanted !== "geboektop") {
                if (actual !== wanted) {
                    return false;
                }
            }
        }

        // === FILTER "Medewerker" ===
        // medewerkerFilter = "JandeVries"
        // b.medewerker     = "Jan de Vries"
        // normalize → beide "jandevries"
        if (filterMedewerker) {
            const wanted = normalize(filterMedewerker);
            const actual = normalize(b.medewerker);
            if (wanted && wanted !== "" && wanted !== "allemedewerkers") {
                if (actual !== wanted) {
                    return false;
                }
            }
        }

        // === FILTER "Functie" ===
        // Hier zie ik dat jouw functieFilter values al lijken op echte functienamen (Manager, IT, Extern, ...)
        // en je seedBookings bevat bijv. "Manager", "Assistent manager", "Extern", "IT"
        // Let op: "Assistent manager" vs value="AssistentManager"
        // We normaliseren hier ook
        if (filterFunctie) {
            const wanted = normalize(filterFunctie);
            const actual = normalize(b.functie);
            if (wanted && wanted !== "" && wanted !== "allefuncties") {
                if (actual !== wanted) {
                    return false;
                }
            }
        }

        // === FILTER "Team" ===
        // teamFilter values zijn al exact gelijk aan je seedTeams: "Limburg", "Brabant", ...
        // maar we normaliseren alsnog voor zekerheid
        if (filterTeam) {
            const wanted = normalize(filterTeam);
            const actual = normalize(b.team);
            if (wanted && wanted !== "" && wanted !== "alleteams") {
                if (actual !== wanted) {
                    return false;
                }
            }
        }

        return true;
    });
}


    // ====== PAGINATION UI ======
    function renderPagination(totalItems, totalPages) {
        if (!paginationContainer) return;

        // we bouwen géén pijltjes meer hier, HTML houdt alleen tekst
        paginationContainer.innerHTML = `
            <div class="pagination-inner">
                <button class="page-prev" ${currentPage === 1 ? "disabled" : ""}>Vorige</button>
                <span class="page-info">Pagina ${currentPage} van ${totalPages}</span>
                <button class="page-next" ${currentPage === totalPages ? "disabled" : ""}>Volgende</button>
            </div>
        `;

        const prevBtn = paginationContainer.querySelector(".page-prev");
        const nextBtn = paginationContainer.querySelector(".page-next");

        if (prevBtn) {
            prevBtn.addEventListener("click", () => {
                if (currentPage > 1) {
                    currentPage -= 1;
                    renderBookings();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", () => {
                if (currentPage < totalPages) {
                    currentPage += 1;
                    renderBookings();
                }
            });
        }
    }

    // ====== RENDER BOOKINGS TABEL ======
    function renderBookings() {
        // (optioneel) laat zien dat we laden → voor nu: kort even niet nodig
        if (loadingOverlay) loadingOverlay.style.display = "none";

        const filtered = getFilteredBookings()
            .slice()
            .sort((a, b) => new Date(a.planDatum) - new Date(b.planDatum));

        const totalItems = filtered.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

        // clamp currentPage binnen bereik
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        const pageItems = filtered.slice(startIndex, endIndex);

        tableBody.innerHTML = "";

        pageItems.forEach(b => {
            const d = new Date(b.planDatum);
            const rowWeek = !isNaN(d) ? getWeekNumber(d) : "-";
            const rowYear = !isNaN(d) ? d.getFullYear() : "-";

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${rowYear ?? "-"}</td>
                <td>${rowWeek ?? "-"}</td>
                <td>${b.uren ?? "-"}</td>
                <td>${b.indirecteUren ?? "-"}</td>
                <td>${b.opdracht ?? "-"}</td>
                <td>${b.medewerker ?? "-"}</td>
                <td>${b.functie ?? "-"}</td>
                <td>${b.team ?? "-"}</td>
                <td class="actions">
                    <div class="action-buttons">
                        <button class="btn-action btn-edit" data-id="${b.id}" title="Bewerken">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            <span>Bewerken</span>
                        </button>
                        <button class="btn-action btn-delete" data-id="${b.id}" title="Verwijderen">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>Verwijderen</span>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // toon/verberg "geen resultaten"
        if (noResultsEl) {
            noResultsEl.style.display = pageItems.length === 0 ? "block" : "none";
        }

        // update pagination
        renderPagination(totalItems, totalPages);
    }

    // ====== CONFIRM MODAL (VERWIJDEREN) ======
    function showConfirmDelete(id) {
        if (!confirmModal) return;

        if (confirmTitle) confirmTitle.textContent = "Boeking verwijderen";
        if (confirmMessage) confirmMessage.textContent = "Weet je zeker dat je deze boeking wilt verwijderen?";
        if (confirmDetails) confirmDetails.style.display = "none";
        if (confirmBtn) {
            confirmBtn.textContent = "Verwijderen";
            confirmBtn.className = "btn btn-danger";
        }

        confirmModal.style.display = "flex";
    }

    function closeConfirmModal() {
        if (confirmModal) confirmModal.style.display = "none";
        pendingDeleteId = null;
    }

    if (confirmBtn) {
        confirmBtn.addEventListener("click", () => {
            if (pendingDeleteId != null) {
                deleteBooking(pendingDeleteId);
                showSuccessNotification("Boeking verwijderd.");
            }
            closeConfirmModal();
        });
    }

    if (closeConfirmModalBtn) closeConfirmModalBtn.addEventListener("click", closeConfirmModal);
    if (cancelConfirmBtn) cancelConfirmBtn.addEventListener("click", closeConfirmModal);

    if (confirmModal) {
        const confirmContent = confirmModal.querySelector(".modal-content");
        if (confirmContent) {
            confirmContent.addEventListener("click", (e) => {
                e.stopPropagation();
            });
        }
    }

    // ====== SUCCESS TOAST ======
    function showSuccessNotification(message) {
        if (!successNotification) return;
        successNotification.style.display = "flex";
        if (successMessage) successMessage.textContent = message;

        setTimeout(() => {
            successNotification.style.display = "none";
        }, 3000);
    }

    if (closeSuccessNotificationBtn) {
        closeSuccessNotificationBtn.addEventListener("click", () => {
            if (successNotification) successNotification.style.display = "none";
        });
    }

    // ====== ZOEKBARE DROPDOWNS (form) ======
    setupDropdown("medewerker", "medewerkerDropdown");
    setupDropdown("klant", "klantDropdown");

    function setupDropdown(inputId, dropdownId) {
        const input = document.getElementById(inputId);
        const dropdown = document.getElementById(dropdownId);
        if (!input || !dropdown) return;

        const items = dropdown.querySelectorAll(".suggestion-item");

        input.addEventListener("focus", () => {
            dropdown.style.display = "block";
        });

        input.addEventListener("input", () => {
            const filter = input.value.toLowerCase();
            let visible = false;
            items.forEach(item => {
                const match = item.textContent.toLowerCase().includes(filter);
                item.style.display = match ? "block" : "none";
                if (match) visible = true;
            });
            dropdown.style.display = visible ? "block" : "none";
        });

        items.forEach(item => {
            item.addEventListener("click", () => {
                input.value = item.textContent;
                dropdown.style.display = "none";
            });
        });

        document.addEventListener("click", (e) => {
            if (!dropdown.contains(e.target) && e.target !== input) {
                dropdown.style.display = "none";
            }
        });
    }

    // ====== HEADER DROPDOWNS ======
    const dropdowns = document.querySelectorAll('.dropdown');
    const accountBtn = document.getElementById('accountBtn');
    const accountDropdown = document.querySelector('.account-dropdown');

    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        if (!toggle) return;
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            dropdowns.forEach(d => { if (d !== dropdown) d.classList.remove('active'); });
            dropdown.classList.toggle('active');
        });
    });

    if (accountBtn) {
        accountBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (accountDropdown) {
                accountDropdown.classList.toggle('active');
            }
        });
    }

    document.addEventListener('click', function() {
        dropdowns.forEach(d => d.classList.remove('active'));
        if (accountDropdown) accountDropdown.classList.remove('active');
    });

    document.querySelectorAll('.dropdown-menu, .account-menu').forEach(menu => {
        menu.addEventListener('click', e => e.stopPropagation());
    });


    



    // ====== FORM SUBMIT (OPSLAAN) ======
    if (boekingForm) {
            boekingForm.addEventListener("submit", (e) => {
            e.preventDefault();

            // BELANGRIJK: eerst valideren
            if (!validateBookingFormBeforeSave()) {
                return; // stop opslaan; foutmeldingen staan onder de velden
            }

            const medewerkerEl = document.getElementById("medewerker");
            const klantEl = document.getElementById("klant");
            const opdrachtEl = document.getElementById("opdracht");
            const indirecteUrenEl = document.getElementById("indirecteUren");

            const medewerker = medewerkerEl ? medewerkerEl.value.trim() : "";
            const klant = klantEl ? klantEl.value.trim() : "";
            const urenRaw = urenInput ? urenInput.value.trim() : "";
            const uren = parseInt(urenRaw, 10);
            const planDatum = planDatumInput ? planDatumInput.value : "";
            const opdracht = opdrachtEl ? opdrachtEl.value : "";
            const indirecteUren = indirecteUrenEl ? indirecteUrenEl.value : "";

            const bookingData = {
                medewerker,
                klant,
                uren,
                planDatum,
                opdracht,
                indirecteUren
            };

            if (editingId) {
                updateBooking(editingId, bookingData);
                showSuccessNotification("Boeking succesvol bijgewerkt!");
            } else {
                addBooking(bookingData);
                showSuccessNotification("Boeking succesvol toegevoegd!");
                currentPage = 1; // nieuwe boeking laten zien vanaf pagina 1
            }

            closeBookingModal();
            renderBookings();
        });
    } else {
        console.error("boekingForm niet gevonden - submit handler niet geregistreerd");
    }

    // ====== SEED DATA ======
    (function ensureDefaultBookings() {
        const existing = getBookings();
        if (existing.length && existing.some(b => b && b.id != null)) {
            return;
        }

        const seedBookings = [
            {
                id: 1,
                medewerker: "Jan de Vries",
                klant: "Stef Smeets",
                uren: 40,
                planDatum: "2025-10-27",
                functie: "Manager",
                opdracht: "Overig",
                indirecteUren: "Feestdag",
                team: "Limburg",
                status: "actief"
            },
            {
                id: 2,
                medewerker: "Lisa Janssen",
                klant: "Zara Verheij",
                uren: 32,
                planDatum: "2025-10-28",
                functie: "Assistent manager",
                opdracht: "Inventarisatie",
                indirecteUren: "Ziek",
                team: "Brabant",
                status: "actief"
            },
            {
                id: 3,
                medewerker: "Tom Peters",
                klant: "Zara Verheij",
                uren: 24,
                planDatum: "2025-10-29",
                functie: "Extern",
                opdracht: "Interem",
                indirecteUren: "Vaktechniek",
                team: "Healthcare",
                status: "actief"
            },
            {
                id: 4,
                medewerker: "Sara Willems",
                klant: "Willem de Jong",
                uren: 16,
                planDatum: "2025-11-03",
                functie: "Stagiair",
                opdracht: "Balanscontrole",
                indirecteUren: "Zwangerschapsverlof",
                team: "Noord-Holland",
                status: "actief"
            },
            {
                id: 5,
                medewerker: "Rik van den Berg",
                klant: "Jasper van Dijk",
                uren: 36,
                planDatum: "2025-11-04",
                functie: "IT",
                opdracht: "Balanscontrole",
                indirecteUren: "Overig",
                team: "Zuid-Holland",
                status: "actief"
            },
            {
                id: 6,
                medewerker: "Stefan de Vries",
                klant: "Jasper van Dijk",
                uren: 12,
                planDatum: "2025-11-05",
                functie: "Stagiair",
                opdracht: "Bijzondere verklaring",
                indirecteUren: "Parttime",
                team: "Limburg",
                status: "actief"
            }
        ];

        saveBookings(seedBookings);
    })();

    // ====== INIT FLOW ======
    setupNumericAndDateFields();
    renderBookings();

    // ====== GLOBAL CLICK HANDLER (bewerken / verwijderen knoppen in tabel) ======
    document.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;

        const id = parseInt(btn.dataset.id, 10);
        if (Number.isNaN(id)) return;

        if (btn.classList.contains("btn-edit")) {
            const bookings = getBookings();
            const b = bookings.find(x => x.id === id);
            if (!b) return;
            openEditModal(b);
            return;
        }

        if (btn.classList.contains("btn-delete")) {
            pendingDeleteId = id;
            showConfirmDelete(id);
            return;
        }
    });

    // ====== EVENT LISTENERS VOOR FILTER UI ======

    // zoekbalk (live zoeken)
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            searchText = searchInput.value;
            currentPage = 1;
            renderBookings();
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            searchText = "";
            currentPage = 1;
            renderBookings();
        });
    }

    // status filter
    if (geboektFilter) {
        geboektFilter.addEventListener("change", () => {
            filterStatus = geboektFilter.value || "";
            currentPage = 1;
            renderBookings();
        });
    }

    // medewerker filter -> we filteren op exacte medewerker naam
    if (medewerkerFilter) {
        medewerkerFilter.addEventListener("change", () => {
            filterMedewerker = medewerkerFilter.value || "";
            currentPage = 1;
            renderBookings();
        });
    }

    // functie filter
    if (functieFilter) {
        functieFilter.addEventListener("change", () => {
            filterFunctie = functieFilter.value || "";
            currentPage = 1;
            renderBookings();
        });
    }

    // team filter
    if (teamFilter) {
        teamFilter.addEventListener("change", () => {
            filterTeam = teamFilter.value || "";
            currentPage = 1;
            renderBookings();
        });
    }

    // "Filters wissen" knop
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener("click", () => {
            filterStatus = "";
            filterMedewerker = "";
            filterFunctie = "";
            filterTeam = "";

            if (geboektFilter) geboektFilter.value = "";
            if (medewerkerFilter) medewerkerFilter.value = "";
            if (functieFilter) functieFilter.value = "";
            if (teamFilter) teamFilter.value = "";

            currentPage = 1;
            renderBookings();
        });
    }

    // "Alle filters wissen" in no-results card
    if (clearAllFiltersBtn) {
        clearAllFiltersBtn.addEventListener("click", () => {
            searchText = "";
            filterStatus = "";
            filterMedewerker = "";
            filterFunctie = "";
            filterTeam = "";

            if (searchInput) searchInput.value = "";
            if (geboektFilter) geboektFilter.value = "";
            if (medewerkerFilter) medewerkerFilter.value = "";
            if (functieFilter) functieFilter.value = "";
            if (teamFilter) teamFilter.value = "";

            currentPage = 1;
            renderBookings();
        });
    }

    // Exporteren naar Excel
    // === EXPORTEREN NAAR EXCEL ===
const exportBtn = document.getElementById("ExportExcelBtn");
if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    const bookings = getBookings();
    if (!bookings || bookings.length === 0) {
      alert("Er zijn geen boekingen om te exporteren.");
      return;
    }

    // Boekingen klaarmaken voor Excel
    const exportData = bookings.map(b => ({
      Jaar: new Date(b.planDatum).getFullYear() || "",
      Week: (() => {
        const d = new Date(b.planDatum);
        if (isNaN(d)) return "";
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = date.getUTCDay() || 7;
        date.setUTCDate(date.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
      })(),
      Uren: b.uren ?? "",
      "Indirecte uren": b.indirecteUren ?? "",
      Opdracht: b.opdracht ?? "",
      Medewerker: b.medewerker ?? "",
      Functie: b.functie ?? "",
      Team: b.team ?? "",
      Status: b.status ?? ""
    }));

    // Workbook aanmaken
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Boekingen");

    // Bestand downloaden
    const today = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `Boekingen_${today}.xlsx`);
  });

  // Bestand downloaden
const today = new Date().toISOString().split("T")[0];
XLSX.writeFile(wb, `Boekingen_${today}.xlsx`);

// ✅ Toon succesmelding
showSuccessNotification("Boekingen succesvol geëxporteerd naar Excel!");
}

});
