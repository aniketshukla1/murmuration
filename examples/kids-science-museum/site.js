/*
 * Sprout Lab page behaviour: the theme toggle, the live "open now" status and
 * today's row in the hours table (Europe/London time), and the ticket builder.
 * The page is complete without any of it: hours and prices are in the HTML.
 * The 3D sprout lives in sprout.js.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const THEME_KEY = 'sprout-theme'; // match the boot script in <head>

  /* ---------- Theme ---------- */
  const themeNow = () => root.dataset.theme || (darkQuery.matches ? 'dark' : 'light');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  function syncTheme() {
    const mode = themeNow();
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.dataset.mode = mode;
      button.setAttribute('aria-label', mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    });
    if (themeMeta) themeMeta.setAttribute('content', mode === 'dark' ? '#11291f' : '#dff3e4');
  }
  function setTheme(next) {
    const apply = () => { root.dataset.theme = next; syncTheme(); };
    if (document.startViewTransition && !reduce.matches) document.startViewTransition(apply);
    else apply();
    try { localStorage.setItem(THEME_KEY, next); } catch (error) { /* storage can be blocked; the choice lasts for this visit */ }
  }
  document.addEventListener('click', (event) => {
    const button = event.target.closest && event.target.closest('[data-theme-toggle]');
    if (button) setTheme(themeNow() === 'dark' ? 'light' : 'dark');
  });
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', syncTheme);
  syncTheme();

  /* ---------- Opening hours (minutes after midnight, museum time). Keep in step with the table in index.html. ---------- */
  const HOURS = [
    [570, 1050], // Sunday 9:30am–5:30pm
    null,        // Monday closed (open in school holidays)
    [570, 990],  // Tuesday 9:30am–4:30pm
    [570, 990],
    [570, 990],
    [570, 990],  // Friday
    [570, 1050], // Saturday
  ];
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const ZONE = 'Europe/London';

  const clock = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${((h + 11) % 12) + 1}${m ? ':' + String(m).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}`;
  };
  const span = (hours) => `${clock(hours[0])}–${clock(hours[1])}`;

  function museumNow() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: ZONE, weekday: 'short', hour: 'numeric', minute: 'numeric', year: 'numeric', month: '2-digit', day: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (type) => (parts.find((p) => p.type === type) || {}).value;
    return {
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
      mins: Number(get('hour')) * 60 + Number(get('minute')),
      iso: `${get('year')}-${get('month')}-${get('day')}`,
    };
  }

  function status(now) {
    const today = HOURS[now.day];
    if (today && now.mins >= today[0] && now.mins < today[1]) {
      return { state: 'open', head: 'Open now', tail: `until ${clock(today[1])}`, sentence: `We're open now until ${clock(today[1])}. Last entry is at ${clock(today[1] - 60)}.` };
    }
    if (today && now.mins < today[0]) {
      return { state: 'soon', head: 'Opens today', tail: `at ${clock(today[0])}`, sentence: `We open today at ${clock(today[0])} and close at ${clock(today[1])}.` };
    }
    for (let i = 1; i <= 7; i++) {
      const day = (now.day + i) % 7;
      if (!HOURS[day]) continue;
      const when = i === 1 ? 'tomorrow' : DAY_NAMES[day];
      return {
        state: 'closed',
        head: today ? 'Closed now' : 'Closed today',
        tail: `opens ${i === 1 ? 'tomorrow' : DAY_NAMES[day].slice(0, 3)} ${clock(HOURS[day][0])}`,
        sentence: `We're closed right now${today ? '' : ' (except in school holidays)'}. We open again ${when} at ${clock(HOURS[day][0])}.`,
      };
    }
    return null;
  }

  function paintHours() {
    const now = museumNow();
    const s = status(now);
    if (!s) return;
    document.querySelectorAll('[data-status]').forEach((el) => {
      el.dataset.state = s.state;
      el.setAttribute('aria-label', `${s.head}, ${s.tail}. See opening times.`);
    });
    document.querySelectorAll('[data-status-head]').forEach((el) => { el.textContent = s.head; });
    document.querySelectorAll('[data-status-tail]').forEach((el) => { el.textContent = s.tail; });
    document.querySelectorAll('[data-status-sentence]').forEach((el) => { el.textContent = s.sentence; });

    const today = HOURS[now.day];
    const todayHours = document.querySelector('[data-today-hours]');
    const todayNote = document.querySelector('[data-today-note]');
    if (todayHours) todayHours.textContent = today ? span(today) : 'Closed today';
    if (todayNote) todayNote.textContent = today ? `Last entry ${clock(today[1] - 60)}` : 'Open Mondays in school holidays';

    document.querySelectorAll('tr[data-day]').forEach((row) => {
      row.classList.toggle('is-today', Number(row.dataset.day) === now.day);
    });
  }
  paintHours();
  setInterval(paintHours, 60000);

  /* ---------- Ticket builder ---------- */
  const form = document.querySelector('[data-builder]');
  if (!form) return;

  const PRICE = { adult: 11, child: 9, under5: 0 };
  const FAMILY = 34; // 2 adults + 2 children
  const MAX = 12;
  const counts = { adult: 2, child: 2, under5: 0 };
  const dateInput = form.querySelector('#visit-date');
  const timeSelect = form.querySelector('#visit-time');
  const dateNote = form.querySelector('[data-date-note]');
  const ruleNote = form.querySelector('[data-rule]');
  const totalEl = form.querySelector('[data-total]');
  const saverEl = form.querySelector('[data-saver]');
  const resultEl = form.querySelector('[data-result]');
  const submit = form.querySelector('[type="submit"]');
  const money = (n) => `£${n}`;

  function price() {
    const families = Math.min(Math.floor(counts.adult / 2), Math.floor(counts.child / 2));
    const full = counts.adult * PRICE.adult + counts.child * PRICE.child;
    const total = families * FAMILY + (counts.adult - families * 2) * PRICE.adult + (counts.child - families * 2) * PRICE.child;
    return { total, saving: full - total, families };
  }

  const dayOf = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
  };

  function fillTimes(day) {
    const hours = HOURS[day] || HOURS[0]; // Mondays in school holidays keep weekend hours
    const keep = timeSelect.value;
    timeSelect.innerHTML = '';
    for (let t = hours[0]; t <= hours[1] - 60; t += 60) {
      const option = document.createElement('option');
      option.textContent = clock(t);
      timeSelect.appendChild(option);
    }
    if ([...timeSelect.options].some((o) => o.textContent === keep)) timeSelect.value = keep;
  }

  function update() {
    form.querySelectorAll('[data-count]').forEach((row) => {
      const key = row.dataset.count;
      row.querySelector('output').textContent = counts[key];
      row.querySelector('[data-step="-1"]').disabled = counts[key] <= 0;
      row.querySelector('[data-step="1"]').disabled = counts[key] >= MAX;
    });

    const p = price();
    totalEl.textContent = money(p.total);
    saverEl.textContent = p.families ? `Family saver applied: you save ${money(p.saving)}.` : '';

    const kids = counts.child + counts.under5;
    let rule = '';
    if (!counts.adult && kids) rule = 'Every child needs to come with an adult aged 18 or over.';
    else if (counts.adult && kids > counts.adult * 4) rule = 'One adult can bring up to four children, so please add another adult.';
    else if (!counts.adult && !kids) rule = 'Add at least one ticket to continue.';
    ruleNote.textContent = rule;
    ruleNote.hidden = !rule;

    let dateMsg = '';
    if (dateInput.value && dayOf(dateInput.value) === 1) dateMsg = "We're closed on Mondays outside school holidays. If it's a school holiday, you're fine; if not, pick another day.";
    dateNote.textContent = dateMsg;
    dateNote.hidden = !dateMsg;

    submit.disabled = Boolean(rule);
    resultEl.textContent = '';
  }

  form.addEventListener('click', (event) => {
    const step = event.target.closest('[data-step]');
    if (!step) return;
    const key = step.closest('[data-count]').dataset.count;
    counts[key] = Math.max(0, Math.min(MAX, counts[key] + Number(step.dataset.step)));
    update();
  });

  // Default to the next open day, in museum time
  const now = museumNow();
  dateInput.min = now.iso;
  let offset = 0;
  const today = HOURS[now.day];
  if (!today || now.mins >= today[1] - 60) offset = 1;
  while (!HOURS[(now.day + offset) % 7]) offset++;
  const first = new Date(`${now.iso}T12:00:00`);
  first.setDate(first.getDate() + offset);
  dateInput.value = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-${String(first.getDate()).padStart(2, '0')}`;
  fillTimes(dayOf(dateInput.value));
  dateInput.addEventListener('change', () => { if (dateInput.value) fillTimes(dayOf(dateInput.value)); update(); });
  timeSelect.addEventListener('change', update);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!dateInput.value) { dateInput.focus(); return; }
    const p = price();
    const when = new Date(`${dateInput.value}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    const who = [
      counts.adult && `${counts.adult} adult${counts.adult > 1 ? 's' : ''}`,
      counts.child && `${counts.child} child${counts.child > 1 ? 'ren' : ''}`,
      counts.under5 && `${counts.under5} under 5${counts.under5 > 1 ? 's' : ''}`,
    ].filter(Boolean).join(', ');
    // TODO: hand the basket to the ticketing provider's checkout here.
    resultEl.textContent = `${who} on ${when}, arriving ${timeSelect.value}: ${money(p.total)}. Online payment is coming soon. For now, please call 0117 496 0123 to book these tickets.`;
  });

  update();
})();
