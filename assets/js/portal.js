/* ============================================================
   GOVCD Portal Engine — portal.js
   Matching #datascaping/dcdata design and features
   ============================================================ */

'use strict';

const CONFIG = {
  AUTH_HASH: 'ea526e105b4ed1e24beeefa8f6e684538e64af062d1b880201f6db4444d2b489',
  AUTH_SALT: 'govcd_sec_v2_2026_bd',
  AUTH_KEY: 'govcd_auth_v2',
  LOCKOUT_KEY: 'govcd_lockout_state',
  MAX_ATTEMPTS: 5,
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
  startPage: 1,
  pageSize: 150,
  currentView: 'photos', // 'photos' (default), 'compact', 'table'
  isLoading: false,
  sortColumn: null, // 'monthly_income', 'annual_income', 'college_roll', 'admission_roll', 'ssc_gpa', 'ssc_year', 'student_name_en'
  sortDirection: 'desc',

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
    incomePreset: 'all', // 'all', 'lt_20k', '20k_50k', '50k_1lakh', 'gt_1lakh'
    incomeMin: null,
    incomeMax: null,
  }
};

const $ = id => document.getElementById(id);

/* ── CRYPTOGRAPHIC SHA-256 (WebCrypto with Standard Fallback) ── */
async function computeSha256(str) {
  if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
    try {
      const data = new TextEncoder().encode(str);
      const buf = await window.crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {}
  }
  return pureSha256(str);
}

function pureSha256(ascii) {
  function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i, j;
  let result = '';
  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  let hash = pureSha256.h = pureSha256.h || [];
  const k = pureSha256.k = pureSha256.k || [];
  let primeCounter = k[lengthProperty];
  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  hash = hash.slice(0);
  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return;
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiBitLength | 0);
  for (j = 0; j < words[lengthProperty];) {
    const w = words.slice(j, j += 16);
    const oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0)) | 0;
      const temp2 = ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + ((hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]))) | 0;
      hash = [(temp1 + temp2) | 0, hash[0], hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]];
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (b * 8)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}

/* ── LOCKOUT & RATE-LIMITING ──────────────────────────────── */
function getLockoutState() {
  try {
    const raw = localStorage.getItem(CONFIG.LOCKOUT_KEY);
    if (!raw) return { attempts: 0, lockedUntil: 0 };
    return JSON.parse(raw);
  } catch (e) {
    return { attempts: 0, lockedUntil: 0 };
  }
}

function setLockoutState(s) {
  try {
    localStorage.setItem(CONFIG.LOCKOUT_KEY, JSON.stringify(s));
  } catch (e) {}
}

let countdownTimer = null;
function checkLockoutTimer() {
  const input = $('authPinInput');
  const btn = $('authSubmitBtn');
  const err = $('authErrMsg');
  const ls = getLockoutState();
  const now = Date.now();

  if (ls.lockedUntil && now < ls.lockedUntil) {
    if (input) input.disabled = true;
    if (btn) btn.disabled = true;
    const remainingSec = Math.ceil((ls.lockedUntil - now) / 1000);
    const m = String(Math.floor(remainingSec / 60)).padStart(2, '0');
    const s = String(remainingSec % 60).padStart(2, '0');
    if (err) {
      err.innerHTML = `<i class="fa-solid fa-clock-rotate-left" style="margin-right:5px;"></i> Too many failed attempts. Locked for <strong>${m}:${s}</strong>.`;
      err.classList.add('show');
      err.style.display = 'block';
    }
    if (!countdownTimer) {
      countdownTimer = setInterval(() => {
        const cur = getLockoutState();
        const diff = cur.lockedUntil - Date.now();
        if (diff <= 0) {
          clearInterval(countdownTimer);
          countdownTimer = null;
          cur.lockedUntil = 0;
          setLockoutState(cur);
          if (input) { input.disabled = false; input.focus(); }
          if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-lock-open"></i> Unlock Portal'; }
          if (err) { err.classList.remove('show'); err.style.display = 'none'; }
        } else {
          checkLockoutTimer();
        }
      }, 1000);
    }
    return true;
  }
  if (input) input.disabled = false;
  if (btn) btn.disabled = false;
  return false;
}

/* ── SECURE AUTHENTICATION ENGINE ──────────────────────────── */
function initAuth() {
  const overlay = $('authOverlay');
  if (!overlay) return;
  const input = $('authPinInput');
  const btn = $('authSubmitBtn');
  const err = $('authErrMsg');

  // Check lockout on load
  checkLockoutTimer();

  async function checkPin() {
    if (checkLockoutTimer()) return;
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

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Verifying...';

    const inputHash = await computeSha256(CONFIG.AUTH_SALT + '_' + val);

    if (inputHash === CONFIG.AUTH_HASH) {
      // Clear lockout state on success
      setLockoutState({ attempts: 0, lockedUntil: 0 });
      sessionStorage.setItem(CONFIG.AUTH_KEY, 'ok');
      localStorage.setItem(CONFIG.AUTH_KEY, 'ok');
      overlay.classList.add('unlocked');
      if (err) {
        err.classList.remove('show');
        err.style.display = 'none';
      }
      showToast('Portal Unlocked Successfully');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-lock-open"></i> Unlock Portal';

      // Reload active batch if needed
      if (state.currentBatch && state.allStudents.length === 0) {
        switchBatch(state.currentBatch);
      }
    } else {
      const ls = getLockoutState();
      ls.attempts = (ls.attempts || 0) + 1;
      let lockoutMsg = '';
      if (ls.attempts >= CONFIG.MAX_ATTEMPTS) {
        const lockoutMins = ls.attempts === CONFIG.MAX_ATTEMPTS ? 2 : (ls.attempts === CONFIG.MAX_ATTEMPTS + 1 ? 15 : 60);
        ls.lockedUntil = Date.now() + (lockoutMins * 60 * 1000);
        setLockoutState(ls);
        checkLockoutTimer();
        btn.innerHTML = '<i class="fa-solid fa-lock"></i> Locked';
        return;
      } else {
        const remaining = CONFIG.MAX_ATTEMPTS - ls.attempts;
        lockoutMsg = ` (${remaining} attempt${remaining > 1 ? 's' : ''} remaining)`;
      }
      setLockoutState(ls);

      input.classList.add('error');
      if (err) {
        err.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="margin-right:4px;"></i> Incorrect PIN! Please try again.${lockoutMsg}`;
        err.classList.add('show');
        err.style.display = 'block';
      }
      setTimeout(() => input.classList.remove('error'), 400);
      input.value = '';
      input.focus();
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-lock-open"></i> Unlock Portal';
    }
  }

  // Bind events unconditionally
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
      if (err && !checkLockoutTimer()) {
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

  initTamperGuard();
}
window.initAuth = initAuth;

/* ── DOM TAMPER GUARD ──────────────────────────────────────── */
function initTamperGuard() {
  const overlay = $('authOverlay');
  if (!overlay || window.__tamperGuardActive) return;
  window.__tamperGuardActive = true;

  const observer = new MutationObserver(() => {
    const isAuth = sessionStorage.getItem(CONFIG.AUTH_KEY) === 'ok' || localStorage.getItem(CONFIG.AUTH_KEY) === 'ok';
    if (!isAuth) {
      if (!document.body.contains(overlay) || overlay.style.display === 'none' || overlay.style.visibility === 'hidden') {
        state.allStudents = [];
        state.filteredStudents = [];
        const container = $('viewsContainer');
        if (container) container.innerHTML = '';
        overlay.style.display = 'flex';
        overlay.style.visibility = 'visible';
        overlay.style.opacity = '1';
        overlay.classList.remove('unlocked');
        if (!document.body.contains(overlay)) {
          document.body.prepend(overlay);
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, attributes: true, subtree: true });
}

/* ── ZERO-TRACE PORTAL LOCK ────────────────────────────────── */
function lockPortal() {
  sessionStorage.removeItem(CONFIG.AUTH_KEY);
  localStorage.removeItem(CONFIG.AUTH_KEY);
  state.allStudents = [];
  state.filteredStudents = [];
  const container = $('viewsContainer');
  if (container) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--text-muted);">
        <i class="fa-solid fa-lock fa-2x" style="color:var(--accent);margin-bottom:12px;"></i>
        <p style="font-weight:600;font-size:14px;">Portal is locked. Please authenticate to view student records.</p>
      </div>
    `;
  }
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
  showToast('Portal Locked & Memory Cleared');
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

/* ── FORMAT GPA (2 DECIMAL PLACES: e.g. 5 -> 5.00, 4.98 -> 4.98) ── */
function formatGpa(gpa) {
  if (gpa === null || gpa === undefined) return '—';
  const s = String(gpa).trim();
  if (!s || s === '—' || s === 'N/A' || s === '0') return '—';
  const num = parseFloat(s);
  if (isNaN(num) || num <= 0) return s;
  return num.toFixed(2);
}

/* ── SWITCH BATCH ────────────────────────────────────────── */
async function switchBatch(batch) {
  state.currentBatch = batch;
  state.currentPage = 1;
  state.startPage = 1;
  const btnText = $('batchBtnText');
  if (btnText) btnText.innerHTML = `<i class="fa-solid fa-graduation-cap"></i> ${batch.label} <i class="fa-solid fa-chevron-down" style="font-size:9px;margin-left:2px;"></i>`;
  buildBatchSwitcher(batch.key);

  showLoadingState();
  const data = await fetchBatchData(batch.jsonUrl);
  data.forEach(s => {
    if (s.ssc_board) s.ssc_board = normalizeBoardName(s.ssc_board, s.ssc_gpa);
    if (s.ssc_gpa) s.ssc_gpa = formatGpa(s.ssc_gpa);
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
    sInput.placeholder = "Search anything, or use #109, /f (family), /p (personal), /a (address), /s (ssc)...";
    let timer = null;
    sInput.addEventListener('input', () => {
      if (clearBtn) clearBtn.style.display = sInput.value ? 'block' : 'none';
      updateActiveSearchChips(sInput.value);
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.currentPage = 1;
        state.startPage = 1;
        applyFilters();
      }, 200);
    });
  }

  if (clearBtn && sInput) {
    clearBtn.addEventListener('click', () => {
      sInput.value = '';
      clearBtn.style.display = 'none';
      updateActiveSearchChips('');
      state.currentPage = 1;
      state.startPage = 1;
      applyFilters();
      sInput.focus();
    });
  }

  // Inject Quick Command Chips below search bar if not present
  const searchRow = document.querySelector('.search-row');
  if (searchRow && !$('searchCmdChips')) {
    const chipsWrap = document.createElement('div');
    chipsWrap.className = 'search-cmd-chips';
    chipsWrap.id = 'searchCmdChips';
    chipsWrap.innerHTML = `
      <span class="search-cmd-label"><i class="fa-solid fa-bolt"></i> Scoped:</span>
      <button type="button" class="search-cmd-chip" data-prefix="#" title="Exact roll numbers (e.g. #109, #876)"><kbd>#</kbd> Roll</button>
      <button type="button" class="search-cmd-chip" data-prefix="/f " title="Family info: Father, Mother, Profession, Income, NID, Phone"><kbd>/f</kbd> Family</button>
      <button type="button" class="search-cmd-chip" data-prefix="/p " title="Personal info: DOB, NID/BRN, Phone, Blood Group, Religion"><kbd>/p</kbd> Personal</button>
      <button type="button" class="search-cmd-chip" data-prefix="/a " title="Address: Present, Permanent, District, Local Guardian"><kbd>/a</kbd> Address</button>
      <button type="button" class="search-cmd-chip" data-prefix="/s " title="SSC & Academic: Roll, Reg, GPA, Board, Subjects"><kbd>/s</kbd> SSC</button>
    `;
    searchRow.appendChild(chipsWrap);

    chipsWrap.querySelectorAll('.search-cmd-chip').forEach(chip => {
      chip.addEventListener('click', e => {
        e.preventDefault();
        const prefix = chip.getAttribute('data-prefix');
        if (!sInput) return;
        const curVal = sInput.value.trim();
        if (!curVal) {
          sInput.value = prefix;
        } else if (curVal.includes(prefix.trim())) {
          sInput.focus();
          return;
        } else {
          sInput.value = curVal + ' ' + prefix;
        }
        if (clearBtn) clearBtn.style.display = 'block';
        updateActiveSearchChips(sInput.value);
        sInput.focus();
        state.currentPage = 1;
        state.startPage = 1;
        applyFilters();
      });
    });
  }

  if (gSelect) {
    gSelect.addEventListener('change', () => {
      state.filters.group = gSelect.value;
      const mGroup = $('fModalGroup');
      if (mGroup) mGroup.value = gSelect.value;
      state.currentPage = 1;
      state.startPage = 1;
      applyFilters();
    });
  }

  if (secSelect) {
    secSelect.addEventListener('change', () => {
      state.filters.section = secSelect.value;
      const mSec = $('fModalSection');
      if (mSec) mSec.value = secSelect.value;
      state.currentPage = 1;
      state.startPage = 1;
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
      state.startPage = 1;
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

  // Dynamically ensure Father's Monthly Income filter UI exists inside filter modal
  let incBox = $('fModalIncomeBox');
  if (!incBox) {
    const fGrid = document.querySelector('#filterModalCard .filter-card-body, #filterModalCard .f-grid');
    if (fGrid) {
      const div = document.createElement('div');
      div.id = 'fModalIncomeBox';
      div.className = 'f-field';
      div.style.gridColumn = '1 / -1';
      div.style.marginBottom = '6px';
      div.innerHTML = `
        <label class="f-lbl"><i class="fa-solid fa-money-bill-wave" style="color:var(--success);margin-right:6px;"></i>Father's Monthly Income (বাবার মাসিক আয়)</label>
        <div class="income-filter-container">
          <select class="f-input" id="fModalIncomeSelect">
            <option value="all">All Incomes (সকল মাসিক আয়)</option>
            <option value="lt_20k">&lt; ৳20,000 (২০ হাজার টাকার নিচে)</option>
            <option value="20k_50k">৳20,000 – ৳50,000 (২০হাজার থেকে ৫০হাজার)</option>
            <option value="50k_1lakh">৳50,000 – ৳1,00,000 (৫০হাজার থেকে ১লাখ)</option>
            <option value="gt_1lakh">&gt; ৳1,00,000 (১ লাখ টাকার বেশি)</option>
            <option value="custom">Custom Range (কাস্টম আয় রেঞ্জ)</option>
          </select>
          <div class="income-quick-chips">
            <button type="button" class="inc-chip active" data-preset="all">All Incomes</button>
            <button type="button" class="inc-chip" data-preset="lt_20k">&lt; ৳20k</button>
            <button type="button" class="inc-chip" data-preset="20k_50k">৳20k–50k</button>
            <button type="button" class="inc-chip" data-preset="50k_1lakh">৳50k–1L</button>
            <button type="button" class="inc-chip" data-preset="gt_1lakh">&gt; ৳1L</button>
          </div>
          <div class="income-custom-row" id="incomeCustomRow">
            <div class="inc-input-box">
              <span>৳</span>
              <input type="number" id="fModalIncomeMin" class="f-input" placeholder="Min ৳" min="0" step="5000">
            </div>
            <span class="inc-sep">—</span>
            <div class="inc-input-box">
              <span>৳</span>
              <input type="number" id="fModalIncomeMax" class="f-input" placeholder="Max ৳" min="0" step="5000">
            </div>
          </div>
        </div>
      `;
      const sscYearField = $('fModalSscYear')?.closest('.f-field');
      if (sscYearField && sscYearField.parentNode === fGrid) {
        fGrid.insertBefore(div, sscYearField);
      } else {
        fGrid.appendChild(div);
      }

      // Synchronize Select and Quick Chips
      const incSel = $('fModalIncomeSelect');
      const chips = div.querySelectorAll('.inc-chip');

      incSel?.addEventListener('change', () => {
        const val = incSel.value;
        chips.forEach(c => c.classList.toggle('active', c.dataset.preset === val));
        if (val !== 'custom') {
          const minEl = $('fModalIncomeMin');
          const maxEl = $('fModalIncomeMax');
          if (minEl) minEl.value = '';
          if (maxEl) maxEl.value = '';
        }
        updateFilterModalMatchCount();
      });

      chips.forEach(btn => {
        btn.addEventListener('click', () => {
          chips.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (incSel) incSel.value = btn.dataset.preset;
          const minEl = $('fModalIncomeMin');
          const maxEl = $('fModalIncomeMax');
          if (minEl) minEl.value = '';
          if (maxEl) maxEl.value = '';
          updateFilterModalMatchCount();
        });
      });

      // Custom Range Inputs
      const onCustomInput = () => {
        chips.forEach(b => b.classList.remove('active'));
        if (incSel) incSel.value = 'custom';
        updateFilterModalMatchCount();
      };
      $('fModalIncomeMin')?.addEventListener('input', onCustomInput);
      $('fModalIncomeMax')?.addEventListener('input', onCustomInput);
    }
  }

  if (openBtn && bd) {
    openBtn.addEventListener('click', () => {
      // Sync income controls with state
      const p = state.filters.incomePreset || 'all';
      if ($('fModalIncomeSelect')) $('fModalIncomeSelect').value = p;
      document.querySelectorAll('.inc-chip').forEach(b => {
        b.classList.toggle('active', b.dataset.preset === p);
      });
      if ($('fModalIncomeMin')) $('fModalIncomeMin').value = state.filters.incomeMin || '';
      if ($('fModalIncomeMax')) $('fModalIncomeMax').value = state.filters.incomeMax || '';

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

      // Read income filters
      const selVal = $('fModalIncomeSelect')?.value || 'all';
      state.filters.incomePreset = (selVal === 'custom') ? 'all' : selVal;
      const minVal = $('fModalIncomeMin')?.value ? parseFloat($('fModalIncomeMin').value) : null;
      const maxVal = $('fModalIncomeMax')?.value ? parseFloat($('fModalIncomeMax').value) : null;
      state.filters.incomeMin = (!isNaN(minVal) && minVal > 0) ? minVal : null;
      state.filters.incomeMax = (!isNaN(maxVal) && maxVal > 0) ? maxVal : null;

      // Sync quick selects
      if ($('groupFilter')) $('groupFilter').value = state.filters.group;
      if ($('sectionFilter')) $('sectionFilter').value = state.filters.section;

      bd.classList.remove('show');
      state.currentPage = 1;
      state.startPage = 1;
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

  const selVal = $('fModalIncomeSelect')?.value || state.filters.incomePreset || 'all';
  const incPreset = (selVal === 'custom') ? 'all' : selVal;
  const minVal = $('fModalIncomeMin')?.value ? parseFloat($('fModalIncomeMin').value) : null;
  const maxVal = $('fModalIncomeMax')?.value ? parseFloat($('fModalIncomeMax').value) : null;

  const count = state.allStudents.filter(s => matchStudentFilters(s, {
    gender: g, group: grp, section: sec, district: dist,
    presentDistrict: presDist, permanentDistrict: permDist,
    board: brd, religion: rel, bloodGroup: bg, quota: qta, sscYear: yr,
    fourthSubject: s4th, electiveSubject: selec, gpa: gpa,
    bookmarkedOnly: state.filters.bookmarkedOnly,
    incomePreset: incPreset,
    incomeMin: (!isNaN(minVal) && minVal > 0) ? minVal : null,
    incomeMax: (!isNaN(maxVal) && maxVal > 0) ? maxVal : null,
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
    incomePreset: 'all', incomeMin: null, incomeMax: null
  };
  ['fModalGender','fModalGroup','fModalSection','fModalDistrict','fModalBoard',
   'fModalReligion','fModalBloodGroup','fModalQuota','fModalSscYear',
   'fModalPresentDistrict','fModalPermanentDistrict','fModalFourthSubject',
   'fModalElectiveSubject','fModalGpa'].forEach(id => {
    const el = $(id);
    if (el) el.value = 'all';
  });

  if ($('fModalIncomeSelect')) $('fModalIncomeSelect').value = 'all';
  document.querySelectorAll('.inc-chip').forEach(b => {
    b.classList.toggle('active', b.dataset.preset === 'all');
  });
  if ($('fModalIncomeMin')) $('fModalIncomeMin').value = '';
  if ($('fModalIncomeMax')) $('fModalIncomeMax').value = '';

  if ($('groupFilter')) $('groupFilter').value = 'all';
  if ($('sectionFilter')) $('sectionFilter').value = 'all';
  const bmFilterBtn = $('filterBookmarksBtn');
  if (bmFilterBtn) bmFilterBtn.classList.remove('active');
  state.currentPage = 1;
  state.startPage = 1;
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

  // Father's Monthly Income Filter
  if (f.incomePreset && f.incomePreset !== 'all') {
    const annual = Number(s.father_annual_income);
    const monthly = (annual > 0 && !isNaN(annual)) ? Math.round(annual / 12) : 0;
    if (f.incomePreset === 'lt_20k') {
      if (monthly >= 20000 || monthly <= 0) return false;
    } else if (f.incomePreset === '20k_50k') {
      if (monthly < 20000 || monthly > 50000) return false;
    } else if (f.incomePreset === '50k_1lakh') {
      if (monthly < 50000 || monthly > 100000) return false;
    } else if (f.incomePreset === 'gt_1lakh') {
      if (monthly <= 100000) return false;
    }
  }
  if (f.incomeMin !== null && f.incomeMin !== undefined && !isNaN(f.incomeMin) && f.incomeMin > 0) {
    const annual = Number(s.father_annual_income);
    const monthly = (annual > 0 && !isNaN(annual)) ? Math.round(annual / 12) : 0;
    if (monthly < f.incomeMin) return false;
  }
  if (f.incomeMax !== null && f.incomeMax !== undefined && !isNaN(f.incomeMax) && f.incomeMax > 0) {
    const annual = Number(s.father_annual_income);
    const monthly = (annual > 0 && !isNaN(annual)) ? Math.round(annual / 12) : 0;
    if (monthly > f.incomeMax) return false;
  }

  return true;
}

/* ── ADVANCED SEARCH ENGINE (Multi-Command Scoped Parser & Exact Roll Engine) ── */
function parseSearchQuery(rawQ) {
  if (!rawQ) return null;
  const q = rawQ.trim();
  if (!q) return null;

  const constraints = {};

  // 1. Exact roll numbers from #
  let hashRolls = [];
  if (q.startsWith('#')) {
    const prefixPart = q.split(/\s+\/(?=[fpas])/i)[0];
    hashRolls = prefixPart.match(/\d+/g) || [];
  } else {
    hashRolls = [...q.matchAll(/#\s*(\d+)/g)].map(m => m[1]);
  }
  if (hashRolls.length > 0) {
    constraints.rolls = hashRolls.map(r => parseInt(r, 10)).filter(n => !isNaN(n));
  }

  // 2. Extract slash commands (/f, /p, /a, /s)
  const cmdRegex = /\/(f(?:amily)?|p(?:ersonal)?|a(?:ddress|ddr)?|s(?:sc|academic)?)(?:\s+|$)(.*?)(?=(?:\/(?:f|family|p|personal|a|addr|address|s|ssc|academic)(?:\s+|$)|$))/gi;
  let match;
  while ((match = cmdRegex.exec(q)) !== null) {
    const key = match[1].toLowerCase()[0]; // 'f', 'p', 'a', 's'
    let term = (match[2] || '').trim();
    term = term.replace(/#\s*\d+/g, '').replace(/^[,;\s]+|[,;\s]+$/g, '').trim();
    if (term) {
      constraints[key] = term.toLowerCase();
    } else {
      constraints[key] = ''; // prefix entered without argument yet
    }
  }

  // 3. Fallback: if no slash commands and no hash rolls found
  if (Object.keys(constraints).length === 0) {
    constraints.general = q.toLowerCase();
  }

  return constraints;
}

function matchSearchQuery(s, rawQ) {
  if (!rawQ) return true;
  const c = parseSearchQuery(rawQ);
  if (!c) return true;

  // 1. Exact roll numbers check
  if (c.rolls && c.rolls.length > 0) {
    const sShort = parseInt(s.short_roll, 10);
    const sCollege = parseInt(s.college_roll, 10);
    const sAdm = parseInt(s.admission_roll, 10);

    const matchRoll = c.rolls.some(t => {
      if (!isNaN(sShort) && sShort === t) return true;
      if (s.short_roll && (s.short_roll === String(t) || s.short_roll === String(t).padStart(4, '0'))) return true;
      if (!isNaN(sAdm) && sAdm === t) return true;
      if (!isNaN(sCollege) && sCollege === t) return true;
      return false;
    });
    if (!matchRoll) return false;
  }

  // 2. Family constraint (/f)
  if (c.f !== undefined && c.f !== '') {
    const term = c.f;
    const annual = s.father_annual_income ? String(s.father_annual_income).trim() : '';
    const annualNum = Number(annual);
    const monthly = (!isNaN(annualNum) && annualNum > 0) ? String(Math.round(annualNum / 12)) : '';

    const matchF = (s.father_name_en || '').toLowerCase().includes(term) ||
                   (s.father_name_bn || '').toLowerCase().includes(term) ||
                   (s.father_occupation || '').toLowerCase().includes(term) ||
                   (s.father_phone || '').includes(term) ||
                   (s.father_nid || '').includes(term) ||
                   annual.includes(term) ||
                   monthly.includes(term) ||
                   (s.mother_name_en || '').toLowerCase().includes(term) ||
                   (s.mother_name_bn || '').toLowerCase().includes(term) ||
                   (s.mother_occupation || '').toLowerCase().includes(term) ||
                   (s.mother_phone || '').includes(term) ||
                   (s.mother_nid || '').includes(term) ||
                   (s.local_guardian || '').toLowerCase().includes(term);
    if (!matchF) return false;
  }

  // 3. Personal constraint (/p)
  if (c.p !== undefined && c.p !== '') {
    const term = c.p;
    const matchP = (s.student_name_en || '').toLowerCase().includes(term) ||
                   (s.student_name_bn || '').toLowerCase().includes(term) ||
                   (s.date_of_birth || '').toLowerCase().includes(term) ||
                   (s.nid_birth_reg || '').includes(term) ||
                   (s.student_phone || '').includes(term) ||
                   (s.student_email || '').toLowerCase().includes(term) ||
                   (s.gender || '').toLowerCase().includes(term) ||
                   (s.blood_group || '').toLowerCase().includes(term) ||
                   (s.religion || '').toLowerCase().includes(term) ||
                   (s.quota || '').toLowerCase().includes(term) ||
                   (s.nationality || '').toLowerCase().includes(term);
    if (!matchP) return false;
  }

  // 4. Address constraint (/a)
  if (c.a !== undefined && c.a !== '') {
    const term = c.a;
    const matchA = (s.present_address || '').toLowerCase().includes(term) ||
                   (s.present_district || '').toLowerCase().includes(term) ||
                   (s.permanent_address || '').toLowerCase().includes(term) ||
                   (s.permanent_district || '').toLowerCase().includes(term) ||
                   (s.local_guardian || '').toLowerCase().includes(term);
    if (!matchA) return false;
  }

  // 5. SSC constraint (/s)
  if (c.s !== undefined && c.s !== '') {
    const term = c.s;
    const gpaFormatted = formatGpa(s.ssc_gpa);
    const matchS = (s.ssc_roll || '').includes(term) ||
                   (s.ssc_reg || '').includes(term) ||
                   (s.ssc_gpa || '').includes(term) ||
                   gpaFormatted.includes(term) ||
                   (s.ssc_board || '').toLowerCase().includes(term) ||
                   (s.ssc_year || '').includes(term) ||
                   (s.group_name || '').toLowerCase().includes(term) ||
                   (s.section || '').toLowerCase().includes(term) ||
                   (s.practical_group || '').toLowerCase().includes(term) ||
                   (s.fourth_subject || '').toLowerCase().includes(term) ||
                   (s.elective_subjects || '').toLowerCase().includes(term) ||
                   (s.all_subjects || '').toLowerCase().includes(term) ||
                   (s.college_roll || '').includes(term) ||
                   (s.admission_roll || '').includes(term);
    if (!matchS) return false;
  }

  // 6. General constraint (no slash commands, no #)
  if (c.general !== undefined) {
    const term = c.general;
    const annual = s.father_annual_income ? String(s.father_annual_income).trim() : '';
    const gpaFormatted = formatGpa(s.ssc_gpa);
    const matchGen = (s.student_name_en || '').toLowerCase().includes(term) ||
                     (s.student_name_bn || '').toLowerCase().includes(term) ||
                     (s.short_roll || '').includes(term) ||
                     (s.college_roll || '').includes(term) ||
                     (s.admission_roll || '').includes(term) ||
                     (s.section || '').toLowerCase().includes(term) ||
                     (s.student_phone || '').includes(term) ||
                     (s.father_name_en || '').toLowerCase().includes(term) ||
                     (s.father_name_bn || '').toLowerCase().includes(term) ||
                     (s.father_occupation || '').toLowerCase().includes(term) ||
                     (s.father_phone || '').includes(term) ||
                     (s.father_nid || '').includes(term) ||
                     (s.mother_name_en || '').toLowerCase().includes(term) ||
                     (s.mother_name_bn || '').toLowerCase().includes(term) ||
                     (s.mother_occupation || '').toLowerCase().includes(term) ||
                     (s.mother_phone || '').includes(term) ||
                     (s.mother_nid || '').includes(term) ||
                     (s.nid_birth_reg || '').includes(term) ||
                     (s.date_of_birth || '').toLowerCase().includes(term) ||
                     (s.present_address || '').toLowerCase().includes(term) ||
                     (s.present_district || '').toLowerCase().includes(term) ||
                     (s.permanent_address || '').toLowerCase().includes(term) ||
                     (s.permanent_district || '').toLowerCase().includes(term) ||
                     (s.local_guardian || '').toLowerCase().includes(term) ||
                     (s.ssc_roll || '').includes(term) ||
                     (s.ssc_reg || '').includes(term) ||
                     (s.ssc_board || '').toLowerCase().includes(term) ||
                     (s.student_email || '').toLowerCase().includes(term) ||
                     (s.fourth_subject || '').toLowerCase().includes(term) ||
                     (s.elective_subjects || '').toLowerCase().includes(term) ||
                     gpaFormatted.includes(term) ||
                     annual.includes(term);
    if (!matchGen) return false;
  }

  return true;
}

function updateActiveSearchChips(rawQ) {
  const c = parseSearchQuery(rawQ);
  const chips = document.querySelectorAll('.search-cmd-chip');
  if (!chips || chips.length === 0) return;

  chips.forEach(chip => {
    const prefix = chip.getAttribute('data-prefix').trim();
    let isActive = false;
    if (!c) {
      isActive = false;
    } else if (prefix === '#') {
      isActive = Boolean(c.rolls && c.rolls.length > 0) || (rawQ || '').includes('#');
    } else if (prefix === '/f') {
      isActive = c.f !== undefined;
    } else if (prefix === '/p') {
      isActive = c.p !== undefined;
    } else if (prefix === '/a') {
      isActive = c.a !== undefined;
    } else if (prefix === '/s') {
      isActive = c.s !== undefined;
    }
    chip.classList.toggle('active', isActive);
  });
}

function applyFilters() {
  const rawQ = $('searchInput')?.value || '';
  updateActiveSearchChips(rawQ);

  state.filteredStudents = state.allStudents.filter(s => {
    if (!matchStudentFilters(s, state.filters)) return false;
    if (!matchSearchQuery(s, rawQ)) return false;
    return true;
  });

  // Table Sorting (Ascending / Descending)
  if (state.sortColumn) {
    const col = state.sortColumn;
    const dir = (state.sortDirection === 'asc') ? 1 : -1;
    state.filteredStudents.sort((a, b) => {
      if (col === 'monthly_income') {
        const vA = (a.father_annual_income && !isNaN(a.father_annual_income)) ? Math.round(Number(a.father_annual_income) / 12) : 0;
        const vB = (b.father_annual_income && !isNaN(b.father_annual_income)) ? Math.round(Number(b.father_annual_income) / 12) : 0;
        return (vA - vB) * dir;
      }
      if (col === 'annual_income') {
        const vA = (a.father_annual_income && !isNaN(a.father_annual_income)) ? Number(a.father_annual_income) : 0;
        const vB = (b.father_annual_income && !isNaN(b.father_annual_income)) ? Number(b.father_annual_income) : 0;
        return (vA - vB) * dir;
      }
      if (col === 'ssc_gpa') {
        const vA = parseFloat(a.ssc_gpa) || 0;
        const vB = parseFloat(b.ssc_gpa) || 0;
        return (vA - vB) * dir;
      }
      if (col === 'college_roll') {
        const vA = parseInt(a.college_roll || a.short_roll || '0', 10) || 0;
        const vB = parseInt(b.college_roll || b.short_roll || '0', 10) || 0;
        return (vA - vB) * dir;
      }
      if (col === 'admission_roll') {
        const vA = parseInt(a.admission_roll || '0', 10) || 0;
        const vB = parseInt(b.admission_roll || '0', 10) || 0;
        return (vA - vB) * dir;
      }
      if (col === 'ssc_year') {
        const vA = parseInt(a.ssc_year || '0', 10) || 0;
        const vB = parseInt(b.ssc_year || '0', 10) || 0;
        return (vA - vB) * dir;
      }
      if (col === 'student_name_en') {
        const vA = (a.student_name_en || '').toLowerCase();
        const vB = (b.student_name_en || '').toLowerCase();
        return vA.localeCompare(vB) * dir;
      }
      return 0;
    });
  }

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

  // Income Filter Chips
  if (state.filters.incomePreset && state.filters.incomePreset !== 'all') {
    const presetLabels = {
      'lt_20k': 'Income: < ৳20k',
      '20k_50k': 'Income: ৳20k–৳50k',
      '50k_1lakh': 'Income: ৳50k–৳1L',
      'gt_1lakh': 'Income: > ৳1L'
    };
    active.push({ key: 'incomePreset', label: presetLabels[state.filters.incomePreset] || `Income: ${state.filters.incomePreset}` });
  }
  if ((state.filters.incomeMin !== null && state.filters.incomeMin > 0) || (state.filters.incomeMax !== null && state.filters.incomeMax > 0)) {
    const minTxt = state.filters.incomeMin ? `৳${Number(state.filters.incomeMin).toLocaleString()}` : '৳0';
    const maxTxt = state.filters.incomeMax ? `৳${Number(state.filters.incomeMax).toLocaleString()}` : '∞';
    active.push({ key: 'incomeRange', label: `Income: ${minTxt} – ${maxTxt}` });
  }

  // Multi-Command Search Active Chips
  const sInput = $('searchInput');
  const qVal = (sInput?.value || '').trim();
  if (qVal) {
    const c = parseSearchQuery(qVal);
    if (c) {
      if (c.rolls && c.rolls.length > 0) {
        active.push({ key: 'search_rolls', label: `🏷️ Roll: ${c.rolls.map(r => '#' + r).join(', ')}` });
      }
      if (c.f !== undefined) {
        active.push({ key: 'search_f', label: `👨‍👩‍👧 Family: ${c.f || 'All'}` });
      }
      if (c.p !== undefined) {
        active.push({ key: 'search_p', label: `👤 Personal: ${c.p || 'All'}` });
      }
      if (c.a !== undefined) {
        active.push({ key: 'search_a', label: `📍 Address: ${c.a || 'All'}` });
      }
      if (c.s !== undefined) {
        active.push({ key: 'search_s', label: `🎓 SSC: ${c.s || 'All'}` });
      }
      if (c.general !== undefined) {
        active.push({ key: 'search_general', label: `🔍 "${c.general}"` });
      }
    }
  }

  if (badge) {
    const modalFilterCount = active.filter(a => !a.key.startsWith('search_')).length;
    if (modalFilterCount > 0) {
      badge.textContent = modalFilterCount;
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
  if (key.startsWith('search_')) {
    const sInput = $('searchInput');
    const clearBtn = $('clearSearchBtn');
    if (sInput) {
      let q = sInput.value;
      if (key === 'search_f') {
        q = q.replace(/\/(?:f|family)(?:\s+[^/]*|$)/i, '');
      } else if (key === 'search_a') {
        q = q.replace(/\/(?:a|addr|address)(?:\s+[^/]*|$)/i, '');
      } else if (key === 'search_p') {
        q = q.replace(/\/(?:p|personal)(?:\s+[^/]*|$)/i, '');
      } else if (key === 'search_s') {
        q = q.replace(/\/(?:s|ssc|academic)(?:\s+[^/]*|$)/i, '');
      } else if (key === 'search_rolls') {
        q = q.replace(/#\s*\d+([,\s]*#\s*\d+)*/g, '');
      } else if (key === 'search_general') {
        q = '';
      }
      sInput.value = q.replace(/\s+/g, ' ').trim();
      if (!sInput.value && clearBtn) clearBtn.style.display = 'none';
      updateActiveSearchChips(sInput.value);
    }
  } else if (key === 'bookmarkedOnly') {
    state.filters.bookmarkedOnly = false;
    const bmFilterBtn = $('filterBookmarksBtn');
    if (bmFilterBtn) bmFilterBtn.classList.remove('active');
  } else if (key === 'incomePreset') {
    state.filters.incomePreset = 'all';
    document.querySelectorAll('.income-preset-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.preset === 'all');
    });
  } else if (key === 'incomeRange') {
    state.filters.incomeMin = null;
    state.filters.incomeMax = null;
    if ($('fModalIncomeMin')) $('fModalIncomeMin').value = '';
    if ($('fModalIncomeMax')) $('fModalIncomeMax').value = '';
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
  state.startPage = 1;
  applyFilters();
}
window.removeFilter = removeFilter;

function clearAllActiveFilters() {
  const sInput = $('searchInput');
  const clearBtn = $('clearSearchBtn');
  if (sInput) sInput.value = '';
  if (clearBtn) clearBtn.style.display = 'none';
  updateActiveSearchChips('');
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

function getGroupAbbrev(groupName) {
  const g = (groupName || '').toLowerCase();
  if (g.includes('bus') || g.includes('com') || g.includes('b.stu')) return 'B. Studies';
  if (g.includes('hum') || g.includes('art')) return 'Humanities';
  if (g.includes('sci')) return 'Science';
  return '';
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

/* ── CLEAN SUBJECT NORMALIZER ─────────────────────── */
function cleanSubjectName(str) {
  if (!str || str === '—' || str === 'N/A') return '—';
  const l = str.toLowerCase();
  if (l.includes('physics') || l.includes('পদার্থ')) return 'Physics';
  if (l.includes('chemistry') || l.includes('রসায়ন')) return 'Chemistry';
  if (l.includes('higher math') || l.includes('উচ্চতর')) return 'Higher Math';
  if (l.includes('biology') || l.includes('জীববিজ্ঞান')) return 'Biology';
  if (l.includes('bangla') || l.includes('বাংলা')) return 'Bangla';
  if (l.includes('english') || l.includes('ইংরেজি')) return 'English';
  if (l.includes('ict') || l.includes('information') || l.includes('তথ্য')) return 'ICT';
  if (l.includes('statistics') || l.includes('পরিসংখ্যান')) return 'Statistics';
  if (l.includes('economics') || l.includes('অর্থনীতি')) return 'Economics';
  if (l.includes('accounting') || l.includes('হিসাববিজ্ঞান')) return 'Accounting';
  if (l.includes('finance') || l.includes('ব্যাংকিং')) return 'Finance & Banking';
  if (l.includes('management') || l.includes('business org') || l.includes('ব্যবস্থাপনা') || l.includes('babosai songotthon') || (l.includes('babosthapona') && !l.includes('utpa') && !l.includes('biponon'))) return 'Business Organization & Management';
  if (l.includes('marketing') || l.includes('বিপণন') || l.includes('utpadon') || l.includes('utpa.') || l.includes('biponon')) return 'Production Management & Marketing';
  if (l.includes('civics') || l.includes('পৌরনীতি')) return 'Civics & Good Governance';
  if (l.includes('sociology') || l.includes('সমাজবিজ্ঞান')) return 'Sociology';
  if (l.includes('social work') || l.includes('সমাজকর্ম')) return 'Social Work';
  if (l.includes('social science') || l.includes('সমাজবিজ্ঞান')) return 'Social Science';
  if (l.includes('logic') || l.includes('যুক্তিবিদ্যা')) return 'Logic';
  if (l.includes('geography') || l.includes('ভূগোল')) return 'Geography';
  if (l.includes('psychology') || l.includes('মনোবিজ্ঞান')) return 'Psychology';
  if (l.includes('islamic history') || l.includes('ইসলামের ইতিহাস')) return 'Islamic History & Culture';
  if (l.includes('islamic studies') || l.includes('ইসলাম শিক্ষা') || l.includes('islam shikha') || l.includes('study of islam')) return 'Islamic Studies';
  if (l.includes('agriculture') || l.includes('কৃষি')) return 'Agriculture';
  if (l.includes('home science') || l.includes('গার্হস্থ্য')) return 'Home Science';
  if (l.includes('arabic') || l.includes('আরবি')) return 'Arabic';
  if (l.includes('pali') || l.includes('পালি')) return 'Pali';
  if (l.includes('history') || l.includes('ইতিহাস')) return 'History';

  // Fallback cleaner for custom/rare subject names:
  // 1. Remove classification tags: (Mandatory), (Elective), (Fourth), etc.
  let t = str.replace(/\(?\b(mandatory|elective|fourth|4th)\b\)?/gi, '');
  // 2. Cut off 2nd paper if separated by slash / or code pattern like 278 -
  t = t.split(/\s*\/\s*|\s+\d{2,4}\s*-\s*/)[0];
  // 3. Remove leading course code
  t = t.replace(/^\d+\s*-\s*/, '');
  // 4. Remove paper references like 1st paper, 2nd paper, 1st, 2nd, paper
  t = t.replace(/\b(1st|2nd|first|second)\s*(paper|part)?\b/gi, '');
  t = t.replace(/\s+/g, ' ').replace(/^[-/,\s]+|[-/,\s]+$/g, '').trim();
  return t || str;
}

function cleanSubjectLabel(txt) {
  return cleanSubjectName(txt);
}

function getStudentElectiveSubject(s) {
  if (s.elective_subjects && s.elective_subjects !== '—' && s.elective_subjects !== 'N/A') {
    const el = cleanSubjectLabel(s.elective_subjects);
    if (el && el !== '—') return el;
  }
  if (s.all_subjects) {
    const parts = s.all_subjects.split(';');
    for (const p of parts) {
      if (/elective/i.test(p) && !/fourth|4th/i.test(p)) {
        const name = cleanSubjectName(p);
        if (name && name !== '—') return name;
      }
    }
  }
  return '—';
}

function getStudentFourthSubject(s) {
  if (s.fourth_subject && s.fourth_subject !== '—' && s.fourth_subject !== 'N/A') {
    const f4 = cleanSubjectLabel(s.fourth_subject);
    if (f4 && f4 !== '—') return f4;
  }
  if (s.all_subjects) {
    const parts = s.all_subjects.split(';');
    for (const p of parts) {
      if (/fourth|4th/i.test(p)) {
        const name = cleanSubjectName(p);
        if (name && name !== '—') return name;
      }
    }
  }
  return '—';
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

  // Hybrid pagination: startPage tracks first visible page
  // Load More keeps startPage=1 (cumulative), page clicks set startPage=currentPage
  const startIdx = (state.startPage - 1) * state.pageSize;
  const visibleStudents = state.filteredStudents.slice(startIdx, state.currentPage * state.pageSize);

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
        const formattedGpa = formatGpa(s.ssc_gpa);
        const boardGpaStr = (s.ssc_board || '—') + (formattedGpa !== '—' ? ` • <strong style="color:var(--success);">${formattedGpa}</strong>` : '');
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

/* ── VIEW 3: FULL TABLE VIEW (GROUPED, STICKY & SORTABLE) ─────── */
function setTableSort(colKey) {
  if (state.sortColumn === colKey) {
    state.sortDirection = (state.sortDirection === 'asc') ? 'desc' : 'asc';
  } else {
    state.sortColumn = colKey;
    // Default descending for numeric values like income and GPA, ascending for text and roll
    state.sortDirection = (colKey === 'monthly_income' || colKey === 'annual_income' || colKey === 'ssc_gpa') ? 'desc' : 'asc';
  }
  applyFilters();
}
window.setTableSort = setTableSort;

function openStudentModalFromIdx(idx) {
  // idx is local within the visible slice — add page offset
  const pageOffset = (state.startPage - 1) * state.pageSize;
  const s = state.filteredStudents[pageOffset + idx];
  if (s) openStudentModal(s);
}
window.openStudentModalFromIdx = openStudentModalFromIdx;

function renderSortTh(label, colKey, extraClass = '') {
  const isSorted = state.sortColumn === colKey;
  const icon = isSorted
    ? (state.sortDirection === 'asc' ? '<i class="fa-solid fa-sort-up sort-icon"></i>' : '<i class="fa-solid fa-sort-down sort-icon"></i>')
    : '<i class="fa-solid fa-sort sort-icon"></i>';
  const sortedCls = isSorted ? `sorted-${state.sortDirection}` : '';
  return `<th class="sortable ${sortedCls} ${extraClass}" onclick="setTableSort('${colKey}')" title="Click to sort by ${label}">${label} ${icon}</th>`;
}

function renderTableView(students, container) {
  const html = `
    <div class="table-card">
      <div class="tbl-wrap">
        <table>
          <thead>
            <!-- Group Category Banners -->
            <tr class="tbl-group-hdr-row">
              <th colspan="3" class="tbl-group-hdr grp-sticky"><i class="fa-solid fa-id-badge"></i> Student Identity</th>
              <th colspan="7" class="tbl-group-hdr grp-personal col-group-start"><i class="fa-solid fa-user"></i> Personal Information</th>
              <th colspan="9" class="tbl-group-hdr grp-academic col-group-start"><i class="fa-solid fa-graduation-cap"></i> Academic &amp; Subjects</th>
              <th colspan="6" class="tbl-group-hdr grp-father col-group-start"><i class="fa-solid fa-user-tie"></i> Father's Information</th>
              <th colspan="4" class="tbl-group-hdr grp-mother col-group-start"><i class="fa-solid fa-person-dress"></i> Mother's Information</th>
              <th colspan="4" class="tbl-group-hdr grp-address col-group-start"><i class="fa-solid fa-map-location-dot"></i> Address &amp; District</th>
              <th colspan="4" class="tbl-group-hdr grp-payment col-group-start"><i class="fa-solid fa-receipt"></i> Quota &amp; Payment Dossier</th>
            </tr>
            <!-- Individual Column Headers -->
            <tr>
              <!-- Identity (3) -->
              <th class="sticky-col-idx" style="width:46px;text-align:center;">#</th>
              <th class="sticky-col-photo" style="width:52px;text-align:center;">Photo</th>
              ${renderSortTh('Student Name (EN)', 'student_name_en', 'sticky-col-name')}

              <!-- Personal (7) -->
              <th class="col-group-start">Name (BN)</th>
              <th>Date of Birth</th>
              <th>Gender</th>
              <th>Blood</th>
              <th>Religion</th>
              <th>Birth Reg / NID</th>
              <th>Student Mobile</th>

              <!-- Academic & Subjects (9) -->
              ${renderSortTh('College Roll', 'college_roll', 'col-group-start')}
              ${renderSortTh('Adm Roll', 'admission_roll')}
              <th>Group</th>
              <th>Section</th>
              <th>Elective Subject</th>
              <th>4th Subject</th>
              ${renderSortTh('SSC GPA', 'ssc_gpa')}
              <th>SSC Board</th>
              ${renderSortTh('SSC Year', 'ssc_year')}

              <!-- Father (6) -->
              <th class="col-group-start">Father Name (EN)</th>
              <th>Father Occupation</th>
              ${renderSortTh("Monthly Income", 'monthly_income')}
              ${renderSortTh("Annual Income", 'annual_income')}
              <th>Father Mobile</th>
              <th>Father NID</th>

              <!-- Mother (4) -->
              <th class="col-group-start">Mother Name (EN)</th>
              <th>Mother Mobile</th>
              <th>Mother Occ.</th>
              <th>Mother NID</th>

              <!-- Address (4) -->
              <th class="col-group-start">Present Address</th>
              <th>Present Zila</th>
              <th>Permanent Address</th>
              <th>Permanent Zila</th>

              <!-- Quota & Payment (4) -->
              <th class="col-group-start">Quota</th>
              <th>Payment Date</th>
              <th>Transaction No</th>
              <th style="text-align:center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${students.map((s, idx) => {
              const photo = getStudentPhotoPath(s);
              const localPdf = getStudentLocalPdfUrl(s);
              const rollNum = s.short_roll ? String(s.short_roll).replace(/^0+/, '') : (idx + 1);
              let incMonthlyStr = '—';
              let incAnnualStr = '—';
              if (s.father_annual_income && !isNaN(s.father_annual_income) && Number(s.father_annual_income) > 0) {
                const ann = Number(s.father_annual_income);
                incAnnualStr = '৳' + ann.toLocaleString();
                incMonthlyStr = '৳' + Math.round(ann / 12).toLocaleString();
              }
              const elSub = getStudentElectiveSubject(s);
              const f4Sub = getStudentFourthSubject(s);

              return `
                <tr data-idx="${idx}">
                  <!-- Identity (3) -->
                  <td class="sticky-col-idx" style="text-align:center;font-weight:700;color:var(--text-muted);">${rollNum}</td>
                  <td class="sticky-col-photo" style="text-align:center;">
                    ${photo ? `
                      <img class="tbl-thumb" src="${photo}" alt="" loading="lazy" onerror="this.style.display='none'">
                    ` : `
                      <div class="tbl-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--text-faint);"><i class="fa-solid fa-user"></i></div>
                    `}
                  </td>
                  <td class="sticky-col-name"><strong>${esc(s.student_name_en || 'Unknown')}</strong></td>

                  <!-- Personal (7) -->
                  <td class="bn-text col-group-start">${esc(s.student_name_bn || '—')}</td>
                  <td style="white-space:nowrap;font-size:12px;">${s.date_of_birth || '—'}</td>
                  <td>${s.gender || '—'}</td>
                  <td><strong>${s.blood_group || '—'}</strong></td>
                  <td>${s.religion || '—'}</td>
                  <td style="font-family:monospace;font-size:11.5px;font-weight:600;letter-spacing:0.3px;">${s.nid_birth_reg || '—'}</td>
                  <td style="font-family:monospace;">${s.student_phone || '—'}</td>

                  <!-- Academic & Subjects (9) -->
                  <td class="col-group-start" style="font-family:monospace;font-weight:600;color:var(--accent);">${s.college_roll || '—'}</td>
                  <td style="font-family:monospace;font-weight:700;color:var(--primary);">${s.admission_roll || '—'}</td>
                  <td><span class="badge badge-grp">${s.group_name || '—'}</span></td>
                  <td>${(state.collegeCode === 'dc' && s.section && !/science/i.test(s.section)) ? `<span class="badge badge-sec">${s.section}</span>` : (s.section || '—')}</td>
                  <td><span style="color:var(--primary);font-weight:600;font-size:12px;">${esc(elSub)}</span></td>
                  <td><span style="color:var(--accent);font-weight:600;font-size:12px;">${esc(f4Sub)}</span></td>
                  <td><strong style="color:var(--success);">${formatGpa(s.ssc_gpa)}</strong></td>
                  <td>${s.ssc_board || '—'}</td>
                  <td>${s.ssc_year || '—'}</td>

                  <!-- Father (6) -->
                  <td class="col-group-start">${esc(s.father_name_en || '—')}</td>
                  <td style="font-weight:600;color:var(--text);">${esc(s.father_occupation || '—')}</td>
                  <td style="color:var(--success);font-weight:700;font-family:monospace;">${incMonthlyStr}</td>
                  <td style="color:var(--text-muted);font-size:12px;font-family:monospace;">${incAnnualStr}</td>
                  <td style="font-family:monospace;">${s.father_phone || '—'}</td>
                  <td style="font-family:monospace;font-size:11.5px;color:var(--text-muted);">${s.father_nid || '—'}</td>

                  <!-- Mother (4) -->
                  <td class="col-group-start">${esc(s.mother_name_en || '—')}</td>
                  <td style="font-family:monospace;">${s.mother_phone || '—'}</td>
                  <td>${esc(s.mother_occupation || '—')}</td>
                  <td style="font-family:monospace;font-size:11.5px;color:var(--text-muted);">${s.mother_nid || '—'}</td>

                  <!-- Address & District (4) -->
                  <td class="col-group-start" style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(s.present_address)}">${esc(s.present_address || '—')}</td>
                  <td>${s.present_district || '—'}</td>
                  <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(s.permanent_address)}">${esc(s.permanent_address || '—')}</td>
                  <td>${s.permanent_district || '—'}</td>

                  <!-- Quota & Payment (4) -->
                  <td class="col-group-start">${cleanQuotaLabel(s.quota)}</td>
                  <td>${s.payment_date || '—'}</td>
                  <td style="font-family:monospace;">${s.transaction_no || '—'}</td>
                  <td onclick="event.stopPropagation()" style="text-align:center;white-space:nowrap;">
                    ${localPdf ? `<a href="${localPdf}" target="_blank" style="color:var(--danger);font-size:14px;margin-right:6px;" title="Open Downloaded Application PDF"><i class="fa-solid fa-file-pdf"></i></a>` : ''}
                    ${s.receipt_slip_url ? `<a href="${s.receipt_slip_url}" target="_blank" style="color:var(--success);font-size:14px;margin-right:6px;" title="Open Admission Fee Receipt Slip"><i class="fa-solid fa-receipt"></i></a>` : ''}
                    <button class="tbl-dossier-btn" onclick="openStudentModalFromIdx(${idx})" title="Open Full Dossier" style="border:none;background:rgba(59,130,246,0.12);color:var(--primary);padding:3px 8px;border-radius:5px;cursor:pointer;font-size:11px;font-weight:600;"><i class="fa-solid fa-id-card"></i> Dossier</button>
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

  const totalPages = Math.ceil(total / state.pageSize);
  const startNum = (state.startPage - 1) * state.pageSize + 1;
  const endNum = Math.min(state.currentPage * state.pageSize, total);

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
      ${state.currentPage < totalPages ? `
        <button class="load-more-btn" id="loadMoreBtn">
          <i class="fa-solid fa-angles-down"></i> Load More Students (+${state.pageSize})
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
        Showing <strong>${startNum}–${endNum}</strong> of <strong>${total.toLocaleString()}</strong> students (Page ${state.currentPage} of ${totalPages})
      </div>
    </div>
  `;


  const loadBtn = $('loadMoreBtn');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      // Cumulative: keep startPage, just extend currentPage
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
        state.startPage = state.currentPage;
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
        state.startPage = state.currentPage;
        renderActiveView();
        updateResultCount();
        scrollToTop();
      }
    });
  }

  wrap.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentPage = +btn.dataset.page;
      state.startPage = state.currentPage;
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
    infoItem('SSC GPA', formatGpa(s.ssc_gpa)),
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

  // Section 6: Enrolled Subjects (Formal Academic Table - Subject Name & Classification Only)
  let subjectsHtml = '';
  const subjCards = [];

  if (s.all_subjects && s.all_subjects.trim()) {
    s.all_subjects.split(';').map(p => p.trim()).filter(Boolean).forEach(p => {
      let type = 'mandatory';
      let typeLabel = 'Mandatory';
      if (/fourth|4th/i.test(p)) {
        type = 'fourth';
        typeLabel = '4th Subject';
      } else if (/elective/i.test(p)) {
        type = 'elective';
        typeLabel = 'Elective';
      }

      const name = cleanSubjectName(p) || 'Subject';
      if (name && name !== '—' && !subjCards.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        subjCards.push({ name, type, typeLabel });
      }
    });
  }

  if (!subjCards.length && (s.elective_subjects || s.fourth_subject)) {
    if (/science/i.test(s.group_name || 'Science')) {
      subjCards.push({ name: 'Bangla', type: 'mandatory', typeLabel: 'Mandatory' });
      subjCards.push({ name: 'English', type: 'mandatory', typeLabel: 'Mandatory' });
      subjCards.push({ name: 'ICT', type: 'mandatory', typeLabel: 'Mandatory' });
      subjCards.push({ name: 'Physics', type: 'mandatory', typeLabel: 'Mandatory' });
      subjCards.push({ name: 'Chemistry', type: 'mandatory', typeLabel: 'Mandatory' });
    }
    if (s.elective_subjects) {
      const el = cleanSubjectName(s.elective_subjects);
      if (el && el !== '—' && !subjCards.some(c => c.name.toLowerCase() === el.toLowerCase())) {
        subjCards.push({ name: el, type: 'elective', typeLabel: 'Elective' });
      }
    }
    if (s.fourth_subject) {
      const f4 = cleanSubjectName(s.fourth_subject);
      if (f4 && f4 !== '—' && !subjCards.some(c => c.name.toLowerCase() === f4.toLowerCase())) {
        subjCards.push({ name: f4, type: 'fourth', typeLabel: '4th Subject' });
      }
    }
  }

  if (subjCards.length) {
    subjectsHtml = `
      <div class="info-sec">
        <div class="info-sec-hdr"><i class="fa-solid fa-graduation-cap"></i> Enrolled Subjects</div>
        <div class="formal-subjects-card">
          <table class="formal-subjects-table">
            <thead>
              <tr>
                <th style="width: 44px; text-align: center;">#</th>
                <th>Subject Name</th>
                <th style="width: 140px; text-align: right;">Classification</th>
              </tr>
            </thead>
            <tbody>
              ${subjCards.map((c, i) => `
                <tr>
                  <td style="text-align: center; color: var(--text-muted); font-weight: 600;">${i + 1}</td>
                  <td>
                    <div class="sub-name-cell">
                      <span class="sub-dot ${c.type}"></span>
                      <span>${esc(c.name)}</span>
                    </div>
                  </td>
                  <td style="text-align: right;">
                    <span class="formal-badge ${c.type}">${c.typeLabel}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Section 7: Official Documents & Links (5 Standard Options)
  const localPdfUrl = getStudentLocalPdfUrl(s);
  const localPhotoUrl = photo;
  const pdfWebUrl = s.app_pdf_url || '';
  const receiptWebUrl = s.receipt_slip_url || '';
  const photoWebUrl = s.photo_web_url || '';

  const docBtns = [];

  // 1. PDF Info (File)
  if (localPdfUrl) {
    docBtns.push(`<a href="${localPdfUrl}" target="_blank" class="doc-btn doc-pdf-file" title="Download / Open Saved Application Form PDF"><i class="fa-solid fa-file-pdf"></i> PDF Info (File)</a>`);
  } else {
    docBtns.push(`<span class="doc-btn doc-pdf-file disabled" title="PDF file not downloaded locally"><i class="fa-solid fa-file-pdf"></i> PDF Info (File) <span class="doc-offline-tag">N/A</span></span>`);
  }

  // 2. PDF Info (Link)
  if (pdfWebUrl) {
    docBtns.push(`<a href="${pdfWebUrl}" target="_blank" rel="noopener noreferrer" class="doc-btn doc-pdf-link" title="Open Official Admission Reprint Online"><i class="fa-solid fa-arrow-up-right-from-square"></i> PDF Info (Link)</a>`);
  } else {
    docBtns.push(`<span class="doc-btn doc-pdf-link disabled" title="Online reprint link unavailable"><i class="fa-solid fa-arrow-up-right-from-square"></i> PDF Info (Link) <span class="doc-offline-tag">N/A</span></span>`);
  }

  // 3. Payment Receipts
  if (receiptWebUrl) {
    docBtns.push(`<a href="${receiptWebUrl}" target="_blank" rel="noopener noreferrer" class="doc-btn doc-receipt" title="Open Official Admission Fee Receipt Slip"><i class="fa-solid fa-receipt"></i> Payment Receipts</a>`);
  } else {
    docBtns.push(`<span class="doc-btn doc-receipt disabled" title="Payment receipt link unavailable"><i class="fa-solid fa-receipt"></i> Payment Receipts <span class="doc-offline-tag">N/A</span></span>`);
  }

  // 4. Photo (File)
  if (localPhotoUrl) {
    docBtns.push(`<a href="${localPhotoUrl}" target="_blank" class="doc-btn doc-photo-file" title="View Saved Student Photo"><i class="fa-solid fa-image"></i> Photo (File)</a>`);
  } else {
    docBtns.push(`<span class="doc-btn doc-photo-file disabled" title="Local photo not found"><i class="fa-solid fa-image"></i> Photo (File) <span class="doc-offline-tag">N/A</span></span>`);
  }

  // 5. Photo (Link)
  if (photoWebUrl) {
    docBtns.push(`<a href="${photoWebUrl}" target="_blank" rel="noopener noreferrer" class="doc-btn doc-photo-link" title="Open Original High-Res Web Photo"><i class="fa-solid fa-up-right-from-square"></i> Photo (Link)</a>`);
  } else {
    docBtns.push(`<span class="doc-btn doc-photo-link disabled" title="Online photo URL unavailable"><i class="fa-solid fa-up-right-from-square"></i> Photo (Link) <span class="doc-offline-tag">N/A</span></span>`);
  }

  const docsHtml = docBtns.join('');

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
        <img class="dos-avatar" src="${photo}" alt="${esc(s.student_name_en)}" data-name="${esc(s.student_name_en || '')}" data-roll="${s.short_roll ? ('#' + String(s.short_roll).replace(/^0+/, '') + (getGroupAbbrev(s.group_name) ? ' · ' + getGroupAbbrev(s.group_name) : '')) : (s.college_roll ? ('#' + s.college_roll + (getGroupAbbrev(s.group_name) ? ' · ' + getGroupAbbrev(s.group_name) : '')) : (getGroupAbbrev(s.group_name) || ''))}" onclick="window.open(this.src, '_blank')">
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
  const isEmail = /email/i.test(label);

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
  } else if (isEmail) {
    valueContent = `<a href="mailto:${cleanVal}" class="email-link" title="Click to send email to ${cleanVal}"><i class="fa-solid fa-envelope" style="margin-right:6px;font-size:12px;"></i>${esc(cleanVal)}</a>`;
    actionsHtml = `<button class="action-mini-btn copy" onclick="copyText('${cleanVal}', this)" title="Copy Email Address"><i class="fa-regular fa-copy"></i></button>`;
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
    const nearBottom = (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 280);
    if (window.scrollY > 280) {
      fab.classList.add('visible');
    } else {
      fab.classList.remove('visible');
    }
    // Also toggle bottom fab
    const bFab = $('scrollBottomFab');
    if (bFab) {
      if (window.scrollY > 280 && !nearBottom) {
        bFab.classList.add('visible');
      } else {
        bFab.classList.remove('visible');
      }
    }
  }, { passive: true });

  fab.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ── SCROLL TO BOTTOM FLOATING ACTION BUTTON ─────────────── */
function initScrollBottomButton() {
  let fab = $('scrollBottomFab');
  if (!fab) {
    fab = document.createElement('button');
    fab.id = 'scrollBottomFab';
    fab.className = 'scroll-bottom-fab';
    fab.setAttribute('title', 'Scroll to Bottom (নিচে যান)');
    fab.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
    document.body.appendChild(fab);
  }

  fab.addEventListener('click', () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  });
}

/* ── UNIVERSAL PHOTO HOVER ZOOM PREVIEW (TABLE, CARDS, COMPACT, PHOTOS) ── */
function initPhotoHoverZoom() {
  let preview = $('hoverZoomPreview');
  if (!preview) {
    preview = document.createElement('div');
    preview.id = 'hoverZoomPreview';
    preview.className = 'hover-zoom-preview';
    preview.innerHTML = `
      <img id="hoverZoomImg" src="" alt="Student Photo">
      <div class="hover-zoom-info">
        <div id="hoverZoomName" class="hover-zoom-name"></div>
        <div id="hoverZoomRoll" class="hover-zoom-roll"></div>
      </div>
    `;
    document.body.appendChild(preview);
  }

  const imgEl = $('hoverZoomImg');
  const nameEl = $('hoverZoomName');
  const rollEl = $('hoverZoomRoll');

  const showPreview = (target) => {
    if (!target) return;
    let src = '';
    if (target.tagName && target.tagName.toLowerCase() === 'img') {
      src = target.src;
    } else {
      const innerImg = target.querySelector('img');
      if (innerImg) src = innerImg.src;
    }
    if (!src || src.includes('data:image/svg') || src.endsWith('#') || target.classList.contains('photo-placeholder')) {
      return;
    }

    // Retrieve student name and roll if available
    let studentName = '';
    let rollStr = '';

    if (target.classList.contains('dos-avatar')) {
      studentName = target.dataset.name || $('dossierCard')?.querySelector('.dos-info h2')?.textContent?.trim() || '';
      rollStr = target.dataset.roll || '';
    } else {
      const cardOrRow = target.closest('[data-idx]');
      if (cardOrRow && cardOrRow.dataset.idx !== undefined) {
        const idx = parseInt(cardOrRow.dataset.idx, 10);
        // Account for page offset — use startPage since data-idx is relative to the visible slice start
        const pageOffset = (state.startPage - 1) * state.pageSize;
        const s = state.filteredStudents[pageOffset + idx];
        if (s) {
          studentName = s.student_name_en || '';
          const grpAbbr = getGroupAbbrev(s.group_name);
          rollStr = s.short_roll ? `#${s.short_roll}${grpAbbr ? ' · ' + grpAbbr : ''}` : (s.college_roll ? `#${s.college_roll}${grpAbbr ? ' · ' + grpAbbr : ''}` : (grpAbbr || ''));
        }
      }
    }

    if (!studentName && target.alt) {
      studentName = target.alt;
    }

    imgEl.src = src;
    nameEl.textContent = studentName || 'Student Photo';
    rollEl.textContent = rollStr || '';
    rollEl.style.display = rollStr ? 'block' : 'none';

    // Position relative to target thumbnail
    const rect = target.getBoundingClientRect();
    const previewWidth = 176;
    const previewHeight = 245;

    let left = rect.right + 14;
    let top = rect.top + (rect.height / 2) - (previewHeight / 2);

    // If overflowing right of viewport, place to the left
    if (left + previewWidth > window.innerWidth - 12) {
      left = rect.left - previewWidth - 14;
    }
    // Clamp inside viewport
    if (left < 10) left = 10;
    if (top < 10) top = 10;
    if (top + previewHeight > window.innerHeight - 10) {
      top = window.innerHeight - previewHeight - 10;
    }

    preview.style.left = `${Math.round(left)}px`;
    preview.style.top = `${Math.round(top)}px`;
    preview.classList.add('visible');
  };

  const hidePreview = () => {
    if (preview) preview.classList.remove('visible');
  };

  // Delegated mouseover/mouseout across document
  document.body.addEventListener('mouseover', (e) => {
    const target = e.target.closest('.tbl-thumb, .compact-photo, .card-av, .photo-card img, .photo-card .img-wrap img, .dos-avatar');
    if (target) {
      showPreview(target);
    }
  });

  document.body.addEventListener('mouseout', (e) => {
    const target = e.target.closest('.tbl-thumb, .compact-photo, .card-av, .photo-card img, .photo-card .img-wrap img, .dos-avatar');
    if (target) {
      if (e.relatedTarget && target.contains(e.relatedTarget)) return;
      hidePreview();
    }
  });

  window.addEventListener('scroll', hidePreview, { passive: true });
}

/* ── PUBLIC INIT FUNCTION ────────────────────────────────── */
window.initPortal = async function(opts) {
  state.collegeCode = opts.collegeCode || 'dc';
  state.collegeName = opts.collegeName || 'Dhaka College';
  state.batches = opts.batches || ALL_BATCHES;

  initAuth();
  initTheme();
  initScrollTopButton();
  initScrollBottomButton();
  initPhotoHoverZoom();
  updateBookmarkBadge();
  
  // Dynamic Home Link: on local development inside /govcd/, link back to ../../govcd.github.io/index.html
  if (window.location.pathname.includes('/govcd/')) {
    const homeBtn = $('navHomeLink') || document.querySelector('.nav-logo-btn');
    if (homeBtn) homeBtn.setAttribute('href', '../../govcd.github.io/index.html');
  }
  
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

