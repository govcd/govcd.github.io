/* ============================================================
   GOVCD Portal Engine — portal.js
   Matching #datascaping/dcdata design and features
   ============================================================ */

'use strict';

const CONFIG = {
  PIN: '329874',
  AUTH_KEY: 'govcd_auth',
  PAGE_SIZE: 150,
};

const COLLEGES = [
  { code: 'dc',    short: 'DC',    name: 'Dhaka College',                       icon: 'fa-building-columns' },
  { code: 'ctg',   short: 'CTG',   name: 'Chittagong College',                  icon: 'fa-graduation-cap' },
  { code: 'bbggc', short: 'BBGGC', name: 'Begum Badrunnessa Govt Girls College', icon: 'fa-female' },
  { code: 'gsc',   short: 'GSC',   name: 'Govt. Science College',               icon: 'fa-flask' },
  { code: 'bc',    short: 'BC',    name: 'Govt. Bangla College',                 icon: 'fa-book-open' },
  { code: 'knc',   short: 'KNC',   name: 'Kabi Nazrul Govt. College',            icon: 'fa-feather' },
  { code: 'sgc',   short: 'SGC',   name: 'Savar Govt. College',                  icon: 'fa-graduation-cap' },
];

const ALL_BATCHES = [
  { key: 'hsc28', label: '28', fullLabel: 'HSC-28', session: '2026-2027' },
  { key: 'hsc27', label: '27', fullLabel: 'HSC-27', session: '2025-2026' },
  { key: 'hsc26', label: '26', fullLabel: 'HSC-26', session: '2024-2025' },
  { key: 'hsc25', label: '25', fullLabel: 'HSC-25', session: '2023-2024' },
  { key: 'hsc24', label: '24', fullLabel: 'HSC-24', session: '2022-2023' },
  { key: 'hsc23', label: '23', fullLabel: 'HSC-23', session: '2021-2022' },
  { key: 'hsc22', label: '22', fullLabel: 'HSC-22', session: '2020-2021' },
  { key: 'hsc21', label: '21', fullLabel: 'HSC-21', session: '2019-2020' },
  { key: 'hsc20', label: '20', fullLabel: 'HSC-20', session: '2018-2019' },
  { key: 'hsc19', label: '19', fullLabel: 'HSC-19', session: '2017-2018' },
];

const state = {
  collegeCode: 'dc',
  collegeName: 'Dhaka College',
  currentBatch: null,
  batches: [],
  allStudents: [],
  filteredStudents: [],
  currentPage: 1,
  pageSize: 150,
  currentView: 'photos', // 'photos' (default), 'compact', 'table'
  isLoading: false,

  // Advanced Filters State
  filters: {
    gender: 'all',
    group: 'all',
    section: 'all',
    district: 'all',
    board: 'all',
    religion: 'all',
    bloodGroup: 'all',
    quota: 'all',
    sscYear: 'all',
    presentDistrict: 'all',
    permanentDistrict: 'all',
    fourthSubject: 'all',
    electiveSubject: 'all',
    gpa: 'all',
    bookmarkedOnly: false,
  }
};

const $ = id => document.getElementById(id);

/* ── PIN AUTHENTICATION (329874) ────────────────────────── */
function initAuth() {
  const overlay = $('authOverlay');
  if (!overlay) return;
  const input = $('authPinInput');
  const btn = $('authSubmitBtn');
  const err = $('authErrMsg');

  function checkPin() {
    if (!input) return;
    const rawVal = input.value || '';
    // Normalize Bengali digits (০-৯) to standard English digits (0-9)
    const val = rawVal.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d)).trim();

    if (!val) {
      if (err) {
        err.innerHTML = '<i class="fa-solid fa-circle-info" style="margin-right:4px;"></i> Please enter the access PIN.';
        err.classList.add('show');
        err.style.display = 'block';
      }
      input.classList.add('error');
      input.focus();
      setTimeout(() => input.classList.remove('error'), 400);
      return;
    }

    if (val === CONFIG.PIN) {
      sessionStorage.setItem(CONFIG.AUTH_KEY, 'ok');
      localStorage.setItem(CONFIG.AUTH_KEY, 'ok');
      overlay.classList.add('unlocked');
      if (err) {
        err.classList.remove('show');
        err.style.display = 'none';
      }
      showToast('Portal Unlocked Successfully');
    } else {
      input.classList.add('error');
      if (err) {
        err.innerHTML = '<i class="fa-solid fa-circle-exclamation" style="margin-right:4px;"></i> Incorrect PIN! Please try again.';
        err.classList.add('show');
        err.style.display = 'block';
      }
      setTimeout(() => input.classList.remove('error'), 400);
      input.value = '';
      input.focus();
    }
  }

  // Bind events unconditionally so locking and re-unlocking always works
  if (btn && !btn.dataset.bound) {
    btn.dataset.bound = 'true';
    btn.addEventListener('click', checkPin);
  }
  if (input && !input.dataset.bound) {
    input.dataset.bound = 'true';
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        checkPin();
      }
    });
    input.addEventListener('input', () => {
      if (err) {
        err.classList.remove('show');
        err.style.display = 'none';
      }
      input.classList.remove('error');
    });
  }

  // Check stored auth
  const isAuth = sessionStorage.getItem(CONFIG.AUTH_KEY) === 'ok' || localStorage.getItem(CONFIG.AUTH_KEY) === 'ok';
  if (isAuth) {
    overlay.classList.add('unlocked');
  } else {
    overlay.classList.remove('unlocked');
    if (input) setTimeout(() => input.focus(), 150);
  }
}
window.initAuth = initAuth;

function lockPortal() {
  sessionStorage.removeItem(CONFIG.AUTH_KEY);
  localStorage.removeItem(CONFIG.AUTH_KEY);
  const overlay = $('authOverlay');
  if (overlay) {
    overlay.classList.remove('unlocked');
    const input = $('authPinInput');
    const err = $('authErrMsg');
    if (err) {
      err.classList.remove('show');
      err.style.display = 'none';
    }
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 150);
    }
  }
  showToast('Portal Locked');
}
window.lockPortal = lockPortal;

/* ── THEME TOGGLE ────────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem('govcd_theme') || 'dark';
  applyTheme(saved);
  const btn = $('themeToggleBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark') ||
                     document.documentElement.getAttribute('data-theme') === 'dark';
      const next = isDark ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('govcd_theme', next);
    });
  }
}

function applyTheme(theme) {
  const btn = $('themeToggleBtn');
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-moon"></i>';
  }
}

/* ── COLLEGE & BATCH SWITCHERS (HOVER & CLICK STABLE) ────── */
function buildSwitchers(activeCollegeCode, activeBatchKey) {
  buildCollegeSwitcher(activeCollegeCode);
  buildBatchSwitcher(activeBatchKey);
}

function buildCollegeSwitcher(activeCode) {
  const wrap = $('collegeSwitcherWrap');
  const btnText = $('collegeBtnText');
  const menu = $('collegeSwitcherMenu');
  if (!wrap || !menu) return;

  const current = COLLEGES.find(c => c.code === activeCode) || COLLEGES[0];
  if (btnText) btnText.innerHTML = `<i class="fa-solid ${current.icon}"></i> ${current.short} <i class="fa-solid fa-chevron-down" style="font-size:9px;margin-left:2px;"></i>`;

  menu.innerHTML = `
    <div class="switcher-menu-hdr">Select Government College</div>
    ${COLLEGES.map(c => `
      <a class="switcher-item ${c.code === activeCode ? 'active' : ''}" data-college="${c.code}" href="../${c.code}/index.html">
        <span><i class="fa-solid ${c.icon}" style="margin-right:7px;opacity:.7;"></i>${c.name}</span>
        <span class="s-badge">${c.short}</span>
      </a>
    `).join('')}
  `;

  setupSwitcherStability(wrap);
}

function buildBatchSwitcher(activeBatchKey) {
  const wrap = $('batchSwitcherWrap');
  const btnText = $('batchBtnText');
  const menu = $('batchSwitcherMenu');
  if (!wrap || !menu) return;

  const current = state.batches.find(b => b.key === activeBatchKey) || state.batches[0] || ALL_BATCHES[0];
  // Displays only the number (e.g. 27 or 26) as requested
  if (btnText) btnText.innerHTML = `<i class="fa-solid fa-graduation-cap"></i> ${current.label} <i class="fa-solid fa-chevron-down" style="font-size:9px;margin-left:2px;"></i>`;

  menu.innerHTML = `
    <div class="switcher-menu-hdr">Select Admission Batch</div>
    ${state.batches.map(b => `
      <div class="switcher-item ${b.key === (state.currentBatch?.key || activeBatchKey) ? 'active' : ''}" data-batch="${b.key}">
        <span><i class="fa-solid fa-calendar-days" style="margin-right:7px;opacity:.7;"></i>HSC-${b.label}</span>
        <span class="s-badge">${b.session || ''}</span>
      </div>
    `).join('')}
  `;

  setupSwitcherStability(wrap);

  menu.querySelectorAll('.switcher-item').forEach(item => {
    item.onclick = async function(e) {
      e.stopPropagation();
      const bKey = item.dataset.batch;
      const targetBatch = state.batches.find(b => b.key === bKey);
      if (targetBatch) {
        wrap.classList.remove('open');
        await switchBatch(targetBatch);
      }
    };
  });
}

function setupSwitcherStability(wrap) {
  let leaveTimer = null;
  const btn = wrap.querySelector('.switcher-btn');

  // Toggle on click
  if (btn) {
    btn.onclick = function(e) {
      e.stopPropagation();
      const isOpen = wrap.classList.contains('open');
      document.querySelectorAll('.switcher-wrap').forEach(w => w.classList.remove('open'));
      if (!isOpen) wrap.classList.add('open');
    };
  }

  // Hover stability with delay buffer
  wrap.onmouseenter = function() {
    clearTimeout(leaveTimer);
  };
  wrap.onmouseleave = function() {
    leaveTimer = setTimeout(() => {
      wrap.classList.remove('open');
    }, 280); // 280ms bridge prevents premature closing
  };
}

document.addEventListener('click', () => {
  document.querySelectorAll('.switcher-wrap').forEach(w => w.classList.remove('open'));
});

/* ── SWITCH BATCH ────────────────────────────────────────── */
async function switchBatch(batch) {
  state.currentBatch = batch;
  state.currentPage = 1;
  const btnText = $('batchBtnText');
  if (btnText) btnText.innerHTML = `<i class="fa-solid fa-graduation-cap"></i> ${batch.label} <i class="fa-solid fa-chevron-down" style="font-size:9px;margin-left:2px;"></i>`;
  buildBatchSwitcher(batch.key);

  showLoadingState();
  const data = await fetchBatchData(batch.jsonUrl);
  data.forEach(s => {
    if (s.ssc_board) s.ssc_board = normalizeBoardName(s.ssc_board, s.ssc_gpa);
  });
  state.allStudents = data;
  state.filteredStudents = data;

  populateFilterDropdowns(data);
  populateAdvancedFilterModal(data);
  applyFilters();
  updateHeaderStats();
}

async function fetchBatchData(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('Batch data not loaded for:', url, err);
    return [];
  }
}

function showLoadingState() {
  const container = $('viewsContainer');
  if (container) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--text-muted);">
        <i class="fa-solid fa-circle-notch fa-spin fa-2x" style="color:var(--accent);margin-bottom:12px;"></i>
        <p style="font-weight:600;font-size:14px;">Loading student records...</p>
      </div>
    `;
  }
}

/* ── SEARCH & FILTERS ────────────────────────────────────── */
function setupSearchAndFilters() {
  const sInput = $('searchInput');
  const clearBtn = $('clearSearchBtn');
  const gSelect = $('groupFilter');
  const secSelect = $('sectionFilter');

  if (sInput) {
    let timer = null;
    sInput.addEventListener('input', () => {
      if (clearBtn) clearBtn.style.display = sInput.value ? 'block' : 'none';
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.currentPage = 1;
        applyFilters();
      }, 200);
    });
  }

  if (clearBtn && sInput) {
    clearBtn.addEventListener('click', () => {
      sInput.value = '';
      clearBtn.style.display = 'none';
      state.currentPage = 1;
      applyFilters();
      sInput.focus();
    });
  }

  if (gSelect) {
    gSelect.addEventListener('change', () => {
      state.filters.group = gSelect.value;
      const mGroup = $('fModalGroup');
      if (mGroup) mGroup.value = gSelect.value;
      state.currentPage = 1;
      applyFilters();
    });
  }

  if (secSelect) {
    secSelect.addEventListener('change', () => {
      state.filters.section = secSelect.value;
      const mSec = $('fModalSection');
      if (mSec) mSec.value = secSelect.value;
      state.currentPage = 1;
      applyFilters();
    });
  }

  // Keyboard shortcut Ctrl+K / Cmd+K or '/' to search
  document.addEventListener('keydown', e => {
    const isSearchKey = ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') ||
                        (e.key === '/' && document.activeElement !== sInput);
    if (isSearchKey) {
      if (!$('modalBackdrop')?.classList.contains('show') && !$('filterModalBackdrop')?.classList.contains('show')) {
        e.preventDefault();
        sInput?.focus();
        sInput?.select();
      }
    }
  });

  // Bookmarks filter button in toolbar
  const bmFilterBtn = $('filterBookmarksBtn');
  if (bmFilterBtn) {
    bmFilterBtn.addEventListener('click', () => {
      state.filters.bookmarkedOnly = !state.filters.bookmarkedOnly;
      bmFilterBtn.classList.toggle('active', state.filters.bookmarkedOnly);
      state.currentPage = 1;
      applyFilters();
    });
  }

  setupFilterModal();
}

/* ── ADVANCED FILTER MODAL WINDOW ────────────────────────── */
function setupFilterModal() {
  const openBtn = $('openFilterModalBtn');
  const bd = $('filterModalBackdrop');
  const closeBtn = $('closeFilterModalBtn');
  const resetBtn = $('resetFiltersBtn');
  const applyBtn = $('applyFiltersBtn');

  if (openBtn && bd) {
    openBtn.addEventListener('click', () => {
      updateFilterModalMatchCount();
      bd.classList.add('show');
    });
  }

  if (closeBtn && bd) closeBtn.addEventListener('click', () => bd.classList.remove('show'));
  if (bd) bd.addEventListener('click', e => { if (e.target === bd) bd.classList.remove('show'); });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetAllFilters();
      updateFilterModalMatchCount();
    });
  }

  if (applyBtn && bd) {
    applyBtn.addEventListener('click', () => {
      // Read values from modal inputs
      state.filters.gender = $('fModalGender')?.value || 'all';
      state.filters.group = $('fModalGroup')?.value || 'all';
      state.filters.section = $('fModalSection')?.value || 'all';
      state.filters.district = $('fModalDistrict')?.value || 'all';
      state.filters.presentDistrict = $('fModalPresentDistrict')?.value || 'all';
      state.filters.permanentDistrict = $('fModalPermanentDistrict')?.value || 'all';
      state.filters.board = $('fModalBoard')?.value || 'all';
      state.filters.religion = $('fModalReligion')?.value || 'all';
      state.filters.bloodGroup = $('fModalBloodGroup')?.value || 'all';
      state.filters.quota = $('fModalQuota')?.value || 'all';
      state.filters.sscYear = $('fModalSscYear')?.value || 'all';
      state.filters.fourthSubject = $('fModalFourthSubject')?.value || 'all';
      state.filters.electiveSubject = $('fModalElectiveSubject')?.value || 'all';
      state.filters.gpa = $('fModalGpa')?.value || 'all';

      // Sync quick selects
      if ($('groupFilter')) $('groupFilter').value = state.filters.group;
      if ($('sectionFilter')) $('sectionFilter').value = state.filters.section;

      bd.classList.remove('show');
      state.currentPage = 1;
      applyFilters();
    });
  }

  // Live match counter when changing options inside modal
  document.querySelectorAll('#filterModalCard .f-input').forEach(inp => {
    inp.addEventListener('change', updateFilterModalMatchCount);
  });
}

function updateFilterModalMatchCount() {
  const g = $('fModalGender')?.value || state.filters.gender;
  const grp = $('fModalGroup')?.value || state.filters.group;
  const sec = $('fModalSection')?.value || state.filters.section;
  const dist = $('fModalDistrict')?.value || state.filters.district;
  const presDist = $('fModalPresentDistrict')?.value || state.filters.presentDistrict;
  const permDist = $('fModalPermanentDistrict')?.value || state.filters.permanentDistrict;
  const brd = $('fModalBoard')?.value || state.filters.board;
  const rel = $('fModalReligion')?.value || state.filters.religion;
  const bg = $('fModalBloodGroup')?.value || state.filters.bloodGroup;
  const qta = $('fModalQuota')?.value || state.filters.quota;
  const yr = $('fModalSscYear')?.value || state.filters.sscYear;
  const s4th = $('fModalFourthSubject')?.value || state.filters.fourthSubject;
  const selec = $('fModalElectiveSubject')?.value || state.filters.electiveSubject;
  const gpa = $('fModalGpa')?.value || state.filters.gpa;

  const count = state.allStudents.filter(s => matchStudentFilters(s, {
    gender: g, group: grp, section: sec, district: dist,
    presentDistrict: presDist, permanentDistrict: permDist,
    board: brd, religion: rel, bloodGroup: bg, quota: qta, sscYear: yr,
    fourthSubject: s4th, electiveSubject: selec, gpa: gpa,
    bookmarkedOnly: state.filters.bookmarkedOnly
  })).length;

  const countEl = $('filterModalMatchCount');
  if (countEl) countEl.textContent = count.toLocaleString();
}

function resetAllFilters() {
  state.filters = {
    gender: 'all', group: 'all', section: 'all', district: 'all',
    board: 'all', religion: 'all', bloodGroup: 'all', quota: 'all', sscYear: 'all',
    presentDistrict: 'all', permanentDistrict: 'all', fourthSubject: 'all',
    electiveSubject: 'all', gpa: 'all', bookmarkedOnly: false,
  };
  ['fModalGender','fModalGroup','fModalSection','fModalDistrict','fModalBoard',
   'fModalReligion','fModalBloodGroup','fModalQuota','fModalSscYear',
   'fModalPresentDistrict','fModalPermanentDistrict','fModalFourthSubject',
   'fModalElectiveSubject','fModalGpa'].forEach(id => {
    const el = $(id);
    if (el) el.value = 'all';
  });
  if ($('groupFilter')) $('groupFilter').value = 'all';
  if ($('sectionFilter')) $('sectionFilter').value = 'all';
  const bmFilterBtn = $('filterBookmarksBtn');
  if (bmFilterBtn) bmFilterBtn.classList.remove('active');
  state.currentPage = 1;
  applyFilters();
}

function populateFilterDropdowns(data) {
  const groups = [...new Set(data.map(s => s.group_name).filter(Boolean))].sort();
  const sections = [...new Set(data.map(s => s.section).filter(Boolean))].sort();

  const gSel = $('groupFilter');
  if (gSel) {
    gSel.innerHTML = '<option value="all">All Groups</option>' +
      groups.map(g => `<option value="${g}">${g}</option>`).join('');
  }

  const sSel = $('sectionFilter');
  if (sSel) {
    sSel.innerHTML = '<option value="all">All Sections</option>' +
      sections.map(s => `<option value="${s}">Section ${s}</option>`).join('');
  }
}

function populateAdvancedFilterModal(data) {
  const groups = [...new Set(data.map(s => s.group_name).filter(Boolean))].sort();
  const sections = [...new Set(data.map(s => s.section).filter(Boolean))].sort();
  const districts = [...new Set(data.flatMap(s => [s.present_district, s.permanent_district]).filter(Boolean).map(x => x.trim()))].sort();
  const presDistricts = [...new Set(data.map(s => s.present_district).filter(Boolean).map(x => x.trim()))].sort();
  const permDistricts = [...new Set(data.map(s => s.permanent_district).filter(Boolean).map(x => x.trim()))].sort();
  const boards = [...new Set(data.map(s => normalizeBoardName(s.ssc_board, s.ssc_gpa)).filter(Boolean))].sort();
  const religions = [...new Set(data.map(s => s.religion).filter(Boolean).map(x => x.trim()))].sort();
  const bloodGroups = [...new Set(data.map(s => s.blood_group).filter(Boolean).map(x => x.trim()))].sort();
  const years = [...new Set(data.map(s => s.ssc_year).filter(Boolean).map(x => x.trim()))].sort();
  const fourthSubs = [...new Set(data.map(s => cleanSubjectName(s.fourth_subject)).filter(x => x && x !== '—' && x !== 'N/A'))].sort();
  const elecSubs = [...new Set(data.map(s => cleanSubjectName(s.elective_subjects)).filter(x => x && x !== '—' && x !== 'N/A'))].sort();

  fillSelect('fModalGroup', groups, 'All Groups');
  fillSelect('fModalSection', sections, 'All Sections');
  fillSelect('fModalDistrict', districts, 'All Districts');
  fillSelect('fModalPresentDistrict', presDistricts, 'All Present Districts');
  fillSelect('fModalPermanentDistrict', permDistricts, 'All Permanent Districts');
  fillSelect('fModalBoard', boards, 'All Boards');
  fillSelect('fModalReligion', religions, 'All Religions');
  fillSelect('fModalBloodGroup', bloodGroups, 'All Blood Groups');
  fillSelect('fModalSscYear', years, 'All Passing Years');
  fillSelect('fModalFourthSubject', fourthSubs, 'All 4th Subjects');
  fillSelect('fModalElectiveSubject', elecSubs, 'All Elective Subjects');

  const secField = $('fModalSection')?.closest('.f-field');
  if (secField) {
    secField.style.display = (state.collegeCode === 'dc') ? 'flex' : 'none';
  }
}

function fillSelect(id, items, defaultLabel) {
  const el = $(id);
  if (!el) return;
  el.innerHTML = `<option value="all">${defaultLabel}</option>` +
    items.map(it => `<option value="${esc(it)}">${esc(it)}</option>`).join('');
}

function matchStudentFilters(s, f) {
  if (f.bookmarkedOnly && !isBookmarked(s.college_roll || s.admission_roll)) return false;
  if (f.gender !== 'all' && (s.gender || '').toLowerCase() !== f.gender.toLowerCase()) return false;
  if (f.group !== 'all' && s.group_name !== f.group) return false;
  if (f.section !== 'all' && s.section !== f.section) return false;
  if (f.district !== 'all') {
    const p1 = (s.present_district || '').toLowerCase();
    const p2 = (s.permanent_district || '').toLowerCase();
    const target = f.district.toLowerCase();
    if (!p1.includes(target) && !p2.includes(target)) return false;
  }
  if (f.presentDistrict && f.presentDistrict !== 'all') {
    const p1 = (s.present_district || '').toLowerCase();
    if (!p1.includes(f.presentDistrict.toLowerCase())) return false;
  }
  if (f.permanentDistrict && f.permanentDistrict !== 'all') {
    const p2 = (s.permanent_district || '').toLowerCase();
    if (!p2.includes(f.permanentDistrict.toLowerCase())) return false;
  }
  if (f.board !== 'all' && normalizeBoardName(s.ssc_board, s.ssc_gpa).toLowerCase() !== normalizeBoardName(f.board).toLowerCase()) return false;
  if (f.religion !== 'all' && (s.religion || '').toLowerCase() !== f.religion.toLowerCase()) return false;
  if (f.bloodGroup !== 'all' && (s.blood_group || '').toLowerCase() !== f.bloodGroup.toLowerCase()) return false;
  if (f.sscYear !== 'all' && String(s.ssc_year || '') !== String(f.sscYear)) return false;
  if (f.fourthSubject && f.fourthSubject !== 'all') {
    const s4th = cleanSubjectName(s.fourth_subject || '').toLowerCase();
    if (!s4th.includes(f.fourthSubject.toLowerCase())) return false;
  }
  if (f.electiveSubject && f.electiveSubject !== 'all') {
    const selec = cleanSubjectName(s.elective_subjects || '').toLowerCase();
    if (!selec.includes(f.electiveSubject.toLowerCase())) return false;
  }
  if (f.gpa && f.gpa !== 'all') {
    const val = parseFloat(s.ssc_gpa);
    if (isNaN(val)) return false;
    if (f.gpa === '5.00' && val < 5.00) return false;
    if (f.gpa === 'gte_4.8' && val < 4.80) return false;
    if (f.gpa === 'gte_4.5' && val < 4.50) return false;
    if (f.gpa === 'gte_4.0' && val < 4.00) return false;
    if (f.gpa === 'lt_4.0' && val >= 4.00) return false;
  }
  if (f.quota !== 'all') {
    const q = (s.quota || '').trim();
    if (f.quota === 'has_quota' && (!q || q === '-' || q === '0')) return false;
    if (f.quota === 'none' && (q && q !== '-' && q !== '0')) return false;
    if (f.quota === 'ff' && !/freedom|ff/i.test(q)) return false;
    if (f.quota === 'eq' && !/education|eq/i.test(q)) return false;
  }
  return true;
}

function applyFilters() {
  const q = ($('searchInput')?.value || '').toLowerCase().trim();

  state.filteredStudents = state.allStudents.filter(s => {
    if (!matchStudentFilters(s, state.filters)) return false;
    if (!q) return true;

    return (s.student_name_en || '').toLowerCase().includes(q) ||
           (s.student_name_bn || '').toLowerCase().includes(q) ||
           (s.short_roll || '').includes(q) ||
           (s.college_roll || '').includes(q) ||
           (s.admission_roll || '').includes(q) ||
           (s.section || '').toLowerCase().includes(q) ||
           (s.student_phone || '').includes(q) ||
           (s.father_name_en || '').toLowerCase().includes(q) ||
           (s.father_phone || '').includes(q) ||
           (s.ssc_roll || '').includes(q) ||
           (s.ssc_reg || '').includes(q);
  });

  updateActiveFilterChips();
  renderActiveView();
  updateResultCount();
}

function updateActiveFilterChips() {
  const bar = $('activeFiltersBar');
  const badge = $('filterActiveBadge');
  const triggerBtn = $('openFilterModalBtn');
  if (!bar) return;

  const active = [];
  if (state.filters.bookmarkedOnly) active.push({ key: 'bookmarkedOnly', label: '⭐ Bookmarked Only' });
  if (state.filters.gender !== 'all') active.push({ key: 'gender', label: `Gender: ${state.filters.gender}` });
  if (state.filters.group !== 'all') active.push({ key: 'group', label: `Group: ${state.filters.group}` });
  if (state.filters.section !== 'all') active.push({ key: 'section', label: `Sec: ${state.filters.section}` });
  if (state.filters.district !== 'all') active.push({ key: 'district', label: `Zila: ${state.filters.district}` });
  if (state.filters.presentDistrict !== 'all') active.push({ key: 'presentDistrict', label: `Present Zila: ${state.filters.presentDistrict}` });
  if (state.filters.permanentDistrict !== 'all') active.push({ key: 'permanentDistrict', label: `Permanent Zila: ${state.filters.permanentDistrict}` });
  if (state.filters.board !== 'all') active.push({ key: 'board', label: `Board: ${state.filters.board}` });
  if (state.filters.religion !== 'all') active.push({ key: 'religion', label: `Religion: ${state.filters.religion}` });
  if (state.filters.bloodGroup !== 'all') active.push({ key: 'bloodGroup', label: `Blood: ${state.filters.bloodGroup}` });
  if (state.filters.quota !== 'all') active.push({ key: 'quota', label: `Quota: ${state.filters.quota}` });
  if (state.filters.sscYear !== 'all') active.push({ key: 'sscYear', label: `Year: ${state.filters.sscYear}` });
  if (state.filters.fourthSubject !== 'all') active.push({ key: 'fourthSubject', label: `4th: ${state.filters.fourthSubject}` });
  if (state.filters.electiveSubject !== 'all') active.push({ key: 'electiveSubject', label: `Elective: ${state.filters.electiveSubject}` });
  if (state.filters.gpa !== 'all') {
    const gpaLabels = { '5.00': 'GPA 5.00', 'gte_4.8': 'GPA ≥ 4.80', 'gte_4.5': 'GPA ≥ 4.50', 'gte_4.0': 'GPA ≥ 4.00', 'lt_4.0': 'GPA < 4.00' };
    active.push({ key: 'gpa', label: gpaLabels[state.filters.gpa] || `GPA: ${state.filters.gpa}` });
  }

  if (badge) {
    if (active.length > 0) {
      badge.textContent = active.length;
      badge.style.display = 'inline-block';
      triggerBtn?.classList.add('has-active');
    } else {
      badge.style.display = 'none';
      triggerBtn?.classList.remove('has-active');
    }
  }

  if (active.length === 0) {
    bar.style.display = 'none';
    bar.innerHTML = '';
    return;
  }

  bar.style.display = 'flex';
  bar.innerHTML = `
    <span class="af-label"><i class="fa-solid fa-filter"></i> Active:</span>
    ${active.map(a => `
      <span class="af-chip">
        ${esc(a.label)}
        <button onclick="removeFilter('${a.key}')" title="Remove filter">&times;</button>
      </span>
    `).join('')}
    <button class="af-clear-all" onclick="clearAllActiveFilters()">Clear All</button>
  `;
}

function removeFilter(key) {
  if (key === 'bookmarkedOnly') {
    state.filters.bookmarkedOnly = false;
    const bmFilterBtn = $('filterBookmarksBtn');
    if (bmFilterBtn) bmFilterBtn.classList.remove('active');
  } else {
    state.filters[key] = 'all';
    const modalEl = {
      gender: 'fModalGender', group: 'fModalGroup', section: 'fModalSection',
      district: 'fModalDistrict', presentDistrict: 'fModalPresentDistrict',
      permanentDistrict: 'fModalPermanentDistrict', board: 'fModalBoard',
      religion: 'fModalReligion', bloodGroup: 'fModalBloodGroup', quota: 'fModalQuota',
      sscYear: 'fModalSscYear', fourthSubject: 'fModalFourthSubject',
      electiveSubject: 'fModalElectiveSubject', gpa: 'fModalGpa'
    }[key];
    if (modalEl && $(modalEl)) $(modalEl).value = 'all';
    if (key === 'group' && $('groupFilter')) $('groupFilter').value = 'all';
    if (key === 'section' && $('sectionFilter')) $('sectionFilter').value = 'all';
  }
  state.currentPage = 1;
  applyFilters();
}
window.removeFilter = removeFilter;

function clearAllActiveFilters() {
  resetAllFilters();
}
window.clearAllActiveFilters = clearAllActiveFilters;

function updateResultCount() {
  const el = $('resultCount');
  if (!el) return;
  const total = state.filteredStudents.length;
  const start = total === 0 ? 0 : 1;
  const end = Math.min(state.currentPage * state.pageSize, total);
  el.innerHTML = `Showing <strong>${start}–${end}</strong> of <strong>${total.toLocaleString()}</strong> students`;
}

function updateHeaderStats() {
  const data = state.allStudents;
  const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
  set('statTotal', data.length.toLocaleString());
  set('statScience', data.filter(s => /science/i.test(s.group_name || '')).length.toLocaleString());
  set('statHumanities', data.filter(s => /humanities|arts/i.test(s.group_name || '')).length.toLocaleString());
  set('statBusiness', data.filter(s => /business|commerce/i.test(s.group_name || '')).length.toLocaleString());
}

/* ── VIEW SWITCHER (PHOTOS, COMPACT, TABLE) ──────────────── */
function setupViewToggle() {
  document.querySelectorAll('.vt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.vt-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentView = btn.dataset.view;
      renderActiveView();
    });
  });
}

function getGroupFolder(groupName) {
  const g = (groupName || 'Science').toLowerCase();
  if (g.includes('bus') || g.includes('com') || g.includes('b.stu')) return 'bstudies';
  if (g.includes('hum') || g.includes('art')) return 'humanities';
  return 'science';
}

function getStudentPhotoPath(s) {
  if (s.local_photo) return s.local_photo;
  if (s.photo_filename && state.currentBatch && state.currentBatch.photoBase) {
    const gf = getGroupFolder(s.group_name);
    return state.currentBatch.photoBase + gf + '/' + s.photo_filename;
  }
  return null;
}

function getStudentLocalPdfUrl(s) {
  if (s.local_pdf) return s.local_pdf;
  if (s.pdf_filename && state.currentBatch && state.currentBatch.pdfBase) {
    const gf = getGroupFolder(s.group_name);
    return state.currentBatch.pdfBase + gf + '/' + s.pdf_filename;
  }
  return null;
}

function formatRollTag(shortRoll, fallbackIdx) {
  if (shortRoll !== undefined && shortRoll !== null && String(shortRoll).trim() !== '') {
    const clean = String(shortRoll).replace(/^0+/, '');
    return '#' + (clean || '0');
  }
  return '#' + fallbackIdx;
}

function getSectionBadgeInfo(s) {
  const isDC = (state.collegeCode === 'dc');
  const grp = (s.group_name || '').toLowerCase();
  
  if (grp.includes('hum') || grp.includes('art')) {
    return { text: 'HUM', cls: 'hum-tag' };
  }
  if (grp.includes('bus') || grp.includes('com') || grp.includes('b.stu')) {
    return { text: 'B.STU', cls: 'bs-tag' };
  }
  
  // Science group:
  if (isDC) {
    const sec = (s.section || '').replace(/^(sec|section)\s*/i, '').trim();
    if (sec && !/science|all|—/i.test(sec)) {
      return { text: sec, cls: '' }; // e.g. "A", "B", "C"
    }
  }
  return { text: 'SCI', cls: '' };
}

/* ── CLEAN SUBJECT NORMALIZER (TASK 4) ─────────────────────── */
function cleanSubjectName(str) {
  if (!str || str === '—' || str === 'N/A') return '—';
  const l = str.toLowerCase();
  if (l.includes('physics')) return 'Physics';
  if (l.includes('chemistry')) return 'Chemistry';
  if (l.includes('higher math') || l.includes('উচ্চতর')) return 'Higher Math';
  if (l.includes('biology') || l.includes('জীববিজ্ঞান')) return 'Biology';
  if (l.includes('bangla') || l.includes('বাংলা')) return 'Bangla';
  if (l.includes('english') || l.includes('ইংরেজি')) return 'English';
  if (l.includes('ict') || l.includes('information and comm')) return 'ICT';
  if (l.includes('statistics') || l.includes('পরিসংখ্যান')) return 'Statistics';
  if (l.includes('economics') || l.includes('অর্থনীতি')) return 'Economics';
  if (l.includes('accounting') || l.includes('হিসাববিজ্ঞান')) return 'Accounting';
  if (l.includes('finance') || l.includes('ব্যাংকিং')) return 'Finance & Banking';
  if (l.includes('management') || l.includes('business org') || l.includes('ব্যবস্থাপনা')) return 'Management';
  if (l.includes('marketing') || l.includes('বিপণন')) return 'Marketing';
  if (l.includes('civics') || l.includes('পৌরনীতি')) return 'Civics';
  if (l.includes('sociology') || l.includes('সমাজবিজ্ঞান')) return 'Sociology';
  if (l.includes('social work') || l.includes('সমাজকর্ম')) return 'Social Work';
  if (l.includes('logic') || l.includes('যুক্তিবিদ্যা')) return 'Logic';
  if (l.includes('geography') || l.includes('ভূগোল')) return 'Geography';
  if (l.includes('psychology') || l.includes('মনোবিজ্ঞান')) return 'Psychology';
  if (l.includes('islamic history') || l.includes('ইসলামের ইতিহাস')) return 'Islamic History';
  if (l.includes('islamic studies') || l.includes('ইসলাম শিক্ষা')) return 'Islamic Studies';
  if (l.includes('agriculture') || l.includes('কৃষি')) return 'Agriculture';
  if (l.includes('home science') || l.includes('গার্হস্থ্য')) return 'Home Science';
  return str.replace(/^\d+\s*-\s*/, '').replace(/\b(1st|2nd)\s+paper\b/gi, '').replace(/\s*\/\s*\d+.*$/, '').replace(/mandatory|elective|fourth/gi, '').trim();
}

function cleanSubjectLabel(txt) {
  return cleanSubjectName(txt);
}

/* ── SSC BOARD NORMALIZER ─────────────────────────────────── */
function normalizeBoardName(name, gpa = '') {
  if (!name || typeof name !== 'string') return '';
  const raw = name.trim();
  const clean = raw.replace(/[^a-zA-Z]/g, '').toLowerCase();

  // Handle column shift anomaly
  if ((raw === '2025' || raw === '2026') && gpa) {
    const gClean = String(gpa).toLowerCase();
    if (gClean.includes('dhaka')) return 'Dhaka';
    if (gClean.includes('barishal') || gClean.includes('barisal')) return 'Barishal';
  }

  if (!clean) return '';

  // Jashore / Jessore / Joshor / Jeshore / Jasshore
  if (['jash', 'jess', 'josh', 'jesh', 'jass'].some(k => clean.includes(k))) return 'Jashore';
  // Chattogram / Chittagong / CTG
  if (['chatt', 'chitt', 'chott', 'chitag', 'chaitt', 'chtro', 'chatro', 'ctg', 'collegiate', 'general'].some(k => clean.includes(k))) return 'Chattogram';
  // Cumilla / Comilla
  if (['cumil', 'comil', 'camil', 'cumila'].some(k => clean.includes(k))) return 'Cumilla';
  // Barishal / Barisal
  if (['barish', 'baris'].some(k => clean.includes(k))) return 'Barishal';
  // Mymensingh
  if (['mymen', 'mymin'].some(k => clean.includes(k))) return 'Mymensingh';
  // Madrasah
  if (['madra', 'madar'].some(k => clean.includes(k))) return 'Madrasah';
  // Technical / BTEB
  if (['bteb', 'betb', 'tech', 'tach', 'tecg', 'tecn'].some(k => clean.includes(k)) || clean === 'tec') return 'BTEB';
  // Dhaka
  if (clean.includes('dhak') || clean.includes('dhdk') || clean.includes('dacc') || clean.includes('jurain') || clean.includes('mohammadpur')) return 'Dhaka';
  // Rajshahi
  if (clean.includes('rajsh')) return 'Rajshahi';
  // Dinajpur
  if (clean.includes('dinaj')) return 'Dinajpur';
  // Sylhet
  if (clean.includes('sylh')) return 'Sylhet';
  // BOU
  if (clean === 'bou' || clean.includes('openuniversity')) return 'BOU';

  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

/* ── EXTERNAL VERIFICATION & DATE HELPERS (TASK 10) ────────── */
function convertDobToYmd(dobStr) {
  if (!dobStr) return '';
  const months = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
    'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };
  const parts = dobStr.trim().split(/[-/.\s]+/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    const d = parts[0].padStart(2, '0');
    let m = parts[1].toLowerCase().slice(0, 3);
    m = months[m] || parts[1].padStart(2, '0');
    const y = parts[2];
    return `${y}-${m}-${d}`;
  }
  return dobStr;
}

function copyDobYmd(dobStr, btn) {
  const ymd = convertDobToYmd(dobStr);
  navigator.clipboard.writeText(ymd).then(() => {
    showToast(`Copied Date of Birth: ${ymd} (YYYY-MM-DD)`);
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
      setTimeout(() => btn.innerHTML = orig, 1500);
    }
  });
}
window.copyDobYmd = copyDobYmd;

function openBdrisVerification(nidOrBirthReg, dobStr) {
  const ymd = convertDobToYmd(dobStr) || dobStr || '';
  if (ymd) {
    navigator.clipboard.writeText(ymd).then(() => {
      showToast(`Copied Birth Date: ${ymd}. Opening BDRIS Portal...`);
    }).catch(() => {
      showToast('Opening BDRIS Portal...');
    });
  } else {
    showToast('Opening BDRIS Portal...');
  }
  window.open('https://everify.bdris.gov.bd/', '_blank');
}
window.openBdrisVerification = openBdrisVerification;

function checkSscResult(roll, reg, board, year) {
  const cleanRoll = String(roll || '').trim();
  if (cleanRoll && cleanRoll !== '—' && cleanRoll !== 'N/A') {
    navigator.clipboard.writeText(cleanRoll).then(() => {
      showToast(`Copied SSC Roll: ${cleanRoll}. Opening SSC Result Portal...`);
    });
  } else {
    showToast(`Opening SSC Result Portal...`);
  }
  window.open('https://sscresult.govt.bd/', '_blank');
}
window.checkSscResult = checkSscResult;

/* ── BOOKMARKING SYSTEM (TASK 7) ───────────────────────────── */
function getBookmarks() {
  try {
    return JSON.parse(localStorage.getItem('govcd_bookmarks') || '[]');
  } catch { return []; }
}

function isBookmarked(roll) {
  if (!roll) return false;
  return getBookmarks().includes(String(roll));
}

function toggleBookmark(roll, btnElement) {
  if (!roll) return;
  let bm = getBookmarks();
  const sRoll = String(roll);
  let added = false;
  if (bm.includes(sRoll)) {
    bm = bm.filter(r => r !== sRoll);
    showToast('Removed from Bookmarks');
  } else {
    bm.push(sRoll);
    added = true;
    showToast('Saved to Bookmarks ⭐');
  }
  localStorage.setItem('govcd_bookmarks', JSON.stringify(bm));
  updateBookmarkBadge();
  document.querySelectorAll(`[data-bm-roll="${sRoll}"]`).forEach(btn => {
    btn.classList.toggle('active', added);
    btn.innerHTML = `<i class="fa-${added ? 'solid' : 'regular'} fa-bookmark"></i>`;
  });
  if (state.filters.bookmarkedOnly) {
    applyFilters();
  }
}
window.toggleBookmark = toggleBookmark;

function updateBookmarkBadge() {
  const badge = $('bookmarkBadge');
  if (badge) {
    const count = getBookmarks().length;
    badge.textContent = count;
  }
}

function cleanQuotaLabel(quota) {
  if (!quota || quota === '—' || quota === 'N/A') return '—';
  if (/religion|blood group|nationality|date of birth/i.test(quota)) {
    if (/freedom fighter|মুক্তিযোদ্ধা|ff/i.test(quota)) return 'Freedom Fighter';
    if (/education|শিক্ষা|eq/i.test(quota)) return 'Education Quota';
    if (/tribal|উপজাতি|tq/i.test(quota)) return 'Tribal';
    if (/disability|প্রতিবন্ধী/i.test(quota)) return 'Disability';
    return '—';
  }
  return quota;
}

function renderActiveView() {
  const container = $('viewsContainer');
  if (!container) return;

  const total = state.filteredStudents.length;
  if (total === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:70px 20px;color:var(--text-muted);background:var(--surface);border-radius:12px;border:1px solid var(--border);">
        <i class="fa-solid fa-magnifying-glass fa-3x" style="opacity:.35;margin-bottom:14px;color:var(--accent);"></i>
        <h3 style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:4px;">No student records found</h3>
        <p style="font-size:12.5px;">Try adjusting your search query, group or advanced filters.</p>
      </div>
    `;
    renderPagination(0);
    return;
  }

  // 150 student chunking
  const visibleStudents = state.filteredStudents.slice(0, state.currentPage * state.pageSize);

  if (state.currentView === 'detailed' || state.currentView === 'cards') {
    renderDetailedCards(visibleStudents, container);
  } else if (state.currentView === 'photos') {
    renderPhotosGrid(visibleStudents, container);
  } else if (state.currentView === 'compact') {
    renderCompactGrid(visibleStudents, container);
  } else if (state.currentView === 'table') {
    renderTableView(visibleStudents, container);
  }

  renderPagination(total);
}

/* ── VIEW 1: PHOTOS GRID (DEFAULT FOCUS) ─────────────────── */
function renderPhotosGrid(students, container) {
  const html = `
    <div class="view-photos-grid">
      ${students.map((s, idx) => {
        const photo = getStudentPhotoPath(s);
        const badgeInfo = getSectionBadgeInfo(s);
        const rollLabel = formatRollTag(s.short_roll, idx + 1);

        return `
          <div class="photo-card" data-idx="${idx}">
            <div class="img-wrap">
              ${photo ? `
                <img src="${photo}" alt="${esc(s.student_name_en)}" loading="lazy"
                     onerror="this.parentElement.innerHTML='<div class=photo-placeholder><i class=\\'fa-solid fa-user\\'></i></div>'">
              ` : `
                <div class="photo-placeholder"><i class="fa-solid fa-user"></i></div>
              `}
              <span class="p-roll-tag">${rollLabel}</span>
              <span class="p-sec-tag ${badgeInfo.cls}">${badgeInfo.text}</span>
            </div>
            <h4 title="${esc(s.student_name_en || 'Unknown Student')}">${esc(s.student_name_en || 'Unknown Student')}</h4>
          </div>
        `;
      }).join('')}
    </div>
  `;
  container.innerHTML = html;
  bindCardClicks(container, students);
}

/* ── VIEW 0: DETAILED RICH CARDS (5th Screenshot Reference) ─ */
function renderDetailedCards(students, container) {
  const html = `
    <div class="cards-grid">
      ${students.map((s, idx) => {
        const photo = getStudentPhotoPath(s);
        const localPdf = getStudentLocalPdfUrl(s);
        const rollNum = s.short_roll ? String(s.short_roll).replace(/^0+/, '') : (idx + 1);
        
        const grp = (s.group_name || '').toLowerCase();
        let gbClass = 'badge-grp';
        if (grp.includes('hum') || grp.includes('art')) gbClass = 'badge-hum';
        else if (grp.includes('bus') || grp.includes('com')) gbClass = 'badge-bs';

        const isDC = (state.collegeCode === 'dc');
        let secBadgeText = '';
        if (isDC && s.section && s.section !== '—' && !/all|none|science/i.test(s.section)) {
          secBadgeText = s.section.startsWith('Section') ? s.section : `Section ${s.section}`;
        }
        
        let pracBadgeText = '';
        if (isDC && s.practical_group && s.practical_group !== '—') {
          pracBadgeText = s.practical_group.replace(/^(prac:?|practical:?)\s*/i, '').trim();
        }

        let monthlyIncomeStr = '—';
        if (s.father_annual_income && !isNaN(s.father_annual_income) && Number(s.father_annual_income) > 0) {
          const m = Math.round(Number(s.father_annual_income) / 12);
          monthlyIncomeStr = '৳' + m.toLocaleString();
        }

        const rawPhone = (s.student_phone && s.student_phone !== '—') ? s.student_phone.replace(/[^0-9]/g, '') : '';
        const wa = rawPhone.length >= 10 ? (rawPhone.startsWith('88') ? rawPhone : ('88' + rawPhone.replace(/^0/, ''))) : '';
        const tg = rawPhone.length >= 10 ? (rawPhone.startsWith('88') ? rawPhone : ('88' + rawPhone.replace(/^0/, ''))) : '';

        const districtStr = s.permanent_district || s.present_district || '—';
        const boardGpaStr = (s.ssc_board || '—') + (s.ssc_gpa ? ` • <strong style="color:var(--success);">${s.ssc_gpa}</strong>` : '');
        const electiveStr = cleanSubjectLabel(s.elective_subjects);
        const fourthStr = cleanSubjectLabel(s.fourth_subject);

        return `
          <div class="s-card" data-idx="${idx}">
            <div class="card-hdr">
              ${photo ? `
                <img class="card-av" src="${photo}" alt="${esc(s.student_name_en)}" loading="lazy"
                     onerror="this.outerHTML='<div class=card-av style=\\'display:flex;align-items:center;justify-content:center;color:var(--text-faint);\\'><i class=\\'fa-solid fa-user\\'></i></div>'">
              ` : `
                <div class="card-av" style="display:flex;align-items:center;justify-content:center;color:var(--text-faint);"><i class="fa-solid fa-user"></i></div>
              `}
              <div class="card-hi">
                <h3 title="${esc(s.student_name_en)}">${esc(s.student_name_en || 'Unknown')}</h3>
                <div class="card-bn bn-text">${esc(s.student_name_bn || '')}</div>
                <div class="card-bdgs">
                  <span class="badge badge-roll">Roll ${rollNum}</span>
                  <span class="badge ${gbClass}">${esc(s.group_name || 'Science')}</span>
                  ${secBadgeText ? `<span class="badge badge-sec">${esc(secBadgeText)}</span>` : ''}
                  ${pracBadgeText ? `<span class="badge badge-prac">${esc(pracBadgeText)}</span>` : ''}
                  ${s.blood_group && s.blood_group !== '—' ? `<span class="badge badge-bld">${esc(s.blood_group)}</span>` : ''}
                </div>
              </div>
            </div>

            <div class="card-body-grid">
              <div class="c-item">
                <span class="c-lbl">Mobile</span>
                <span class="c-val">${rawPhone ? `<a class="ph-link" href="tel:${rawPhone}" onclick="event.stopPropagation()">${s.student_phone}</a>` : '—'}</span>
              </div>
              <div class="c-item">
                <span class="c-lbl">Date of Birth</span>
                <span class="c-val">${s.date_of_birth || '—'}</span>
              </div>
              <div class="c-item">
                <span class="c-lbl">Religion</span>
                <span class="c-val">${s.religion || '—'}</span>
              </div>
              <div class="c-item">
                <span class="c-lbl">Quota</span>
                <span class="c-val">${cleanQuotaLabel(s.quota)}</span>
              </div>
              <div class="c-item">
                <span class="c-lbl">Father's Occupation</span>
                <span class="c-val">${s.father_occupation || '—'}</span>
              </div>
              <div class="c-item">
                <span class="c-lbl">Monthly Income</span>
                <span class="c-val" style="color:var(--success);font-weight:600;">${monthlyIncomeStr}</span>
              </div>
              <div class="c-item">
                <span class="c-lbl">District</span>
                <span class="c-val">${districtStr}</span>
              </div>
              <div class="c-item">
                <span class="c-lbl">SSC Board &amp; GPA</span>
                <span class="c-val">${boardGpaStr}</span>
              </div>
              <div class="c-item">
                <span class="c-lbl">Elective Subject</span>
                <span class="c-val" style="color:var(--primary);font-weight:600;">${electiveStr}</span>
              </div>
              <div class="c-item">
                <span class="c-lbl">4th Subject</span>
                <span class="c-val" style="color:var(--accent);font-weight:600;">${fourthStr}</span>
              </div>
            </div>

            <div class="card-foot">
              <span class="card-roll-code">${s.college_roll || ''}</span>
              <div class="card-actions" onclick="event.stopPropagation()">
                ${rawPhone ? `<a href="tel:${rawPhone}" class="ca-btn" title="Call"><i class="fa-solid fa-phone" style="color:var(--accent);"></i></a>` : ''}
                ${wa ? `<a href="https://wa.me/${wa}" target="_blank" class="ca-btn" title="WhatsApp"><i class="fa-brands fa-whatsapp" style="color:#25D366;"></i></a>` : ''}
                ${tg ? `<a href="https://t.me/+${tg}" target="_blank" class="ca-btn" title="Telegram"><i class="fa-brands fa-telegram" style="color:#229ED9;"></i></a>` : ''}
                ${localPdf ? `<a href="${localPdf}" target="_blank" class="ca-btn" title="Open Downloaded PDF"><i class="fa-solid fa-file-pdf" style="color:#DC2626;"></i></a>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  container.innerHTML = html;
  bindCardClicks(container, students);
}

/* ── VIEW 2: COMPACT CARDS ───────────────────────────────── */
function renderCompactGrid(students, container) {
  const html = `
    <div class="view-compact-grid">
      ${students.map((s, idx) => {
        const photo = getStudentPhotoPath(s);
        return `
          <div class="compact-card" data-idx="${idx}">
            ${photo ? `
              <img class="compact-photo" src="${photo}" alt="${esc(s.student_name_en)}" loading="lazy"
                   onerror="this.outerHTML='<div class=compact-photo style=\\'display:flex;align-items:center;justify-content:center;color:var(--text-faint);\\'><i class=\\'fa-solid fa-user\\'></i></div>'">
            ` : `
              <div class="compact-photo" style="display:flex;align-items:center;justify-content:center;color:var(--text-faint);"><i class="fa-solid fa-user"></i></div>
            `}
            <div class="compact-info">
              <h4>${esc(s.student_name_en || 'Unknown')}</h4>
              <div class="c-sub">
                <span>#${s.short_roll || (idx+1)}</span> &bull;
                <span>${s.group_name || ''}</span>
                ${(state.collegeCode === 'dc' && s.section && !/science|all/i.test(s.section)) ? `&bull; <span>Sec ${s.section}</span>` : ''}
              </div>
              <div class="c-adm"><i class="fa-solid fa-ticket" style="font-size:10px;margin-right:3px;"></i>Adm: ${s.admission_roll || '—'}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  container.innerHTML = html;
  bindCardClicks(container, students);
}

/* ── VIEW 3: FULL TABLE VIEW ─────────────────────────────── */
function renderTableView(students, container) {
  const html = `
    <div class="table-card">
      <div class="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:46px;text-align:center;">#</th>
              <th style="width:52px;text-align:center;">Photo</th>
              <th>Student Name (EN)</th>
              <th>Name (BN)</th>
              <th>College Roll</th>
              <th>Admission Roll</th>
              <th>Group</th>
              <th>Section</th>
              <th>Prac</th>
              <th>Blood</th>
              <th>Gender</th>
              <th>DOB</th>
              <th>Religion</th>
              <th>Quota</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Father Name</th>
              <th>Father Phone</th>
              <th>Occupation</th>
              <th>Monthly Income</th>
              <th>Mother Name</th>
              <th>Present Address</th>
              <th>Present District</th>
              <th>Permanent Address</th>
              <th>Permanent District</th>
              <th>Local Guardian</th>
              <th>SSC Board</th>
              <th>SSC GPA</th>
              <th>SSC Year</th>
              <th>Elective</th>
              <th>4th Subject</th>
              <th>Payment Date</th>
              <th>Transaction No</th>
              <th>Doc</th>
            </tr>
          </thead>
          <tbody>
            ${students.map((s, idx) => {
              const photo = getStudentPhotoPath(s);
              const localPdf = getStudentLocalPdfUrl(s);
              const rollNum = s.short_roll ? String(s.short_roll).replace(/^0+/, '') : (idx + 1);
              let inc = '—';
              if (s.father_annual_income && !isNaN(s.father_annual_income) && Number(s.father_annual_income) > 0) {
                inc = '৳' + Math.round(Number(s.father_annual_income) / 12).toLocaleString();
              }
              return `
                <tr data-idx="${idx}">
                  <td style="text-align:center;font-weight:700;color:var(--text-muted);">${rollNum}</td>
                  <td style="text-align:center;">
                    ${photo ? `
                      <img class="tbl-thumb" src="${photo}" alt="" loading="lazy" onerror="this.style.display='none'">
                    ` : `
                      <div class="tbl-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--text-faint);"><i class="fa-solid fa-user"></i></div>
                    `}
                  </td>
                  <td><strong>${esc(s.student_name_en || 'Unknown')}</strong></td>
                  <td class="bn-text">${esc(s.student_name_bn || '—')}</td>
                  <td style="font-family:monospace;font-weight:600;color:var(--accent);">${s.college_roll || '—'}</td>
                  <td style="font-family:monospace;font-weight:700;color:var(--primary);">${s.admission_roll || '—'}</td>
                  <td><span class="badge badge-grp">${s.group_name || '—'}</span></td>
                  <td>${(state.collegeCode === 'dc' && s.section && !/science/i.test(s.section)) ? `<span class="badge badge-sec">${s.section}</span>` : '—'}</td>
                  <td>${(state.collegeCode === 'dc' && s.practical_group) ? s.practical_group : '—'}</td>
                  <td><strong>${s.blood_group || '—'}</strong></td>
                  <td>${s.gender || '—'}</td>
                  <td>${s.date_of_birth || '—'}</td>
                  <td>${s.religion || '—'}</td>
                  <td>${cleanQuotaLabel(s.quota)}</td>
                  <td style="font-family:monospace;">${s.student_phone || '—'}</td>
                  <td>${s.student_email || '—'}</td>
                  <td>${esc(s.father_name_en || '—')}</td>
                  <td style="font-family:monospace;">${s.father_phone || '—'}</td>
                  <td>${s.father_occupation || '—'}</td>
                  <td style="color:var(--success);font-weight:600;">${inc}</td>
                  <td>${esc(s.mother_name_en || '—')}</td>
                  <td style="max-width:240px;overflow:hidden;text-overflow:ellipsis;" title="${esc(s.present_address)}">${esc(s.present_address || '—')}</td>
                  <td>${s.present_district || '—'}</td>
                  <td style="max-width:240px;overflow:hidden;text-overflow:ellipsis;" title="${esc(s.permanent_address)}">${esc(s.permanent_address || '—')}</td>
                  <td>${s.permanent_district || '—'}</td>
                  <td>${esc(s.local_guardian || '—')}</td>
                  <td>${s.ssc_board || '—'}</td>
                  <td><strong style="color:var(--success);">${s.ssc_gpa || '—'}</strong></td>
                  <td>${s.ssc_year || '—'}</td>
                  <td>${cleanSubjectLabel(s.elective_subjects)}</td>
                  <td>${cleanSubjectLabel(s.fourth_subject)}</td>
                  <td>${s.payment_date || '—'}</td>
                  <td style="font-family:monospace;">${s.transaction_no || '—'}</td>
                  <td onclick="event.stopPropagation()">
                    ${localPdf ? `<a href="${localPdf}" target="_blank" style="color:var(--danger);font-size:14px;" title="Open Downloaded PDF"><i class="fa-solid fa-file-pdf"></i></a>` : '—'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  container.innerHTML = html;
  bindCardClicks(container, students);
}

function bindCardClicks(container, students) {
  container.querySelectorAll('[data-idx]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = +el.dataset.idx;
      const s = students[idx];
      if (s) openStudentModal(s);
    });
  });
}

/* ── PAGINATION & LOAD MORE (150 PAGINATION) ─────────────── */
function renderPagination(total) {
  const wrap = $('paginationWrap');
  if (!wrap) return;
  if (total <= state.pageSize) {
    wrap.innerHTML = '';
    return;
  }

  const shown = Math.min(state.currentPage * state.pageSize, total);
  const totalPages = Math.ceil(total / state.pageSize);
  const hasMore = shown < total;

  let pagesHtml = '';
  for (let p = 1; p <= totalPages; p++) {
    if (totalPages > 7) {
      if (p !== 1 && p !== totalPages && Math.abs(p - state.currentPage) > 1) {
        if (p === 2 || p === totalPages - 1) pagesHtml += `<span style="padding:0 3px;color:var(--text-muted);">&bull;</span>`;
        continue;
      }
    }
    pagesHtml += `
      <button class="page-btn ${p === state.currentPage ? 'active' : ''}" data-page="${p}">${p}</button>
    `;
  }

  wrap.innerHTML = `
    <div class="pagination-wrapper">
      ${hasMore ? `
        <button class="load-more-btn" id="loadMoreBtn">
          <i class="fa-solid fa-angles-down"></i> Load More Students (+150)
        </button>
      ` : ''}
      <div class="page-controls">
        <button class="page-btn" id="prevPageBtn" ${state.currentPage === 1 ? 'disabled' : ''}>
          <i class="fa-solid fa-chevron-left"></i> Prev
        </button>
        ${pagesHtml}
        <button class="page-btn" id="nextPageBtn" ${state.currentPage === totalPages ? 'disabled' : ''}>
          Next <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
      <div class="page-status">
        Showing <strong>${shown}</strong> of <strong>${total.toLocaleString()}</strong> students (Page ${state.currentPage} of ${totalPages})
      </div>
    </div>
  `;

  const loadBtn = $('loadMoreBtn');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      state.currentPage++;
      renderActiveView();
      updateResultCount();
    });
  }

  const prevBtn = $('prevPageBtn');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderActiveView();
        updateResultCount();
        scrollToTop();
      }
    });
  }

  const nextBtn = $('nextPageBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (state.currentPage < totalPages) {
        state.currentPage++;
        renderActiveView();
        updateResultCount();
        scrollToTop();
      }
    });
  }

  wrap.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentPage = +btn.dataset.page;
      renderActiveView();
      updateResultCount();
      scrollToTop();
    });
  });
}

function scrollToTop() {
  window.scrollTo({ top: $('controlPanel')?.offsetTop || 120, behavior: 'smooth' });
}

/* ── STUDENT DOSSIER MODAL (ALL DATA VISIBLE & POLISHED) ─── */
function setupModalEvents() {
  const bd = $('modalBackdrop');
  if (!bd) return;
  bd.addEventListener('click', e => { if (e.target === bd) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

function openStudentModal(s) {
  const bd = $('modalBackdrop');
  const card = $('dossierCard');
  if (!bd || !card) return;

  const photo = getStudentPhotoPath(s);
  const admRoll = s.admission_roll || '—';

  // Communication buttons
  let commHtml = '';
  if (s.student_phone && s.student_phone !== '—') {
    const raw = s.student_phone.replace(/[^0-9]/g, '');
    if (raw.length >= 10) {
      const intl = raw.startsWith('88') ? raw : ('88' + raw.replace(/^0/, ''));
      commHtml = `
        <div class="comm-buttons">
          <a href="tel:${raw}" class="comm-btn call"><i class="fa-solid fa-phone"></i> Call</a>
          <a href="https://wa.me/${intl}" target="_blank" class="comm-btn whatsapp"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>
          <a href="https://t.me/+${intl}" target="_blank" class="comm-btn telegram"><i class="fa-brands fa-telegram"></i> Telegram</a>
        </div>
      `;
    }
  }

  // Section 1: Student Information
  const studentItems = [
    infoItem('College Roll', s.college_roll, true),
    infoItem('Admission Roll', s.admission_roll, true),
    infoItem('Short Roll', s.short_roll, true),
    infoItem('Date of Birth', s.date_of_birth, false, s),
    infoItem('Gender', s.gender),
    infoItem('Blood Group', s.blood_group),
    infoItem('Religion', s.religion),
    infoItem('Nationality', s.nationality),
    infoItem('Student Phone', s.student_phone, true, s),
    infoItem('Student Email', s.student_email),
    infoItem('Birth Reg / NID', s.nid_birth_reg, true, s),
  ].filter(Boolean);

  // Section 2: Family Information
  let monthlyIncomeVal = '';
  if (s.father_annual_income && !isNaN(s.father_annual_income) && Number(s.father_annual_income) > 0) {
    const m = Math.round(Number(s.father_annual_income) / 12);
    monthlyIncomeVal = `৳ ${m.toLocaleString()}/=`;
  }

  const familyItems = [
    infoItem("Father's Name (EN)", s.father_name_en),
    infoItem("Father's Name (BN)", s.father_name_bn),
    infoItem("Father's Phone", s.father_phone, true, s),
    infoItem("Father's NID", s.father_nid, true),
    infoItem("Father's Occupation", s.father_occupation),
    infoItem("Monthly Income", monthlyIncomeVal),
    infoItem("Annual Income", s.father_annual_income ? `৳ ${Number(s.father_annual_income).toLocaleString()}/=` : ''),
    infoItem("Mother's Name (EN)", s.mother_name_en),
    infoItem("Mother's Name (BN)", s.mother_name_bn),
    infoItem("Mother's Phone", s.mother_phone, true, s),
    infoItem("Mother's NID", s.mother_nid, true),
  ].filter(Boolean);

  // Section 3: Address
  const addressItems = [
    infoItem('Present Address', s.present_address),
    infoItem('Present District', s.present_district),
    infoItem('Permanent Address', s.permanent_address),
    infoItem('Permanent District', s.permanent_district),
    infoItem('Local Guardian', s.local_guardian),
  ].filter(Boolean);

  // Section 4: Academic (SSC)
  const academicItems = [
    infoItem('SSC Roll', s.ssc_roll, true),
    infoItem('SSC Registration', s.ssc_reg, true),
    infoItem('SSC GPA', s.ssc_gpa),
    infoItem('SSC Board', s.ssc_board),
    infoItem('Passing Year', s.ssc_year),
    infoItem('4th Subject', cleanSubjectLabel(s.fourth_subject)),
    infoItem('Elective Subjects', cleanSubjectLabel(s.elective_subjects)),
  ].filter(Boolean);

  // Section 5: Payment
  const paymentItems = [
    infoItem('Admission Fee', s.admission_fee),
    infoItem('Transaction No', s.transaction_no, true),
    infoItem('Bank Name', s.bank_name),
    infoItem('Payment Date', s.payment_date),
    infoItem('Payment Mode', s.payment_mode),
  ].filter(Boolean);

  // Section 6: Enrolled Subjects
  let subjectsHtml = '';
  const subjList = [];
  if (s.all_subjects) {
    s.all_subjects.split(';').map(p => p.trim()).filter(Boolean).forEach(p => {
      let typeLabel = 'Compulsory';
      let cls = 'sbadge mandatory';
      if (/fourth|4th/i.test(p)) {
        typeLabel = '4th Subject';
        cls = 'sbadge fourth';
      } else if (/elective/i.test(p)) {
        typeLabel = 'Elective';
        cls = 'sbadge elective';
      }
      const cName = cleanSubjectName(p);
      if (cName && cName !== '—' && !subjList.some(item => item.name === cName)) {
        subjList.push({ name: cName, type: typeLabel, cls });
      }
    });
  }
  if (!subjList.length && (s.elective_subjects || s.fourth_subject)) {
    if (/science/i.test(s.group_name || 'Science')) {
      subjList.push({ name: 'Bangla', type: 'Compulsory', cls: 'sbadge mandatory' });
      subjList.push({ name: 'English', type: 'Compulsory', cls: 'sbadge mandatory' });
      subjList.push({ name: 'ICT', type: 'Compulsory', cls: 'sbadge mandatory' });
      subjList.push({ name: 'Physics', type: 'Compulsory', cls: 'sbadge mandatory' });
      subjList.push({ name: 'Chemistry', type: 'Compulsory', cls: 'sbadge mandatory' });
    }
    if (s.elective_subjects) {
      const el = cleanSubjectName(s.elective_subjects);
      if (el && el !== '—') subjList.push({ name: el, type: 'Elective', cls: 'sbadge elective' });
    }
    if (s.fourth_subject) {
      const f4 = cleanSubjectName(s.fourth_subject);
      if (f4 && f4 !== '—') subjList.push({ name: f4, type: '4th Subject', cls: 'sbadge fourth' });
    }
  }
  if (subjList.length) {
    const pills = subjList.map(item => `
      <span class="${item.cls}">
        ${esc(item.name)} <span class="sb-type">(${item.type})</span>
      </span>
    `).join('');
    subjectsHtml = `
      <div class="info-sec">
        <div class="info-sec-hdr"><i class="fa-solid fa-book-bookmark"></i> Enrolled Subjects</div>
        <div class="subjects-wrap">${pills}</div>
      </div>
    `;
  }

  // Section 7: Official Documents
  let docsHtml = '';
  if (s.app_pdf_url) {
    docsHtml += `<a href="${s.app_pdf_url}" target="_blank" class="doc-btn pdf"><i class="fa-solid fa-file-pdf"></i> Application Form Reprint PDF</a>`;
  } else if (s.pdf_filename && state.currentBatch?.pdfBase) {
    const gf = (s.group_name || 'Science').toLowerCase().replace(/ /g, '_');
    docsHtml += `<a href="${state.currentBatch.pdfBase}${gf}/${s.pdf_filename}" target="_blank" class="doc-btn pdf"><i class="fa-solid fa-file-pdf"></i> Application Form PDF</a>`;
  }
  if (s.receipt_slip_url) {
    docsHtml += `<a href="${s.receipt_slip_url}" target="_blank" class="doc-btn receipt"><i class="fa-solid fa-receipt"></i> Admission Fee Receipt Slip</a>`;
  }

  const localPdfUrl = getStudentLocalPdfUrl(s);
  const isDC = (state.collegeCode === 'dc');
  const cleanSec = (isDC && s.section && s.section !== '—' && !/science|all/i.test(s.section)) ? s.section.replace(/^(sec|section)\s*/i, '').trim() : '';
  const cleanPrac = (isDC && s.practical_group && s.practical_group !== '—') ? s.practical_group.replace(/^(prac:?|practical:?)\s*/i, '').trim() : '';

  card.innerHTML = `
    <!-- Top Hero -->
    <div class="dos-hero">
      <div class="dos-hero-actions">
        ${localPdfUrl ? `
          <button class="dos-act-btn pdf-btn" id="modalPdfBtn" title="Open Downloaded Application PDF">
            <i class="fa-solid fa-file-pdf"></i>
          </button>
        ` : ''}
        <button class="dos-act-btn pin-btn" id="modalPinBtn" title="Pin / Scroll Header with Page">
          <i class="fa-solid fa-thumbtack"></i>
        </button>
        <button class="dos-act-btn bm-btn ${isBookmarked(s.college_roll || s.admission_roll) ? 'active' : ''}" id="modalBmBtn" title="Bookmark Student" data-bm-roll="${s.college_roll || s.admission_roll}">
          <i class="fa-${isBookmarked(s.college_roll || s.admission_roll) ? 'solid' : 'regular'} fa-bookmark"></i>
        </button>
        <button class="dos-act-btn" id="modalFullPageBtn" title="Toggle Full Page"><i class="fa-solid fa-expand"></i></button>
        <button class="dos-act-btn close-btn" id="modalCloseBtn" title="Close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      ${photo ? `
        <img class="dos-avatar" src="${photo}" alt="${esc(s.student_name_en)}" onclick="window.open(this.src, '_blank')" title="Click to view original full photo">
      ` : `
        <div class="dos-avatar" style="display:flex;align-items:center;justify-content:center;color:var(--text-faint);font-size:36px;"><i class="fa-solid fa-user"></i></div>
      `}
      <div class="dos-info">
        <h2>${esc(s.student_name_en || 'N/A')}</h2>
        <div class="dos-bn bn-text">${esc(s.student_name_bn || '')}</div>
        <div class="dos-badges">
          <span class="dos-badge">${s.group_name || 'Science'}</span>
          ${cleanSec ? `<span class="dos-badge">${cleanSec}</span>` : ''}
          ${cleanPrac ? `<span class="dos-badge">${cleanPrac}</span>` : ''}
          ${s.blood_group && s.blood_group !== '—' ? `<span class="dos-badge bld-badge"><i class="fa-solid fa-droplet" style="color:#EF4444;margin-right:3px;"></i>${s.blood_group}</span>` : ''}
        </div>
      </div>
    </div>

    <!-- Body Sections (Only renders sections that have valid non-empty data) -->
    <div class="dos-body">
      ${studentItems.length ? `
        <div class="info-sec">
          <div class="info-sec-hdr"><i class="fa-solid fa-id-card"></i> Student Information</div>
          <div class="info-grid">${studentItems.join('')}</div>
        </div>` : ''}

      ${familyItems.length ? `
        <div class="info-sec">
          <div class="info-sec-hdr"><i class="fa-solid fa-people-roof"></i> Family Information</div>
          <div class="info-grid">${familyItems.join('')}</div>
        </div>` : ''}

      ${addressItems.length ? `
        <div class="info-sec">
          <div class="info-sec-hdr"><i class="fa-solid fa-location-dot"></i> Address & Guardians</div>
          <div class="info-grid">${addressItems.join('')}</div>
        </div>` : ''}

      ${academicItems.length ? `
        <div class="info-sec">
          <div class="info-sec-hdr"><i class="fa-solid fa-graduation-cap"></i> Academic (SSC) Information</div>
          <div class="info-grid">${academicItems.join('')}</div>
          <div class="ssc-verify-box">
            <button class="btn-ssc-verify" onclick="checkSscResult('${s.ssc_roll || ''}', '${s.ssc_reg || ''}', '${s.ssc_board || ''}', '${s.ssc_year || ''}')" title="Copy SSC Roll & Open sscresult.govt.bd">
              <i class="fa-solid fa-graduation-cap"></i> SSC Result
            </button>
            ${s.ssc_reg ? `
            <button class="btn-copy-reg" onclick="copyText('${s.ssc_reg}', this)" title="Copy SSC Registration Number">
              <i class="fa-regular fa-copy"></i> Copy Reg
            </button>` : ''}
          </div>
        </div>` : ''}

      ${subjectsHtml}

      ${paymentItems.length ? `
        <div class="info-sec">
          <div class="info-sec-hdr"><i class="fa-solid fa-credit-card"></i> Admission & Fee Details</div>
          <div class="info-grid">${paymentItems.join('')}</div>
        </div>` : ''}

      ${docsHtml ? `
        <div class="info-sec">
          <div class="info-sec-hdr"><i class="fa-solid fa-paperclip"></i> Official Documents & Links</div>
          <div class="docs-actions">${docsHtml}</div>
        </div>` : ''}
    </div>
  `;

  $('modalCloseBtn')?.addEventListener('click', closeModal);
  $('modalFullPageBtn')?.addEventListener('click', toggleFullPage);
  $('modalPdfBtn')?.addEventListener('click', () => {
    if (localPdfUrl) window.open(localPdfUrl, '_blank');
  });
  $('modalPinBtn')?.addEventListener('click', () => {
    card.classList.toggle('scroll-header');
    const isScroll = card.classList.contains('scroll-header');
    const btn = $('modalPinBtn');
    if (btn) {
      btn.innerHTML = isScroll ? '<i class="fa-solid fa-arrow-down-up-lock"></i>' : '<i class="fa-solid fa-thumbtack"></i>';
      btn.classList.toggle('active', isScroll);
    }
  });
  $('modalBmBtn')?.addEventListener('click', () => {
    toggleBookmark(s.college_roll || s.admission_roll, $('modalBmBtn'));
  });

  bd.classList.add('show');
  card.scrollTop = 0;
}

function infoItem(label, val, allowCopy, studentContext) {
  if (val === undefined || val === null) return '';
  const cleanVal = String(val).trim();
  if (!cleanVal || cleanVal === 'N/A' || cleanVal === '—' || cleanVal === '0') return '';

  const isPhone = /phone|mobile/i.test(label);
  const isBirthReg = /^birth reg/i.test(label);
  const isDob = /date of birth|dob/i.test(label);

  let actionsHtml = '';
  let valueContent = esc(cleanVal);

  if (isPhone) {
    const rawDigits = cleanVal.replace(/[^0-9]/g, '');
    if (rawDigits.length >= 10) {
      const intl = rawDigits.startsWith('88') ? rawDigits : ('88' + rawDigits.replace(/^0/, ''));
      valueContent = `<a href="tel:${rawDigits}" class="phone-link" title="Click to call ${cleanVal}">${esc(cleanVal)}</a>`;
      actionsHtml = `
        <button class="action-mini-btn copy" onclick="copyText('${cleanVal}', this)" title="Copy Phone Number">
          <i class="fa-regular fa-copy"></i>
        </button>
        <a href="https://wa.me/${intl}" target="_blank" class="action-mini-btn whatsapp" title="Chat on WhatsApp">
          <i class="fa-brands fa-whatsapp"></i>
        </a>
        <a href="https://t.me/+${intl}" target="_blank" class="action-mini-btn telegram" title="Chat on Telegram">
          <i class="fa-brands fa-telegram"></i>
        </a>
      `;
    } else if (allowCopy) {
      actionsHtml = `<button class="action-mini-btn copy" onclick="copyText('${cleanVal}', this)" title="Copy ${label}"><i class="fa-regular fa-copy"></i></button>`;
    }
  } else if (isBirthReg) {
    const dob = studentContext?.date_of_birth || '';
    actionsHtml = `
      <button class="action-mini-btn copy" onclick="copyText('${cleanVal}', this)" title="Copy ${label}">
        <i class="fa-regular fa-copy"></i>
      </button>
      <button class="btn-bdris" onclick="openBdrisVerification('${cleanVal}', '${dob}')" title="Verify Birth Registration on BDRIS (Copies Date of Birth)">
        <i class="fa-solid fa-shield-halved"></i> BDRIS
      </button>
    `;
  } else if (allowCopy) {
    actionsHtml = `
      <button class="action-mini-btn copy" onclick="copyText('${cleanVal}', this)" title="Copy ${label}">
        <i class="fa-regular fa-copy"></i>
      </button>
    `;
  }

  return `
    <div class="ii">
      <div class="il">${label}</div>
      <div class="iv">${valueContent} ${actionsHtml}</div>
    </div>
  `;
}

function closeModal() {
  const bd = $('modalBackdrop');
  if (bd) bd.classList.remove('show');
}
window.closeModal = closeModal;

function toggleFullPage() {
  const bd = $('modalBackdrop');
  const card = $('dossierCard');
  const btn = $('modalFullPageBtn');
  if (!card) return;
  card.classList.toggle('fullpage');
  bd?.classList.toggle('fullpage');
  const isFull = card.classList.contains('fullpage');
  if (btn) btn.innerHTML = isFull ? '<i class="fa-solid fa-compress"></i>' : '<i class="fa-solid fa-expand"></i>';
}
window.toggleFullPage = toggleFullPage;

function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`Copied: ${text}`);
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check" style="color:var(--success);"></i>';
      setTimeout(() => btn.innerHTML = orig, 1500);
    }
  });
}
window.copyText = copyText;

function showToast(msg) {
  let t = $('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--success);margin-right:6px;"></i> ${msg}`;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2200);
}
window.showToast = showToast;

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── SCROLL TO TOP FLOATING ACTION BUTTON ────────────────── */
function initScrollTopButton() {
  let fab = $('scrollTopFab');
  if (!fab) {
    fab = document.createElement('button');
    fab.id = 'scrollTopFab';
    fab.className = 'scroll-top-fab';
    fab.setAttribute('title', 'Scroll to Top (উপরে যান)');
    fab.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
    document.body.appendChild(fab);
  }

  window.addEventListener('scroll', () => {
    if (window.scrollY > 280) {
      fab.classList.add('visible');
    } else {
      fab.classList.remove('visible');
    }
  }, { passive: true });

  fab.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ── PUBLIC INIT FUNCTION ────────────────────────────────── */
window.initPortal = async function(opts) {
  state.collegeCode = opts.collegeCode || 'dc';
  state.collegeName = opts.collegeName || 'Dhaka College';
  state.batches = opts.batches || ALL_BATCHES;

  initAuth();
  initTheme();
  initScrollTopButton();
  updateBookmarkBadge();
  
  // Intelligently select default batch:
  // 1. Honor URL query parameter ?batch=hsc28 or ?batch=28 if provided
  // 2. Otherwise use opts.defaultBatchKey if provided
  // 3. Otherwise default to 'hsc28' (newest batch across all colleges)
  const urlParams = new URLSearchParams(window.location.search);
  const paramBatch = urlParams.get('batch');
  const targetKey = paramBatch 
    ? (paramBatch.startsWith('hsc') ? paramBatch : 'hsc' + paramBatch)
    : (opts.defaultBatchKey || 'hsc28');
  let initialBatch = state.batches.find(b => b.key === targetKey) || state.batches[0];
  buildSwitchers(state.collegeCode, initialBatch ? initialBatch.key : 'hsc28');
  setupSearchAndFilters();
  setupViewToggle();
  setupModalEvents();

  // Bind lock button
  const lockBtn = $('lockPortalBtn');
  if (lockBtn) lockBtn.addEventListener('click', lockPortal);

  if (initialBatch) {
    await switchBatch(initialBatch);
    // If the selected initial batch has 0 students, auto-switch to first batch with real data
    if (state.allStudents.length === 0 && state.batches.length > 1) {
      for (const b of state.batches) {
        if (b.key !== initialBatch.key) {
          const testData = await fetchBatchData(b.jsonUrl);
          if (testData && testData.length > 0) {
            await switchBatch(b);
            break;
          }
        }
      }
    }
  }
};

