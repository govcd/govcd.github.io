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
  { code: 'bbggc', short: 'BBGGC', name: 'Begum Badrunnessa Govt Girls College', icon: 'fa-female' },
  { code: 'gsc',   short: 'GSC',   name: 'Govt. Science College',               icon: 'fa-flask' },
  { code: 'bc',    short: 'BC',    name: 'Govt. Bangla College',                 icon: 'fa-book-open' },
  { code: 'knc',   short: 'KNC',   name: 'Kabi Nazrul Govt. College',            icon: 'fa-feather' },
  { code: 'sgc',   short: 'SGC',   name: 'Savar Govt. College',                  icon: 'fa-graduation-cap' },
];

const ALL_BATCHES = [
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
  }
};

const $ = id => document.getElementById(id);

/* ── PIN AUTHENTICATION (329874) ────────────────────────── */
function initAuth() {
  const overlay = $('authOverlay');
  if (!overlay) return;
  if (sessionStorage.getItem(CONFIG.AUTH_KEY) === 'ok') {
    overlay.classList.add('unlocked');
    return;
  }
  overlay.classList.remove('unlocked');
  const input = $('authPinInput');
  const btn = $('authSubmitBtn');
  const err = $('authErrMsg');

  function checkPin() {
    if (!input) return;
    if (input.value.trim() === CONFIG.PIN) {
      sessionStorage.setItem(CONFIG.AUTH_KEY, 'ok');
      overlay.classList.add('unlocked');
      if (err) err.style.display = 'none';
      showToast('Portal Unlocked Successfully');
    } else {
      input.classList.add('error');
      if (err) {
        err.textContent = 'Incorrect PIN! Please try again.';
        err.style.display = 'block';
      }
      setTimeout(() => input.classList.remove('error'), 400);
      input.value = '';
      input.focus();
    }
  }

  if (btn) btn.addEventListener('click', checkPin);
  if (input) {
    input.addEventListener('keydown', e => { if (e.key === 'Enter') checkPin(); });
    setTimeout(() => input.focus(), 150);
  }
}

function lockPortal() {
  sessionStorage.removeItem(CONFIG.AUTH_KEY);
  const overlay = $('authOverlay');
  if (overlay) {
    overlay.classList.remove('unlocked');
    const input = $('authPinInput');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 200);
    }
  }
  showToast('Portal Locked');
}

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

  // Keyboard shortcut '/' to search
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== sInput && !$('modalBackdrop')?.classList.contains('show') && !$('filterModalBackdrop')?.classList.contains('show')) {
      e.preventDefault();
      sInput?.focus();
    }
  });

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
      state.filters.board = $('fModalBoard')?.value || 'all';
      state.filters.religion = $('fModalReligion')?.value || 'all';
      state.filters.bloodGroup = $('fModalBloodGroup')?.value || 'all';
      state.filters.quota = $('fModalQuota')?.value || 'all';
      state.filters.sscYear = $('fModalSscYear')?.value || 'all';

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
  const brd = $('fModalBoard')?.value || state.filters.board;
  const rel = $('fModalReligion')?.value || state.filters.religion;
  const bg = $('fModalBloodGroup')?.value || state.filters.bloodGroup;
  const qta = $('fModalQuota')?.value || state.filters.quota;
  const yr = $('fModalSscYear')?.value || state.filters.sscYear;

  const count = state.allStudents.filter(s => matchStudentFilters(s, {
    gender: g, group: grp, section: sec, district: dist, board: brd,
    religion: rel, bloodGroup: bg, quota: qta, sscYear: yr
  })).length;

  const countEl = $('filterModalMatchCount');
  if (countEl) countEl.textContent = count.toLocaleString();
}

function resetAllFilters() {
  state.filters = {
    gender: 'all', group: 'all', section: 'all', district: 'all',
    board: 'all', religion: 'all', bloodGroup: 'all', quota: 'all', sscYear: 'all',
  };
  ['fModalGender','fModalGroup','fModalSection','fModalDistrict','fModalBoard',
   'fModalReligion','fModalBloodGroup','fModalQuota','fModalSscYear'].forEach(id => {
    const el = $(id);
    if (el) el.value = 'all';
  });
  if ($('groupFilter')) $('groupFilter').value = 'all';
  if ($('sectionFilter')) $('sectionFilter').value = 'all';
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
  const boards = [...new Set(data.map(s => s.ssc_board).filter(Boolean).map(x => x.trim()))].sort();
  const religions = [...new Set(data.map(s => s.religion).filter(Boolean).map(x => x.trim()))].sort();
  const bloodGroups = [...new Set(data.map(s => s.blood_group).filter(Boolean).map(x => x.trim()))].sort();
  const years = [...new Set(data.map(s => s.ssc_year).filter(Boolean).map(x => x.trim()))].sort();

  fillSelect('fModalGroup', groups, 'All Groups');
  fillSelect('fModalSection', sections, 'All Sections');
  fillSelect('fModalDistrict', districts, 'All Districts');
  fillSelect('fModalBoard', boards, 'All Boards');
  fillSelect('fModalReligion', religions, 'All Religions');
  fillSelect('fModalBloodGroup', bloodGroups, 'All Blood Groups');
  fillSelect('fModalSscYear', years, 'All Passing Years');
}

function fillSelect(id, items, defaultLabel) {
  const el = $(id);
  if (!el) return;
  el.innerHTML = `<option value="all">${defaultLabel}</option>` +
    items.map(it => `<option value="${esc(it)}">${esc(it)}</option>`).join('');
}

function matchStudentFilters(s, f) {
  if (f.gender !== 'all' && (s.gender || '').toLowerCase() !== f.gender.toLowerCase()) return false;
  if (f.group !== 'all' && s.group_name !== f.group) return false;
  if (f.section !== 'all' && s.section !== f.section) return false;
  if (f.district !== 'all') {
    const p1 = (s.present_district || '').toLowerCase();
    const p2 = (s.permanent_district || '').toLowerCase();
    const target = f.district.toLowerCase();
    if (!p1.includes(target) && !p2.includes(target)) return false;
  }
  if (f.board !== 'all' && (s.ssc_board || '').toLowerCase() !== f.board.toLowerCase()) return false;
  if (f.religion !== 'all' && (s.religion || '').toLowerCase() !== f.religion.toLowerCase()) return false;
  if (f.bloodGroup !== 'all' && (s.blood_group || '').toLowerCase() !== f.bloodGroup.toLowerCase()) return false;
  if (f.sscYear !== 'all' && String(s.ssc_year || '') !== String(f.sscYear)) return false;
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
  if (state.filters.gender !== 'all') active.push({ key: 'gender', label: `Gender: ${state.filters.gender}` });
  if (state.filters.group !== 'all') active.push({ key: 'group', label: `Group: ${state.filters.group}` });
  if (state.filters.section !== 'all') active.push({ key: 'section', label: `Sec: ${state.filters.section}` });
  if (state.filters.district !== 'all') active.push({ key: 'district', label: `Zila: ${state.filters.district}` });
  if (state.filters.board !== 'all') active.push({ key: 'board', label: `Board: ${state.filters.board}` });
  if (state.filters.religion !== 'all') active.push({ key: 'religion', label: `Religion: ${state.filters.religion}` });
  if (state.filters.bloodGroup !== 'all') active.push({ key: 'bloodGroup', label: `Blood: ${state.filters.bloodGroup}` });
  if (state.filters.quota !== 'all') active.push({ key: 'quota', label: `Quota: ${state.filters.quota}` });
  if (state.filters.sscYear !== 'all') active.push({ key: 'sscYear', label: `Year: ${state.filters.sscYear}` });

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
  state.filters[key] = 'all';
  const modalEl = {
    gender: 'fModalGender', group: 'fModalGroup', section: 'fModalSection',
    district: 'fModalDistrict', board: 'fModalBoard', religion: 'fModalReligion',
    bloodGroup: 'fModalBloodGroup', quota: 'fModalQuota', sscYear: 'fModalSscYear'
  }[key];
  if (modalEl && $(modalEl)) $(modalEl).value = 'all';
  if (key === 'group' && $('groupFilter')) $('groupFilter').value = 'all';
  if (key === 'section' && $('sectionFilter')) $('sectionFilter').value = 'all';
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

function getStudentPhotoPath(s) {
  if (s.local_photo) return s.local_photo;
  if (s.photo_filename && state.currentBatch && state.currentBatch.photoBase) {
    const gf = (s.group_name || 'Science').toLowerCase().replace(/ /g, '_');
    return state.currentBatch.photoBase + gf + '/' + s.photo_filename;
  }
  return null;
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

  if (state.currentView === 'photos') {
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
        const groupCode = (s.group_name || '').toLowerCase();
        let secTagClass = '';
        if (/humanities|arts/i.test(groupCode)) secTagClass = 'hum-tag';
        else if (/business/i.test(groupCode)) secTagClass = 'bs-tag';
        else if (/commerce/i.test(groupCode)) secTagClass = 'com-tag';

        const rollLabel = s.short_roll ? `#${s.short_roll}` : `#${idx + 1}`;
        const secLabel = s.section ? `Sec ${s.section}` : (s.group_name || 'Science');
        const admRoll = s.admission_roll || '—';

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
              <span class="p-sec-tag ${secTagClass}">${secLabel}</span>
            </div>
            <h4>${esc(s.student_name_en || 'Unknown Student')}</h4>
            <div class="p-meta">Roll: ${s.college_roll || s.short_roll || '—'}</div>
            <div class="p-adm"><i class="fa-solid fa-ticket" style="font-size:10px;margin-right:3px;"></i>Adm: ${admRoll}</div>
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
                ${s.section ? `&bull; <span>Sec ${s.section}</span>` : ''}
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
              <th>Student Name</th>
              <th>College Roll</th>
              <th>Admission Roll</th>
              <th>Group</th>
              <th>Section</th>
              <th>Phone</th>
              <th>Father's Name</th>
              <th>SSC GPA</th>
            </tr>
          </thead>
          <tbody>
            ${students.map((s, idx) => {
              const photo = getStudentPhotoPath(s);
              return `
                <tr data-idx="${idx}">
                  <td style="text-align:center;font-weight:700;color:var(--text-muted);">${s.short_roll || (idx+1)}</td>
                  <td style="text-align:center;">
                    ${photo ? `
                      <img class="tbl-thumb" src="${photo}" alt="" loading="lazy" onerror="this.style.display='none'">
                    ` : `
                      <div class="tbl-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--text-faint);"><i class="fa-solid fa-user"></i></div>
                    `}
                  </td>
                  <td><strong>${esc(s.student_name_en || 'Unknown')}</strong></td>
                  <td style="font-family:monospace;font-weight:600;color:var(--accent);">${s.college_roll || '—'}</td>
                  <td style="font-family:monospace;font-weight:700;color:var(--primary);">${s.admission_roll || '—'}</td>
                  <td><span class="badge badge-grp">${s.group_name || '—'}</span></td>
                  <td>${s.section ? `<span class="badge badge-sec">Sec ${s.section}</span>` : '—'}</td>
                  <td style="font-family:monospace;">${s.student_phone || '—'}</td>
                  <td>${esc(s.father_name_en || '—')}</td>
                  <td><strong style="color:var(--success);">${s.ssc_gpa || '—'}</strong></td>
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
    infoItem('Date of Birth', s.date_of_birth),
    infoItem('Gender', s.gender),
    infoItem('Blood Group', s.blood_group),
    infoItem('Religion', s.religion),
    infoItem('Nationality', s.nationality),
    infoItem('Student Phone', s.student_phone, true),
    infoItem('Student Email', s.student_email),
    infoItem('Birth Reg / NID', s.nid_birth_reg, true),
  ].filter(Boolean);

  // Section 2: Family Information
  const familyItems = [
    infoItem("Father's Name (EN)", s.father_name_en),
    infoItem("Father's Name (BN)", s.father_name_bn),
    infoItem("Father's Phone", s.father_phone, true),
    infoItem("Father's NID", s.father_nid, true),
    infoItem("Father's Occupation", s.father_occupation),
    infoItem("Annual Income", s.father_annual_income ? `৳ ${Number(s.father_annual_income).toLocaleString()}/=` : ''),
    infoItem("Mother's Name (EN)", s.mother_name_en),
    infoItem("Mother's Name (BN)", s.mother_name_bn),
    infoItem("Mother's Phone", s.mother_phone, true),
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
    infoItem('4th Subject', s.fourth_subject),
    infoItem('Elective Subjects', s.elective_subjects),
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
  if (s.all_subjects) {
    const parts = s.all_subjects.split(';').map(p => p.trim()).filter(Boolean);
    if (parts.length) {
      const pills = parts.map(p => {
        let cls = 'sbadge';
        if (p.includes('mandatory')) cls += ' mandatory';
        else if (p.includes('elective')) cls += ' elective';
        else if (p.includes('fourth')) cls += ' fourth';
        return `<span class="${cls}">${esc(p.replace(/mandatory|elective|fourth/gi, '').trim())}</span>`;
      }).join('');
      subjectsHtml = `
        <div class="info-sec">
          <div class="info-sec-hdr"><i class="fa-solid fa-book-bookmark"></i> Enrolled Subjects</div>
          <div class="subjects-wrap">${pills}</div>
        </div>
      `;
    }
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

  card.innerHTML = `
    <!-- Top Hero -->
    <div class="dos-hero">
      <div class="dos-hero-actions">
        <button class="dos-act-btn" id="modalFullPageBtn" title="Toggle Full Page"><i class="fa-solid fa-expand"></i></button>
        <button class="dos-act-btn close-btn" id="modalCloseBtn" title="Close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      ${photo ? `
        <img class="dos-avatar" src="${photo}" alt="${esc(s.student_name_en)}" onclick="window.open(this.src, '_blank')" title="Click to view original full photo">
      ` : `
        <div class="dos-avatar" style="display:flex;align-items:center;justify-content:center;color:var(--text-faint);font-size:42px;"><i class="fa-solid fa-user"></i></div>
      `}
      <div class="dos-info">
        <h2>${esc(s.student_name_en || 'N/A')}</h2>
        <div class="dos-bn bn-text">${esc(s.student_name_bn || '')}</div>
        <div class="dos-badges">
          <span class="dos-badge adm-badge"><i class="fa-solid fa-ticket" style="margin-right:4px;"></i>Admission Roll: <b>${admRoll}</b></span>
          <span class="dos-badge">Roll: <b>${s.college_roll || s.short_roll || '—'}</b></span>
          <span class="dos-badge">${s.group_name || 'Science'}</span>
          ${s.section ? `<span class="dos-badge">Section ${s.section}</span>` : ''}
          ${s.practical_group ? `<span class="dos-badge">Prac: ${s.practical_group}</span>` : ''}
          ${s.blood_group ? `<span class="dos-badge"><i class="fa-solid fa-droplet" style="color:#F87171;margin-right:3px;"></i>${s.blood_group}</span>` : ''}
        </div>
        ${commHtml}
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

  bd.classList.add('show');
  card.scrollTop = 0;
}

function infoItem(label, val, allowCopy) {
  if (val === undefined || val === null) return '';
  const cleanVal = String(val).trim();
  if (!cleanVal || cleanVal === 'N/A' || cleanVal === '—' || cleanVal === '0') return '';

  const copyBtn = allowCopy ? `
    <button class="copy-btn" onclick="copyText('${cleanVal}', this)" title="Copy ${label}">
      <i class="fa-regular fa-copy"></i>
    </button>
  ` : '';
  return `
    <div class="ii">
      <div class="il">${label}</div>
      <div class="iv">${esc(cleanVal)} ${copyBtn}</div>
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
  const t = $('toast');
  if (!t) return;
  t.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--success);margin-right:6px;"></i> ${msg}`;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2200);
}
window.showToast = showToast;

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── PUBLIC INIT FUNCTION ────────────────────────────────── */
window.initPortal = async function(opts) {
  state.collegeCode = opts.collegeCode || 'dc';
  state.collegeName = opts.collegeName || 'Dhaka College';
  state.batches = opts.batches || ALL_BATCHES;

  initAuth();
  initTheme();
  buildSwitchers(state.collegeCode, opts.batches[0]?.key || 'hsc27');
  setupSearchAndFilters();
  setupViewToggle();
  setupModalEvents();

  // Bind lock button
  const lockBtn = $('lockPortalBtn');
  if (lockBtn) lockBtn.addEventListener('click', lockPortal);

  if (opts.batches && opts.batches.length > 0) {
    await switchBatch(opts.batches[0]);
  }
};
