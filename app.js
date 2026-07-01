/* ============================================================
   MEMEBRANE - app.js
   Data is stored in Firebase Firestore so edits made via the
   admin panel are visible to ALL visitors instantly.
   ============================================================ */

// Firebase config
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCtq1fGYRCEat_7HafENEwednzXGuxYMdE",
  authDomain: "memebrane-bfbe8.firebaseapp.com",
  projectId: "memebrane-bfbe8",
  storageBucket: "memebrane-bfbe8.firebasestorage.app",
  messagingSenderId: "222545722500",
  appId: "1:222545722500:web:82d81aa5482c762189d6d1"
};

const _fbApp = initializeApp(firebaseConfig);
const _db    = getFirestore(_fbApp);
const _auth  = getAuth(_fbApp);
const _docRef = doc(_db, 'site', 'data');

// Always start signed out on a fresh load (re-locks on every reload, matching old behavior)
signOut(_auth).catch(()=>{});

const DEFAULT_DATA = {
  about: "Memebrane is a community built on one simple membrane: the thin, glowing line between studying and losing your mind over it. We turn classroom chaos, exam dread, and everyday academic life into memes, art, and writing - made by Memebraniacs, for Memebraniacs.",
  admins: [
    { id: 'a1', name: 'Add your name', role: 'Founder & Head Admin', bio: 'Click edit to update this card with a real admin.', photo: '' },
    { id: 'a2', name: 'Admin Two', role: 'Content Admin', bio: 'Edit me!', photo: '' },
    { id: 'a3', name: 'Admin Three', role: 'Design Admin', bio: 'Edit me!', photo: '' },
  ],
  mods: [
    { id: 'm1', name: 'Mod One', role: 'Senior Moderator', bio: 'Edit me!', photo: '' },
    { id: 'm2', name: 'Mod Two', role: 'Moderator', bio: 'Edit me!', photo: '' },
  ],
  events: [],
  writings: [],
  photography: [],
  routine: {
    title: 'My Weekly Study Routine',
    name: '',
    rows: [
      { id: 'r1', time: '7:00 - 8:00 AM', mon:'', tue:'', wed:'', thu:'', fri:'', sat:'', sun:'' },
      { id: 'r2', time: '8:00 - 9:00 AM', mon:'', tue:'', wed:'', thu:'', fri:'', sat:'', sun:'' },
    ]
  }
};

let DATA = JSON.parse(JSON.stringify(DEFAULT_DATA));
let calViewDate = new Date();

async function loadData(){
  try {
    const snap = await getDoc(_docRef);
    if(snap.exists()){
      DATA = snap.data();
    } else {
      // First ever load - write defaults to Firestore
      await setDoc(_docRef, JSON.parse(JSON.stringify(DEFAULT_DATA)));
    }
  } catch(e) {
    console.warn('Firestore load failed, using defaults:', e);
  }
  // Routine is always session-only
  DATA.routine = JSON.parse(JSON.stringify(DEFAULT_DATA.routine));
  renderAll();
  const initialPage = (location.hash || '#home').slice(1);
  goToPage(initialPage, true);
}

async function saveData(){
  const toSave = Object.assign({}, DATA);
  delete toSave.routine; // never persist routine
  try {
    await setDoc(_docRef, toSave);
  } catch(e) {
    console.error('Firestore save failed:', e);
    toast('❌ Save failed - ' + e.message);
  }
}
function uid(prefix){ return prefix + '_' + Math.random().toString(36).slice(2,9); }

/* ============================================================
   THEME TOGGLE (green ↔ red)
   ============================================================ */
function setTheme(value){
  const isRed = value === 'red';
  document.body.classList.toggle('theme-red', isRed);
  const switchInput = document.getElementById('themeSwitchInput');
  if(switchInput) switchInput.checked = isRed;
  const switchInputMobile = document.getElementById('themeSwitchInputMobile');
  if(switchInputMobile) switchInputMobile.checked = isRed;
  // Swap all logo images
  const logoSrc = isRed ? 'logo_red.png' : 'logo.jpg';
  const heroLogo = document.querySelector('.hero-logo');
  const navLogo  = document.querySelector('.nav-brand img');
  const footerLogo = document.querySelector('footer .fbrand img');
  if(heroLogo)   heroLogo.src   = logoSrc;
  if(navLogo)    navLogo.src    = logoSrc;
  if(footerLogo) footerLogo.src = logoSrc;
  // update background radial gradient inline
  document.body.style.background = isRed
    ? 'radial-gradient(ellipse at 20% 10%, #3a0612 0%, #0e0106 45%, #060002 100%)'
    : 'radial-gradient(ellipse at 20% 10%, #0d2f1c 0%, #04140d 45%, #020a06 100%)';
}

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove('show'), 2400);
}

function closeModal(id){ document.getElementById(id).classList.remove('open'); }
function openModal(id){ document.getElementById(id).classList.add('open'); }

/* ---------- ABOUT ---------- */
function renderAbout(){
  document.getElementById('aboutText').textContent = DATA.about;
}
function editAbout(){
  const next = prompt('Edit the about text:', DATA.about);
  if(next !== null && next.trim()){
    DATA.about = next.trim();
    saveData(); renderAbout();
    toast('About section updated ✓');
  }
}

/* ---------- PEOPLE (admins/mods) ---------- */
function renderPeople(){
  renderPeopleList('admins', 'adminsGrid');
  renderPeopleList('mods', 'modsGrid');
}
function renderPeopleList(type, gridId){
  const grid = document.getElementById(gridId);
  const list = DATA[type];
  grid.innerHTML = '';
  if(!list.length){
    grid.innerHTML = `<div class="empty-state">No ${type} added yet. Use the button above to add one.</div>`;
    return;
  }
  list.forEach(p=>{
    const card = document.createElement('div');
    card.className = 'person-card';
    const photoSrc = p.photo && p.photo.trim() ? p.photo : placeholderAvatar(p.name);
    card.innerHTML = `
      <img class="person-photo" src="${escapeHtml(photoSrc)}" alt="${escapeHtml(p.name)}" onerror="this.src='${placeholderAvatar(p.name)}'">
      <div class="person-info">
        <span class="person-name">${escapeHtml(p.name)}</span>
        <div class="person-role">${escapeHtml(p.role)}</div>
        <div class="person-bio">${escapeHtml(p.bio)}</div>
      </div>
      <button class="btn small edit-btn edit-only" onclick="openPersonModal('${type}','${p.id}')">✏️ Edit</button>
    `;
    grid.appendChild(card);
  });
}
function placeholderAvatar(name){
  const initials = (name||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='100%' height='100%' fill='%23103b22'/><text x='50%' y='54%' font-family='Outfit, sans-serif' font-size='70' fill='%23e8c873' text-anchor='middle' dominant-baseline='middle'>${initials}</text></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg).replace(/'/g,"%27");
}
function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function openPersonModal(type, id){
  document.getElementById('personListType').value = type;
  document.getElementById('personEditId').value = id || '';
  document.getElementById('personModalTitle').textContent = id ? 'Edit ' + (type==='admins'?'admin':'moderator') : 'Add ' + (type==='admins'?'admin':'moderator');
  document.getElementById('personDeleteBtn').style.display = id ? 'inline-block' : 'none';

  if(id){
    const p = DATA[type].find(x=>x.id===id);
    document.getElementById('personPhotoUrl').value = p.photo || '';
    document.getElementById('personName').value = p.name || '';
    document.getElementById('personRole').value = p.role || '';
    document.getElementById('personBio').value = p.bio || '';
  } else {
    document.getElementById('personPhotoUrl').value = '';
    document.getElementById('personName').value = '';
    document.getElementById('personRole').value = '';
    document.getElementById('personBio').value = '';
  }
  openModal('personModalBackdrop');
}

function savePerson(){
  const type = document.getElementById('personListType').value;
  const id = document.getElementById('personEditId').value;
  const name = document.getElementById('personName').value.trim();
  const role = document.getElementById('personRole').value.trim();
  const bio = document.getElementById('personBio').value.trim();
  const photo = document.getElementById('personPhotoUrl').value.trim();

  if(!name){ toast('Please enter a name'); return; }

  if(id){
    const p = DATA[type].find(x=>x.id===id);
    p.name=name; p.role=role; p.bio=bio; p.photo=photo;
  } else {
    DATA[type].push({ id: uid('p'), name, role, bio, photo });
  }
  saveData();
  renderPeople();
  closeModal('personModalBackdrop');
  toast('Saved ✓');
}
function deletePerson(){
  const type = document.getElementById('personListType').value;
  const id = document.getElementById('personEditId').value;
  if(!id) return;
  if(!confirm('Delete this person?')) return;
  DATA[type] = DATA[type].filter(x=>x.id!==id);
  saveData(); renderPeople();
  closeModal('personModalBackdrop');
  toast('Removed');
}

/* ---------- CALENDAR ---------- */
function pad(n){ return n.toString().padStart(2,'0'); }
function dateKey(y,m,d){ return `${y}-${pad(m+1)}-${pad(d)}`; }

function renderCalendar(){
  const y = calViewDate.getFullYear();
  const m = calViewDate.getMonth();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('calMonthLabel').textContent = `${monthNames[m]} ${y}`;

  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=>{
    const el = document.createElement('div');
    el.className = 'cal-dow'; el.textContent = d;
    grid.appendChild(el);
  });

  const firstDay = new Date(y,m,1).getDay();
  const daysInMonth = new Date(y,m+1,0).getDate();
  const todayKey = dateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  for(let i=0;i<firstDay;i++){
    const el = document.createElement('div');
    el.className = 'cal-cell empty';
    grid.appendChild(el);
  }
  for(let d=1; d<=daysInMonth; d++){
    const key = dateKey(y,m,d);
    const dayEvents = DATA.events.filter(e=>e.date===key);
    const cell = document.createElement('div');
    cell.className = 'cal-cell' + (key===todayKey ? ' today' : '') + (dayEvents.length > 0 ? ' has-events' : '');
    cell.innerHTML = `<div class="cal-daynum">${d}</div>` +
      dayEvents.slice(0,2).map(e=>`<div class="cal-event">${escapeHtml(e.title)}</div>`).join('') +
      (dayEvents.length>2 ? `<div class="cal-event">+${dayEvents.length-2} more</div>` : '');
    cell.onclick = () => {
      if(!document.body.classList.contains('unlocked')){
        if(dayEvents.length >= 1) toast(dayEvents.map(e=>e.title).join(', '));
        return;
      }
      if(dayEvents.length >= 1){ openEventModal(dayEvents[0].id); }
      else { openEventModal(null, key); }
    };
    grid.appendChild(cell);
  }
  renderUpcoming();
}
function changeMonth(delta){
  calViewDate.setMonth(calViewDate.getMonth()+delta);
  renderCalendar();
}
function renderUpcoming(){
  const list = document.getElementById('upcomingList');
  const now = new Date(); now.setHours(0,0,0,0);
  const upcoming = DATA.events
    .filter(e=>new Date(e.date+'T00:00:00') >= now)
    .sort((a,b)=> a.date.localeCompare(b.date))
    .slice(0,8);
  if(!upcoming.length){
    list.innerHTML = `<div class="empty-state">No upcoming events yet.</div>`;
    return;
  }
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  list.innerHTML = upcoming.map(e=>{
    const [yy,mm,dd] = e.date.split('-').map(Number);
    return `<div class="upcoming-item">
      <div class="upcoming-date">${months[mm-1]}<br>${dd}</div>
      <div class="upcoming-info" style="flex:1;">
        <strong>${escapeHtml(e.title)}</strong>
        <span>${e.time ? e.time + ' &middot; ' : ''}${escapeHtml(e.desc||'')}</span>
      </div>
      <button class="btn small edit-only" onclick="openEventModal('${e.id}')">Edit</button>
      <button class="btn small danger edit-only" onclick="quickDeleteEvent('${e.id}')">Remove</button>
    </div>`;
  }).join('');
}

function openEventModal(id, prefillDate){
  document.getElementById('eventEditId').value = id || '';
  document.getElementById('eventModalTitle').textContent = id ? 'Edit event' : 'Add event';
  document.getElementById('eventDeleteBtn').style.display = id ? 'inline-block' : 'none';
  if(id){
    const e = DATA.events.find(x=>x.id===id);
    document.getElementById('eventTitle').value = e.title;
    document.getElementById('eventDate').value = e.date;
    document.getElementById('eventTime').value = e.time||'';
    document.getElementById('eventDesc').value = e.desc||'';
  } else {
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventDate').value = prefillDate || '';
    document.getElementById('eventTime').value = '';
    document.getElementById('eventDesc').value = '';
  }
  openModal('eventModalBackdrop');
}
function saveEvent(){
  const id = document.getElementById('eventEditId').value;
  const title = document.getElementById('eventTitle').value.trim();
  const date = document.getElementById('eventDate').value;
  const time = document.getElementById('eventTime').value;
  const desc = document.getElementById('eventDesc').value.trim();
  if(!title || !date){ toast('Please add a title and date'); return; }
  if(id){
    const e = DATA.events.find(x=>x.id===id);
    e.title=title; e.date=date; e.time=time; e.desc=desc;
  } else {
    DATA.events.push({ id: uid('e'), title, date, time, desc });
  }
  saveData(); renderCalendar();
  closeModal('eventModalBackdrop');
  toast('Event saved ✓');
}
function deleteEvent(){
  const id = document.getElementById('eventEditId').value;
  if(!id) return;
  if(!confirm('Delete this event?')) return;
  DATA.events = DATA.events.filter(x=>x.id!==id);
  saveData(); renderCalendar();
  closeModal('eventModalBackdrop');
  toast('Event removed');
}
function quickDeleteEvent(id){
  if(!confirm('Delete this event?')) return;
  DATA.events = DATA.events.filter(x=>x.id!==id);
  saveData(); renderCalendar();
  toast('Event removed');
}

function downloadICS(){
  if(!DATA.events.length){ toast('No events to export yet'); return; }
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Memebrane//Events//EN\r\nCALSCALE:GREGORIAN\r\n';
  DATA.events.forEach(e=>{
    const dt = e.date.replace(/-/g,'');
    const timePart = e.time ? e.time.replace(':','') + '00' : '090000';
    ics += 'BEGIN:VEVENT\r\n';
    ics += `UID:${e.id}@memebrane\r\n`;
    ics += `DTSTAMP:${dt}T${timePart}Z\r\n`;
    ics += `DTSTART:${dt}T${timePart}Z\r\n`;
    ics += `SUMMARY:${(e.title||'').replace(/\n/g,' ')}\r\n`;
    if(e.desc) ics += `DESCRIPTION:${e.desc.replace(/\n/g,' ')}\r\n`;
    ics += 'END:VEVENT\r\n';
  });
  ics += 'END:VCALENDAR\r\n';
  const blob = new Blob([ics], {type:'text/calendar'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'memebrane-events.ics';
  a.click();
  toast('Calendar file downloaded - open it to add to your phone/PC calendar');
}

/* ---------- SUBMISSIONS (writings / photography) ---------- */
function renderSubmissions(){
  renderWritings();
  renderPhotography();
}
function renderWritings(){
  const grid = document.getElementById('writingsGrid');
  const list = DATA.writings;
  grid.innerHTML = '';
  if(!list.length){
    grid.innerHTML = `<div class="empty-state">Nothing published yet. Be the first Memebraniac to submit!</div>`;
    return;
  }
  const reversed = [...list].reverse();
  reversed.forEach((item, idx)=>{
    const entry = document.createElement('div');
    const hasImage = !!(item.image && item.image.trim());
    entry.className = 'writing-entry fade-up visible' + (hasImage ? ' has-image' : '');
    const bodyId = 'body_' + item.id;
    const btnId = 'rmb_' + item.id;
    const num = String(idx + 1).padStart(2,'0');
    entry.innerHTML = `
      ${hasImage ? `<img class="writing-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">` : ''}
      <div class="writing-content">
        <span class="writing-index">${num}</span>
        <div class="writing-head">
          <span class="writing-title">${escapeHtml(item.title)}</span>
          <span class="writing-author">by ${escapeHtml(item.author)}</span>
        </div>
        ${item.body ? `<div class="writing-body" id="${bodyId}">${escapeHtml(item.body)}</div>` : ''}
        <div class="writing-foot">
          ${item.body ? `<button class="read-more-btn" id="${btnId}" onclick="toggleReadMore('${bodyId}','${btnId}')">Read more ↓</button>` : ''}
          <button class="btn small danger edit-only" onclick="deleteSubmission('writings','${item.id}')">Remove</button>
        </div>
      </div>
    `;
    grid.appendChild(entry);
  });
}
function toggleReadMore(bodyId, btnId){
  const body = document.getElementById(bodyId);
  const btn = document.getElementById(btnId);
  if(!body || !btn) return;
  const expanded = body.classList.toggle('expanded');
  btn.textContent = expanded ? 'Read less ↑' : 'Read more ↓';
}

function getPhotoColCount(){
  const w = window.innerWidth;
  if(w <= 680) return 2;
  if(w <= 980) return 3;
  return 4;
}

function renderPhotography(){
  const grid = document.getElementById('photographyGrid');
  const list = [...DATA.photography].reverse();
  grid.innerHTML = '';
  if(!list.length){
    grid.innerHTML = `<div class="empty-state">No photos published yet. Be the first Memebraniac to submit!</div>`;
    return;
  }

  const cols = getPhotoColCount();
  const colEls = Array.from({length: cols}, ()=>{
    const col = document.createElement('div');
    col.className = 'photo-grid-col';
    grid.appendChild(col);
    return col;
  });
  const colHeights = new Array(cols).fill(0);

  function buildTile(item){
    const tile = document.createElement('div');
    tile.className = 'photo-tile fade-up visible';
    tile.innerHTML = `
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" onclick="openLightbox('${item.id}')">
      <div class="photo-tile-caption">
        <span class="photo-tile-title">${escapeHtml(item.title)}</span>
        <span class="photo-tile-author">by ${escapeHtml(item.author)}</span>
      </div>
      <button class="btn small danger edit-only photo-delete" onclick="deleteSubmission('photography','${item.id}')">✕</button>
    `;
    return tile;
  }

  // Estimate each image's aspect ratio before placing, so tiles land in the
  // currently-shortest column (real masonry balancing) instead of just
  // round-robin order, which leaves gaps when there are few images.
  const ratioPromises = list.map(item=>new Promise(resolve=>{
    const probe = new Image();
    probe.onload = ()=> resolve(probe.naturalWidth && probe.naturalHeight ? probe.naturalHeight/probe.naturalWidth : 0.75);
    probe.onerror = ()=> resolve(0.75);
    probe.src = item.image;
    // Safety net: don't let one slow image stall the whole layout.
    setTimeout(()=> resolve(0.75), 4000);
  }));

  Promise.all(ratioPromises).then(ratios=>{
    list.forEach((item, i)=>{
      const tile = buildTile(item);
      const shortest = colHeights.indexOf(Math.min(...colHeights));
      colEls[shortest].appendChild(tile);
      colHeights[shortest] += ratios[i];

      const img = tile.querySelector('img');
      img.addEventListener('error', ()=>{
        img.style.aspectRatio = '4/3';
        img.style.objectFit = 'cover';
        img.style.background = 'rgba(255,255,255,0.04)';
      });
    });
  });
}
window.addEventListener('resize', debounce(()=>{
  if(document.getElementById('page-photography') && !document.getElementById('page-photography').hidden){
    if(getPhotoColCount() !== document.querySelectorAll('#photographyGrid .photo-grid-col').length){
      renderPhotography();
    }
  }
}, 250));
function debounce(fn, ms){
  let t;
  return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), ms); };
}
function openLightbox(id){
  const item = DATA.photography.find(x=>x.id===id);
  if(!item) return;
  document.getElementById('lightboxImg').src = item.image;
  document.getElementById('lightboxTitle').textContent = item.title;
  document.getElementById('lightboxAuthor').textContent = 'by ' + item.author;
  document.getElementById('lightboxBackdrop').classList.add('open');
}
function closeLightbox(){
  document.getElementById('lightboxBackdrop').classList.remove('open');
}
function openSubmitModal(type){
  document.getElementById('submitListType').value = type;
  document.getElementById('submitModalTitle').textContent = type==='writings' ? 'Submit a writing' : 'Submit a photo';
  document.getElementById('submitTitle').value = '';
  document.getElementById('submitAuthor').value = '';
  document.getElementById('submitImageUrl').value = '';
  document.getElementById('submitBody').value = '';
  document.getElementById('submitBodyField').style.display = type==='writings' ? 'block' : 'none';
  document.getElementById('submitBody').placeholder = 'Write here...';
  openModal('submitModalBackdrop');
}
function saveSubmission(){
  const type = document.getElementById('submitListType').value;
  const title = document.getElementById('submitTitle').value.trim();
  const author = document.getElementById('submitAuthor').value.trim() || 'Anonymous';
  const body = document.getElementById('submitBody').value.trim();
  let imageUrl = document.getElementById('submitImageUrl').value.trim();

  if(!title){ toast('Please add a title'); return; }
  if(type==='photography' && !imageUrl){
    toast('Please add a photo URL from imgbb.com'); return;
  }

  DATA[type].push({ id: uid('s'), title, author, body, image: imageUrl || '' });
  saveData(); renderSubmissions();
  closeModal('submitModalBackdrop');
  toast('Published ✓');
}
function deleteSubmission(type,id){
  if(!confirm('Remove this submission?')) return;
  DATA[type] = DATA[type].filter(x=>x.id!==id);
  saveData(); renderSubmissions();
  toast('Removed');
}

/* ---------- ROUTINE PLANNER ---------- */
const ROUTINE_DAYS = [
  {key:'mon',label:'Mon'},{key:'tue',label:'Tue'},{key:'wed',label:'Wed'},
  {key:'thu',label:'Thu'},{key:'fri',label:'Fri'},{key:'sat',label:'Sat'},{key:'sun',label:'Sun'}
];
function renderRoutine(){
  document.getElementById('routineTitle').value = DATA.routine.title;
  document.getElementById('routineName').value = DATA.routine.name;

  const headRow = document.getElementById('routineHeadRow');
  headRow.innerHTML = '<th>Time</th>' + ROUTINE_DAYS.map(d=>`<th>${d.label}</th>`).join('') + '<th></th>';

  const body = document.getElementById('routineBody');
  body.innerHTML = '';
  DATA.routine.rows.forEach(row=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><input value="${escapeAttr(row.time)}" onchange="updateRoutineCell('${row.id}','time',this.value)" placeholder="e.g. 7:00 - 8:00 AM"></td>` +
      ROUTINE_DAYS.map(d=>`<td><input value="${escapeAttr(row[d.key])}" onchange="updateRoutineCell('${row.id}','${d.key}',this.value)" placeholder="-"></td>`).join('') +
      `<td class="routine-action-cell"><button class="btn small danger" onclick="removeRoutineRow('${row.id}')">✕</button></td>`;
    body.appendChild(tr);
  });
}
function escapeAttr(s){ return (s??'').replace(/"/g,'&quot;'); }
function updateRoutineCell(id, field, value){
  const row = DATA.routine.rows.find(r=>r.id===id);
  row[field] = value;
  // Routine is session-only - no saveData() here
}
function addRoutineRow(){
  DATA.routine.rows.push({ id: uid('r'), time:'', mon:'',tue:'',wed:'',thu:'',fri:'',sat:'',sun:'' });
  renderRoutine(); // no saveData
}
function removeRoutineRow(id){
  DATA.routine.rows = DATA.routine.rows.filter(r=>r.id!==id);
  renderRoutine(); // no saveData
}
function resetRoutine(){
  if(!confirm('Reset the entire routine table?')) return;
  DATA.routine = JSON.parse(JSON.stringify(DEFAULT_DATA.routine));
  renderRoutine(); // no saveData
  toast('Routine reset');
}
document.addEventListener('change', e=>{
  if(e.target.id==='routineTitle'){ DATA.routine.title = e.target.value; } // no saveData
  if(e.target.id==='routineName'){ DATA.routine.name = e.target.value; }   // no saveData
});

async function downloadRoutinePDF(){
  // Fetch logo and clip to circle using an offscreen canvas
  let logoCircleB64 = null;
  try {
    const resp = await fetch('/logo.jpg');
    const blob = await resp.blob();
    const imgBitmap = await createImageBitmap(blob);
    const sz = 200; // high-res offscreen canvas for crisp rendering
    const oc = document.createElement('canvas');
    oc.width = sz; oc.height = sz;
    const ox = oc.getContext('2d');
    ox.clearRect(0, 0, sz, sz);
    // clip to circle
    ox.beginPath();
    ox.arc(sz/2, sz/2, sz/2, 0, Math.PI*2);
    ox.closePath();
    ox.clip();
    ox.drawImage(imgBitmap, 0, 0, sz, sz);
    logoCircleB64 = oc.toDataURL('image/png');
  } catch(e){ logoCircleB64 = null; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'pt', format:'a4', orientation:'landscape' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // ---- Black & Silver palette ----
  const BLACK      = [8,   8,   8 ];  // page background
  const CHARCOAL   = [22,  22,  22];  // header band
  const DARK_ROW   = [14,  14,  14];  // even rows
  const ALT_ROW    = [28,  28,  28];  // odd rows
  const SILVER     = [192, 192, 192]; // primary accent / text
  const SILVER_DIM = [110, 110, 110]; // subdued silver
  const SILVER_BRT = [230, 230, 230]; // bright silver / headings
  const WHITE      = [255, 255, 255]; // pure white text
  const LINE       = [40,  40,  40 ]; // grid lines
  const LINE_BRT   = [65,  65,  65 ]; // brighter grid lines
  const ACCENT     = [200, 200, 200]; // silver accent bar

  // ---- Full black background ----
  doc.setFillColor(...BLACK);
  doc.rect(0, 0, pageW, pageH, 'F');

  // ---- Subtle concentric circles top-right (decorative) ----
  [160, 115, 75, 42].forEach((r, i) => {
    doc.setDrawColor(...SILVER_DIM);
    doc.setLineWidth(0.3);
    doc.setGState(doc.GState({ opacity: 0.06 + i * 0.02 }));
    doc.circle(pageW, 0, r, 'S');
  });
  doc.setGState(doc.GState({ opacity: 1 }));

  // ---- Silver top-edge accent bar ----
  doc.setFillColor(...SILVER);
  doc.rect(0, 0, pageW, 2.5, 'F');

  // ---- Header band ----
  const headerH = 72;
  doc.setFillColor(...CHARCOAL);
  doc.rect(0, 2.5, pageW, headerH, 'F');

  // Thin silver line under header
  doc.setDrawColor(...LINE_BRT);
  doc.setLineWidth(0.5);
  doc.line(0, 2.5 + headerH, pageW, 2.5 + headerH);

  // ---- Logo ----
  const logoSize = 44;
  const logoX = 20;
  const logoY = 2.5 + (headerH - logoSize) / 2;
  if(logoCircleB64){
    // Already circle-clipped PNG from canvas — drop it straight in
    doc.addImage(logoCircleB64, 'PNG', logoX, logoY, logoSize, logoSize);
    // Crisp silver ring border
    doc.setDrawColor(...SILVER);
    doc.setLineWidth(1.2);
    doc.circle(logoX + logoSize/2, logoY + logoSize/2, logoSize/2 + 0.5, 'S');
  } else {
    // Fallback drawn mark
    const cx = logoX + logoSize/2, cy = logoY + logoSize/2;
    doc.setFillColor(...CHARCOAL);
    doc.circle(cx, cy, logoSize/2, 'F');
    doc.setDrawColor(...SILVER);
    doc.setLineWidth(1.2);
    doc.circle(cx, cy, logoSize/2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...SILVER_BRT);
    doc.text('M', cx, cy + 6.5, { align:'center' });
  }

  // Title
  const textX = logoX + logoSize + 14;
  const midY  = 2.5 + headerH / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  doc.text(DATA.routine.title || 'Study Routine', textX, midY - 6);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...SILVER_DIM);
  const subLeft = DATA.routine.name ? `${DATA.routine.name}  ·  Memebrane Study Planner` : 'Memebrane Study Planner';
  doc.text(subLeft, textX, midY + 11);

  // Date & URL — top right
  const dateStr = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  doc.setFontSize(8.5);
  doc.setTextColor(...SILVER_DIM);
  doc.text(dateStr, pageW - 24, midY - 6, { align:'right' });
  doc.setTextColor(...LINE_BRT);
  doc.text('memebraniacs.vercel.app', pageW - 24, midY + 10, { align:'right' });

  // ---- Table geometry ----
  const days = ROUTINE_DAYS;
  const margin = 24;
  const startX = margin;
  const startY = 2.5 + headerH + 18;
  const tableW = pageW - margin * 2;
  const footerReserve = 30;
  const tableH = pageH - startY - footerReserve;

  const colTimeW = 88;
  const colW = (tableW - colTimeW) / days.length;
  const headRowH = 30;
  const bodyRowCount = Math.max(DATA.routine.rows.length, 1);
  const bodyRowH = Math.max(28, (tableH - headRowH) / bodyRowCount);
  const tableContentH = headRowH + bodyRowH * bodyRowCount;

  // Table outer border
  doc.setDrawColor(...SILVER_DIM);
  doc.setLineWidth(1);
  doc.rect(startX, startY, tableW, tableContentH, 'S');

  // ---- Day header row ----
  doc.setFillColor(...CHARCOAL);
  doc.rect(startX, startY, tableW, headRowH, 'F');

  // TIME label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...SILVER);
  doc.text('TIME', startX + colTimeW / 2, startY + headRowH / 2 + 3, { align:'center' });

  // divider after time col
  doc.setDrawColor(...SILVER_DIM);
  doc.setLineWidth(0.7);
  doc.line(startX + colTimeW, startY, startX + colTimeW, startY + headRowH);

  days.forEach((d, i) => {
    const x = startX + colTimeW + i * colW;
    if(i > 0){
      doc.setDrawColor(...LINE_BRT);
      doc.setLineWidth(0.4);
      doc.line(x, startY + 6, x, startY + headRowH - 6);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...SILVER_BRT);
    doc.text(d.label.toUpperCase(), x + colW / 2, startY + headRowH / 2 + 3.5, { align:'center' });
  });

  // ---- Body rows ----
  let y = startY + headRowH;
  DATA.routine.rows.forEach((row, ri) => {
    const isAlt = ri % 2 === 1;
    doc.setFillColor(...(isAlt ? ALT_ROW : DARK_ROW));
    doc.rect(startX, y, tableW, bodyRowH, 'F');

    // time col slightly lighter tint
    doc.setFillColor(35, 35, 35);
    doc.rect(startX, y, colTimeW, bodyRowH, 'F');

    // row border
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.4);
    doc.rect(startX, y, tableW, bodyRowH, 'S');

    // time col divider
    doc.setDrawColor(...LINE_BRT);
    doc.setLineWidth(0.6);
    doc.line(startX + colTimeW, y, startX + colTimeW, y + bodyRowH);

    // Time text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...SILVER);
    const timeLines = doc.splitTextToSize(row.time || '—', colTimeW - 12);
    doc.text(timeLines, startX + colTimeW / 2, y + bodyRowH / 2 - (timeLines.length - 1) * 5.5 + 3.5, { align:'center' });

    // Day cells
    days.forEach((d, i) => {
      const x = startX + colTimeW + i * colW;
      if(i > 0){
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.4);
        doc.line(x, y, x, y + bodyRowH);
      }
      const text = row[d.key] || '';
      doc.setFontSize(9.5);
      if(text){
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...WHITE);
        const lines = doc.splitTextToSize(text, colW - 12);
        doc.text(lines, x + colW / 2, y + bodyRowH / 2 - (lines.length - 1) * 5.5 + 3.5, { align:'center' });
      } else {
        doc.setTextColor(...LINE_BRT);
        doc.text('·', x + colW / 2, y + bodyRowH / 2 + 3.5, { align:'center' });
      }
    });
    y += bodyRowH;
  });

  // ---- Footer ----
  const footerY = pageH - 10;
  doc.setDrawColor(...LINE_BRT);
  doc.setLineWidth(0.4);
  doc.line(margin, footerY - 14, pageW - margin, footerY - 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...SILVER);
  doc.text('Memebrane', margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SILVER_DIM);
  doc.text('  ·  Made for the Memebraniacs. Stick this on your wall and stay on track.', margin + 50, footerY);

  doc.setTextColor(...LINE_BRT);
  doc.text('Stay consistent. Stay chaotic.', pageW - margin, footerY, { align:'right' });

  doc.save(((DATA.routine.name||'memebrane')+'-routine').replace(/\s+/g,'_') + '.pdf');
  toast('PDF downloaded ✓');
}

/* ---------- PAGE ROUTER ---------- */
const PAGES = ['home','events','writings','photography','routine','universities'];

function goToPage(pageId, skipHash){
  if(!PAGES.includes(pageId)) pageId = 'home';
  PAGES.forEach(p=>{
    const el = document.getElementById('page-'+p);
    if(el) el.hidden = (p !== pageId);
  });
  document.querySelectorAll('.nav-link:not(.theme-tab)').forEach(a=>{
    a.classList.toggle('active', a.dataset.page === pageId);
  });
  document.getElementById('navLinks').classList.remove('open');
  document.getElementById('navToggle').classList.remove('is-open');
  window.scrollTo({top:0, behavior:'instant' in window ? 'instant' : 'auto'});
  if(!skipHash) history.replaceState(null, '', '#'+pageId);
  setupFadeUps();
  updateScrollProgress();
}

document.getElementById('navToggle').addEventListener('click', (e)=>{
  document.getElementById('navLinks').classList.toggle('open');
  e.currentTarget.classList.toggle('is-open');
});
document.querySelectorAll('.nav-link:not(.theme-tab)').forEach(a=>{
  a.addEventListener('click', (e)=>{
    e.preventDefault();
    goToPage(a.dataset.page);
  });
});

function setupFadeUps(){
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold:0.15 });
  document.querySelectorAll('.page:not([hidden]) .fade-up').forEach(el=>obs.observe(el));
}

/* ---------- INIT ---------- */
function renderAll(){
  renderAbout();
  renderPeople();
  renderCalendar();
  renderSubmissions();
  renderRoutine();
  document.getElementById('yearNow').textContent = new Date().getFullYear();
}
// loadData() is async - it fetches from Firestore, then renders
loadData();

/* ============================================================
   EXPOSE FUNCTIONS TO WINDOW
   Required because type="module" scopes everything privately.
   All functions called from HTML onclick= must be listed here.
   ============================================================ */
window.editAbout         = editAbout;
window.openPersonModal   = openPersonModal;
window.savePerson        = savePerson;
window.deletePerson      = deletePerson;
window.changeMonth       = changeMonth;
window.openEventModal    = openEventModal;
window.saveEvent         = saveEvent;
window.deleteEvent       = deleteEvent;
window.quickDeleteEvent  = quickDeleteEvent;
window.downloadICS       = downloadICS;
window.openSubmitModal   = openSubmitModal;
window.saveSubmission    = saveSubmission;
window.deleteSubmission  = deleteSubmission;
window.toggleReadMore    = toggleReadMore;
window.renderUniversities = renderUniversities;
window.setUniFilter      = setUniFilter;
window.toggleUniCard     = toggleUniCard;
window.openLightbox      = openLightbox;
window.closeLightbox     = closeLightbox;
window.addRoutineRow     = addRoutineRow;
window.removeRoutineRow  = removeRoutineRow;
window.resetRoutine      = resetRoutine;
window.downloadRoutinePDF = downloadRoutinePDF;
window.closeModal        = closeModal;
window.submitUnlock      = submitUnlock;
window.closeUnlockPanel  = closeUnlockPanel;
window.goToPage          = goToPage;
window.updateRoutineCell = updateRoutineCell;

/* ============================================================
   HORIZONTAL SCROLL PROGRESS BAR (replaces native scrollbar)
   ============================================================ */
function updateScrollProgress(){
  const bar = document.getElementById('navProgressBar');
  if(!bar) return;
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
  bar.style.width = pct + '%';
}
window.addEventListener('scroll', updateScrollProgress, { passive:true });
window.addEventListener('resize', updateScrollProgress);
updateScrollProgress();

/* ============================================================
   CUSTOM CURSOR - DNA helix spiral trail (arc-length based)
   ============================================================ */
(function(){
  const dot = document.getElementById('cursor-dot');
  const cc  = document.getElementById('cursor-canvas');
  if(!dot || !cc) return;
  if(window.matchMedia('(hover: none)').matches) return;

  let W = cc.width  = window.innerWidth;
  let H = cc.height = window.innerHeight;
  window.addEventListener('resize', ()=>{ W = cc.width = window.innerWidth; H = cc.height = window.innerHeight; });
  const ctx = cc.getContext('2d');

  let mouseX = W/2, mouseY = H/2;
  let isPointer = false, isDown = false;

  // Store positions WITH cumulative arc-length so phase is distance-based, not index-based.
  // That's what keeps the helix tight regardless of cursor speed.
  const MAX_LEN = 160;   // max px of trail kept (physical length)
  const PIXELS_PER_TURN = 28; // one full helix turn every N pixels
  const history = [];    // [{x, y, arc}]  arc = cumulative distance from tip
  let totalArc = 0;

  window.addEventListener('mousemove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    dot.style.left = mouseX + 'px';
    dot.style.top  = mouseY + 'px';

    const last = history[history.length - 1];
    const dx = last ? mouseX - last.x : 0;
    const dy = last ? mouseY - last.y : 0;
    const step = Math.sqrt(dx*dx + dy*dy);
    totalArc += step;
    history.push({ x: mouseX, y: mouseY, arc: totalArc });

    // Trim to MAX_LEN physical pixels from the tip
    while(history.length > 1 && (totalArc - history[0].arc) > MAX_LEN){
      history.shift();
    }
  });

  const interactiveSelector = 'a,button,input,textarea,select,.person-card,.writing-entry,.photo-tile,.cal-cell,[onclick]';
  document.addEventListener('mouseover', e => { if(e.target.closest(interactiveSelector)){ isPointer=true;  document.body.classList.add('cursor-pointer'); }});
  document.addEventListener('mouseout',  e => { if(e.target.closest(interactiveSelector)){ isPointer=false; document.body.classList.remove('cursor-pointer'); }});
  document.addEventListener('mousedown', ()=>{ isDown=true;  document.body.classList.add('cursor-down'); });
  document.addEventListener('mouseup',   ()=>{ isDown=false; document.body.classList.remove('cursor-down'); });
  document.addEventListener('mouseleave',()=>{ dot.style.opacity='0'; });
  document.addEventListener('mouseenter',()=>{ dot.style.opacity='1'; });

  function getColors(){
    const red = document.body.classList.contains('theme-red');
    return red
      ? { strand1:'#5f6fc4', strand2:'#8b9ae0', rung:'rgba(139,154,224,' }
      : { strand1:'#8b8bd6', strand2:'#c9536a',  rung:'rgba(201,83,106,' };
  }

  let tick = 0;
  function draw(){
    ctx.clearRect(0, 0, W, H);
    tick++;

    const n = history.length;
    if(n < 2){ requestAnimationFrame(draw); return; }

    const col = getColors();
    const amplitude = isPointer ? 11 : isDown ? 4 : 8;
    const tipArc = history[n-1].arc;
    const tailArc = history[0].arc;
    const trailLen = tipArc - tailArc || 1;

    for(let i = 1; i < n; i++){
      const p0 = history[i-1];
      const p1 = history[i];

      // t=0 at tail (oldest), t=1 at tip (newest)
      const t0 = (p0.arc - tailArc) / trailLen;
      const t1 = (p1.arc - tailArc) / trailLen;
      const tMid = (t0 + t1) / 2;

      // Arc-length-based phase: constant turns-per-pixel regardless of speed
      const phase0 = (p0.arc / PIXELS_PER_TURN) * Math.PI * 2 + tick * 0.03;
      const phase1 = (p1.arc / PIXELS_PER_TURN) * Math.PI * 2 + tick * 0.03;

      // Perpendicular normals for each point
      const dx = p1.x - p0.x, dy = p1.y - p0.y;
      const d  = Math.sqrt(dx*dx + dy*dy) || 1;
      const nx = -dy/d, ny = dx/d;

      const amp0 = amplitude * t0;
      const amp1 = amplitude * t1;

      // Strand positions
      const s1x0 = p0.x + nx * Math.sin(phase0) * amp0;
      const s1y0 = p0.y + ny * Math.sin(phase0) * amp0;
      const s1x1 = p1.x + nx * Math.sin(phase1) * amp1;
      const s1y1 = p1.y + ny * Math.sin(phase1) * amp1;

      const s2x0 = p0.x + nx * Math.sin(phase0 + Math.PI) * amp0;
      const s2y0 = p0.y + ny * Math.sin(phase0 + Math.PI) * amp0;
      const s2x1 = p1.x + nx * Math.sin(phase1 + Math.PI) * amp1;
      const s2y1 = p1.y + ny * Math.sin(phase1 + Math.PI) * amp1;

      const alpha = tMid * 0.88;

      // Strand 1
      ctx.beginPath();
      ctx.moveTo(s1x0, s1y0); ctx.lineTo(s1x1, s1y1);
      ctx.strokeStyle = col.strand1;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Strand 2
      ctx.beginPath();
      ctx.moveTo(s2x0, s2y0); ctx.lineTo(s2x1, s2y1);
      ctx.strokeStyle = col.strand2;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Rungs at fixed arc-length intervals (every 14px of trail)
      const RUNG_INTERVAL = 14;
      if(Math.floor(p1.arc / RUNG_INTERVAL) !== Math.floor(p0.arc / RUNG_INTERVAL) && tMid > 0.08){
        const midX = (s1x1 + s2x1) / 2;
        const midY = (s1y1 + s2y1) / 2;

        ctx.beginPath();
        ctx.moveTo(s1x1, s1y1); ctx.lineTo(s2x1, s2y1);
        ctx.strokeStyle = col.rung + (alpha * 0.9) + ')';
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Node dots
        ctx.globalAlpha = alpha;
        ctx.fillStyle = col.strand1;
        ctx.beginPath(); ctx.arc(s1x1, s1y1, 1.6 * tMid, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = col.strand2;
        ctx.beginPath(); ctx.arc(s2x1, s2y1, 1.6 * tMid, 0, Math.PI*2); ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();
})();


window.setTheme = setTheme;

/* ============================================================
   SECRET EDITOR UNLOCK
   Sequence: press Space 5 times in a row, then Enter 5 times in
   a row (not while typing in a field) to reveal the password
   panel. Entering the correct password signs in to Firebase Auth,
   which is what Firestore security rules actually check before
   allowing writes - the password itself is just a convenience
   gate on the UI; the real protection lives in the Firestore
   rules (request.auth != null) on the server side.
   Reloading signs you back out (auth persistence is set to
   session-only), so every fresh page load starts locked.
   The Routine Planner's controls are NOT gated - always visible.
   ============================================================ */
const ADMIN_EMAIL = 'admin@memebrane.local'; // fixed account, password is what editors type
const SEQUENCE_RESET_MS = 1200;

let unlockStage = 0; // 0 = waiting for spaces, 1 = spaces done, waiting for enters
let stageCount = 0;
let stageTimer = null;

function isTypingTarget(el){
  if(!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}
function resetUnlockSequence(){
  unlockStage = 0; stageCount = 0;
}

document.addEventListener('keydown', (e)=>{
  if(isTypingTarget(e.target)) return; // don't hijack keys while typing anywhere

  const isSpace = e.code === 'Space';
  const isEnter = e.code === 'Enter' || e.code === 'NumpadEnter';

  if(unlockStage === 0){
    if(isSpace){
      stageCount++;
      clearTimeout(stageTimer);
      stageTimer = setTimeout(resetUnlockSequence, SEQUENCE_RESET_MS);
      if(stageCount >= 5){
        unlockStage = 1; stageCount = 0;
        clearTimeout(stageTimer);
        stageTimer = setTimeout(resetUnlockSequence, SEQUENCE_RESET_MS);
      }
    } else if(isEnter){
      resetUnlockSequence();
    }
    // any other key: ignore, don't reset (lets natural typing/scrolling pass through)
  } else if(unlockStage === 1){
    if(isEnter){
      stageCount++;
      clearTimeout(stageTimer);
      stageTimer = setTimeout(resetUnlockSequence, SEQUENCE_RESET_MS);
      if(stageCount >= 5){
        resetUnlockSequence();
        openUnlockPanel();
      }
    } else if(isSpace){
      resetUnlockSequence();
    }
  }
});

function openUnlockPanel(){
  document.getElementById('unlockError').textContent = '';
  document.getElementById('unlockInput').value = '';
  document.getElementById('unlockBackdrop').classList.add('open');
  setTimeout(()=> document.getElementById('unlockInput').focus(), 50);
}
function closeUnlockPanel(){
  document.getElementById('unlockBackdrop').classList.remove('open');
}
async function submitUnlock(){
  const val = document.getElementById('unlockInput').value;
  const btn = document.querySelector('#unlockBackdrop .btn:not(.secondary)');
  if(btn){ btn.disabled = true; btn.textContent = 'Checking…'; }
  try {
    await signInWithEmailAndPassword(_auth, ADMIN_EMAIL, val);
    document.body.classList.add('unlocked');
    closeUnlockPanel();
    toast('Editor controls unlocked for this page load ✓');
  } catch(e) {
    console.error('Unlock auth error:', e.code, e.message);
    let msg = 'Incorrect password.';
    if(e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password'){
      msg = 'Incorrect password.';
    } else if(e.code === 'auth/user-not-found'){
      msg = 'Admin account not found — check Firebase Users tab.';
    } else if(e.code === 'auth/unauthorized-domain'){
      msg = 'This domain isn\'t authorized in Firebase Auth settings.';
    } else if(e.code === 'auth/too-many-requests'){
      msg = 'Too many attempts — wait a bit and try again.';
    } else if(e.code){
      msg = 'Login error: ' + e.code;
    }
    document.getElementById('unlockError').textContent = msg;
    document.getElementById('unlockInput').value = '';
    document.getElementById('unlockInput').focus();
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = 'Unlock'; }
  }
}
document.getElementById('unlockInput').addEventListener('keydown', (e)=>{
  if(e.key === 'Enter') submitUnlock();
});
// Note: deliberately no persistence (no localStorage/sessionStorage) -
// every reload starts locked, by design.




/* ============================================================
   AMBIENT BACKGROUND - bubbles, drifting brain glyphs, particles
   ============================================================ */
(function(){
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W,H;

  // Mobile browsers fire resize repeatedly as the address bar shows/hides,
  // which used to make the canvas (and the rest of the fixed background)
  // visibly jump on scroll. The canvas/background layers are now
  // position:absolute against body's full content height instead of
  // position:fixed against the viewport, so they no longer move at all
  // when the toolbar collapses/expands. To match, the drawing buffer is
  // sized to the document's scroll height (not window.innerHeight) and
  // only recalculated on real layout changes - width change or
  // orientation change - never on a height-only delta, since on mobile
  // a height-only delta almost always just means the address bar moved.
  function resize(){
    const w = Math.round(window.innerWidth);
    const h = Math.round(window.innerHeight);
    if(w === W && Math.abs(h - H) < 40) return;
    W = w; H = h;
    canvas.width = W;
    canvas.height = H;
  }
  resize();

  let resizeTimer;
  window.addEventListener('resize', ()=>{
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });
  window.addEventListener('orientationchange', ()=>{
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 250);
  });

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function rand(a,b){ return a + Math.random()*(b-a); }

  // Bubbles (membrane organelles) - dialed down for a subtler, more luxury ambience
  const bubbles = Array.from({length: 14}, ()=>({
    x: rand(0,1)*W, y: rand(0,1)*H,
    r: rand(8,46),
    vy: rand(0.05,0.2),
    vx: rand(-0.05,0.05),
    hue: Math.random()>0.5 ? 'gold' : 'green',
    alpha: rand(0.03,0.1),
    wobble: rand(0,Math.PI*2),
    wobbleSpeed: rand(0.002,0.006)
  }));

  // Floating particles
  const particles = Array.from({length: 45}, ()=>({
    x: rand(0,1)*W, y: rand(0,1)*H,
    r: rand(0.5,1.8),
    vy: rand(0.04,0.18),
    vx: rand(-0.04,0.04),
    alpha: rand(0.08,0.3)
  }));

  // Drifting brain glyph paths (simple blob "brain" silhouettes drawn procedurally)
  const brains = Array.from({length: 3}, ()=>({
    x: rand(0,1)*W, y: rand(0,1)*H,
    scale: rand(0.5,1.1),
    rot: rand(0,Math.PI*2),
    rotSpeed: rand(-0.0006,0.0006),
    vx: rand(-0.06,0.06),
    vy: rand(-0.04,0.04),
    alpha: rand(0.025,0.05)
  }));

  function drawBrainGlyph(b){
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    ctx.scale(b.scale, b.scale);
    ctx.globalAlpha = b.alpha;
    ctx.strokeStyle = document.body.classList.contains('theme-red') ? '#8b9ae0' : '#c9536a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // a loose brain-like double lobe outline
    ctx.moveTo(-40, 0);
    ctx.bezierCurveTo(-60,-40, -10,-55, 0,-30);
    ctx.bezierCurveTo(10,-55, 60,-40, 40,0);
    ctx.bezierCurveTo(60,30, 10,50, 0,28);
    ctx.bezierCurveTo(-10,50, -60,30, -40,0);
    ctx.closePath();
    ctx.stroke();
    // folds
    for(let i=0;i<3;i++){
      ctx.beginPath();
      ctx.moveTo(-30+i*20, -20+i*5);
      ctx.quadraticCurveTo(-10+i*15, 0, -25+i*20, 22-i*4);
      ctx.stroke();
    }
    ctx.restore();
  }

  function frame(){
    ctx.clearRect(0,0,W,H);
    const isRed = document.body.classList.contains('theme-red');

    // bubbles
    bubbles.forEach(b=>{
      b.y -= b.vy; b.wobble += b.wobbleSpeed;
      b.x += b.vx + Math.sin(b.wobble)*0.15;
      if(b.y < -b.r){ b.y = H + b.r; b.x = rand(0,1)*W; }
      if(b.x < -b.r) b.x = W + b.r;
      if(b.x > W + b.r) b.x = -b.r;

      const grad = ctx.createRadialGradient(b.x-b.r*0.3, b.y-b.r*0.3, b.r*0.1, b.x, b.y, b.r);
      if(isRed){
        // blue-accent variant: crimson→blue, violet→lighter blue
        if(b.hue==='gold'){
          grad.addColorStop(0, `rgba(95,111,196,${b.alpha+0.08})`);
          grad.addColorStop(0.7, `rgba(70,82,160,${b.alpha*0.4})`);
          grad.addColorStop(1, `rgba(70,82,160,0)`);
        } else {
          grad.addColorStop(0, `rgba(139,154,224,${b.alpha+0.07})`);
          grad.addColorStop(0.7, `rgba(110,120,190,${b.alpha*0.4})`);
          grad.addColorStop(1, `rgba(110,120,190,0)`);
        }
      } else {
        if(b.hue==='gold'){
          grad.addColorStop(0, `rgba(168,56,74,${b.alpha+0.08})`);
          grad.addColorStop(0.7, `rgba(130,40,55,${b.alpha*0.4})`);
          grad.addColorStop(1, `rgba(130,40,55,0)`);
        } else {
          grad.addColorStop(0, `rgba(139,139,214,${b.alpha+0.07})`);
          grad.addColorStop(0.7, `rgba(100,100,170,${b.alpha*0.4})`);
          grad.addColorStop(1, `rgba(100,100,170,0)`);
        }
      }
      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      if(isRed){
        ctx.strokeStyle = b.hue==='gold' ? `rgba(95,111,196,${b.alpha+0.12})` : `rgba(139,154,224,${b.alpha+0.12})`;
      } else {
        ctx.strokeStyle = b.hue==='gold' ? `rgba(168,56,74,${b.alpha+0.12})` : `rgba(139,139,214,${b.alpha+0.12})`;
      }
      ctx.lineWidth = 1;
      ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
      ctx.stroke();
    });

    // particles
    particles.forEach(p=>{
      p.y -= p.vy; p.x += p.vx;
      if(p.y < -5){ p.y = H+5; p.x = rand(0,1)*W; }
      ctx.beginPath();
      ctx.fillStyle = `rgba(244,244,242,${p.alpha})`;
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fill();
    });

    // brains
    brains.forEach(b=>{
      b.x += b.vx; b.y += b.vy; b.rot += b.rotSpeed;
      if(b.x < -100) b.x = W+100;
      if(b.x > W+100) b.x = -100;
      if(b.y < -100) b.y = H+100;
      if(b.y > H+100) b.y = -100;
      drawBrainGlyph(b);
    });

    if(!reduceMotion) requestAnimationFrame(frame);
  }
  frame();
  if(reduceMotion){
    // draw a single static frame, no loop
  }
})();

/* ============================================================
   PUBLIC UNIVERSITIES OF BANGLADESH - DATA + RENDER
   ============================================================ */
const UNI_DATA = [
  {
    id: 'iba',
    name: 'Institute of Business Administration, University of Dhaka (IBA-DU)',
    short: 'IBA',
    location: 'Dhaka (DU campus)',
    tier: 'flagship',
    category: 'business',
    established: '1966',
    blurb: 'Widely regarded as the best business school in Bangladesh. Founded with Ford Foundation and Indiana University support, IBA produces the country\'s most sought-after BBA and MBA graduates.',
    faculties: [
      {
        name: 'Undergraduate Program',
        departments: ['Bachelor of Business Administration (BBA) - 4-year, majors/minors in Accounting, Finance, Human Resource Management, Information Systems, Marketing, and Operations Management']
      },
      {
        name: 'Graduate Programs',
        departments: ['Master of Business Administration (MBA), full-time and part-time', 'Executive MBA (EMBA)', 'MPhil and PhD in Business Administration', 'Postgraduate Diploma in Garment Business (PGD-GB)', 'Advanced Certificate in Business Administration (ACBA)']
      }
    ],
    careers: {
      local: ['Management trainee and leadership programs at top FMCG and conglomerates (Unilever, BAT Bangladesh, Square, ACI)', 'Investment banking, corporate finance, and asset management at local and multinational banks', 'Strategy and consulting roles at firms operating in Bangladesh', 'Brand management and marketing at telecom and consumer goods companies', 'Entrepreneurship and startup founding, IBA has a strong record of producing founders', 'Senior roles in development finance institutions and the central bank'],
      abroad: ['Admission into top global MBA programs (Harvard, Wharton, INSEAD, LBS) after a few years of work experience', 'Roles at global consulting firms (McKinsey, BCG, Bain) and investment banks for graduates who study abroad', 'Multinational corporate roles in Singapore, the Middle East, and Western markets', 'Development sector roles at the World Bank, ADB, and UN agencies, often after a master\'s in public policy or development economics']
    }
  },
  {
    id: 'buet',
    name: 'Bangladesh University of Engineering and Technology (BUET)',
    short: 'BUET',
    location: 'Dhaka (Palashi)',
    tier: 'flagship',
    category: 'engineering',
    established: '1962 (as EPUET), renamed 1962',
    blurb: 'The most prestigious engineering and architecture university in Bangladesh. Admission is the most competitive in the country, with around 1,300 seats across 13 undergraduate departments under 6 faculties.',
    faculties: [
      {
        name: 'Faculty of Civil Engineering',
        departments: ['Civil Engineering', 'Water Resources Engineering', 'Building Engineering and Construction Management']
      },
      {
        name: 'Faculty of Electrical and Electronic Engineering',
        departments: ['Electrical and Electronic Engineering (EEE)', 'Computer Science and Engineering (CSE)', 'Biomedical Engineering (BME)']
      },
      {
        name: 'Faculty of Mechanical Engineering',
        departments: ['Mechanical Engineering (ME)', 'Industrial and Production Engineering (IPE)', 'Naval Architecture and Marine Engineering (NAME)']
      },
      {
        name: 'Faculty of Chemical and Materials Engineering',
        departments: ['Chemical Engineering', 'Materials and Metallurgical Engineering (MME)', 'Leather Engineering', 'Petroleum and Mining Engineering']
      },
      {
        name: 'Faculty of Architecture and Planning',
        departments: ['Architecture', 'Urban and Regional Planning (URP)']
      },
      {
        name: 'Faculty of Science (postgraduate research)',
        departments: ['Physics', 'Chemistry', 'Mathematics', 'Humanities (Economics, language)']
      }
    ],
    careers: {
      local: ['Engineering roles in WASA, REB, PDB, Roads and Highways Department, and other government bodies via BCS (Engineering cadres)', 'Telecom and tech companies (Grameenphone, Robi, local software firms) for EEE and CSE graduates', 'Construction and real estate firms for Civil and Building Engineering graduates', 'Power and energy sector (Power Grid Company, private power plants)', 'Consulting engineering firms and infrastructure projects (Padma Bridge, metro rail)', 'University faculty positions at BUET, public, and private universities'],
      abroad: ['MS/PhD programs in the US, Canada, Germany, South Korea, and Australia - BUET has one of the strongest track records of any Bangladeshi university for graduate admission with funding', 'Roles at global tech companies (Google, Microsoft, Amazon) for CSE and EEE graduates, often after a master\'s abroad', 'Oil, gas, and shipping industry roles in the Middle East and Southeast Asia for Petroleum, Mining, and Naval Architecture graduates', 'International engineering consultancies and multinational construction firms', 'A large share of BUET graduates (commonly cited around 50-60%) pursue higher studies abroad, with many settling internationally']
    }
  },
  {
    id: 'ckruet',
    name: 'CUET, KUET and RUET (the CKRUET Universities)',
    short: 'CKRUET',
    location: 'Chattogram, Khulna, Rajshahi',
    tier: 'flagship',
    category: 'engineering',
    established: 'CUET 1968 (university status 2003), KUET 1967 (university status 2003), RUET 1964 (university status 2003)',
    blurb: 'Chittagong University of Engineering and Technology (CUET), Khulna University of Engineering and Technology (KUET), and Rajshahi University of Engineering and Technology (RUET) are the three regional engineering universities ranked just below BUET. They hold a single combined admission test (CKRUET) every year with one merit list and one preference form across all three campuses.',
    faculties: [
      {
        name: 'CUET - Faculty of Civil and Environmental Engineering',
        departments: ['Civil Engineering', 'Water Resources Engineering', 'Urban and Regional Planning (URP)']
      },
      {
        name: 'CUET - Faculty of Electrical and Computer Engineering',
        departments: ['Electrical and Electronic Engineering (EEE)', 'Computer Science and Engineering (CSE)', 'Electronics and Telecommunication Engineering (ETE)']
      },
      {
        name: 'CUET - Faculty of Mechanical Engineering',
        departments: ['Mechanical Engineering (ME)', 'Industrial and Production Engineering (IPE)', 'Mechatronics and Industrial Engineering']
      },
      {
        name: 'CUET - Faculty of Architecture and Planning',
        departments: ['Architecture']
      },
      {
        name: 'CUET - Faculty of Materials Science',
        departments: ['Materials Science and Engineering']
      },
      {
        name: 'KUET - Departments',
        departments: ['Civil Engineering', 'Electrical and Electronic Engineering (EEE)', 'Computer Science and Engineering (CSE)', 'Mechanical Engineering (ME)', 'Industrial Engineering and Management (IEM)', 'Electronics and Communication Engineering (ECE)', 'Architecture', 'Urban and Regional Planning (URP)', 'Building Engineering and Construction Management (BECM)', 'Leather Engineering', 'Biomedical Engineering (BME)', 'Materials Science and Engineering']
      },
      {
        name: 'RUET - Departments',
        departments: ['Civil Engineering', 'Electrical and Electronic Engineering (EEE)', 'Computer Science and Engineering (CSE)', 'Mechanical Engineering (ME)', 'Industrial and Production Engineering (IPE)', 'Electronics and Telecommunication Engineering (ETE)', 'Architecture', 'Urban and Regional Planning (URP)', 'Glass and Ceramic Engineering', 'Mechatronics Engineering', 'Chemical Engineering', 'Materials Science and Engineering']
      }
    ],
    careers: {
      local: ['Engineering roles in government bodies (PDB, REB, WASA, Roads and Highways, LGED) via BCS Engineering cadres', 'Telecom and software companies for EEE, CSE, and ETE graduates', 'Construction, real estate, and infrastructure firms for Civil, Architecture, and BECM graduates', 'Industrial and manufacturing sector roles in the Chattogram, Khulna, and Rajshahi regional economies (RMG backward linkage industries, ship building, leather)', 'Faculty positions at CUET, KUET, RUET, and other public/private engineering universities'],
      abroad: ['MS/PhD admission in the US, Canada, Europe, and South Korea, a well-established pipeline for CSE and EEE graduates', 'Software engineering and tech roles abroad after graduate study', 'Maritime, shipbuilding, and offshore engineering roles in Singapore and the Gulf, especially for KUET graduates given Khulna\'s shipbuilding industry links', 'Construction and infrastructure consultancy roles across South and Southeast Asia']
    }
  },
  {
    id: 'medical',
    name: 'Government Medical Colleges of Bangladesh',
    short: 'Medical',
    location: 'All divisions',
    tier: 'flagship',
    category: 'medical',
    established: 'Earliest: Dhaka Medical College, 1946',
    blurb: 'Bangladesh has 37 government medical colleges offering the 5-year MBBS degree, regulated by the Bangladesh Medical and Dental Council (BM&DC). Admission is through a single nationwide MBBS admission test. The top names include Dhaka Medical College (DMC), Sir Salimullah Medical College, Chittagong Medical College, Rajshahi Medical College, Sylhet MAG Osmani Medical College, Mymensingh Medical College, and Shaheed Suhrawardy Medical College. Bangabandhu Sheikh Mujib Medical University (BSMMU) is the country\'s only dedicated medical university, offering postgraduate degrees (MD, MS, FCPS, MPhil, PhD) only.',
    faculties: [
      {
        name: 'Core Degree Programs',
        departments: ['MBBS (Bachelor of Medicine and Bachelor of Surgery) - 5 years plus 1-year internship', 'BDS (Bachelor of Dental Surgery) - 4 years plus 1-year internship', 'B.Sc. in Nursing and related allied health programs at select colleges']
      },
      {
        name: 'Major Government Medical Colleges',
        departments: ['Dhaka Medical College (DMC), Dhaka - the largest, established 1946', 'Sir Salimullah Medical College, Dhaka', 'Shaheed Suhrawardy Medical College, Dhaka', 'Mymensingh Medical College', 'Chittagong Medical College', 'Rajshahi Medical College', 'Sylhet M.A.G. Osmani Medical College', 'Sher-e-Bangla Medical College, Barishal', 'Rangpur Medical College', 'Cumilla Medical College', 'Khulna Medical College', 'Faridpur Medical College', 'Shaheed Ziaur Rahman Medical College, Bogura', 'Plus 23+ additional government medical colleges across all districts']
      },
      {
        name: 'Postgraduate-only University',
        departments: ['Bangabandhu Sheikh Mujib Medical University (BSMMU) - MD, MS, MPhil, PhD, FCPS, Diploma courses, the apex postgraduate medical institution']
      }
    ],
    careers: {
      local: ['Bangladesh Civil Service (Health) cadre, posting as medical officers in government hospitals and upazila health complexes', 'Specialization via FCPS, MD, or MS at BSMMU and other institutions, leading to consultant and specialist roles', 'Private practice and chamber consultancy after specialization', 'Faculty positions at medical colleges', 'Roles in public health programs run by the Directorate General of Health Services (DGHS) and NGOs (icddr,b, BRAC Health)'],
      abroad: ['USMLE pathway to residency and practice in the United States', 'PLAB pathway to practice in the United Kingdom', 'Fellowship and specialist training in Australia, Canada, and the Gulf countries', 'Research and academic medicine positions abroad after MPhil/PhD or further specialization', 'WHO and international health organization roles for public health-focused graduates']
    }
  },
  {
    id: 'du',
    name: 'University of Dhaka (DU)',
    short: 'DU',
    location: 'Dhaka',
    tier: 'flagship',
    category: 'general',
    established: '1921',
    blurb: 'The oldest and largest public university in Bangladesh, often called the "Oxford of the East." Home to 13 faculties, 83 departments, and 12 institutes, including the prestigious IBA.',
    faculties: [
      {
        name: 'Faculty of Arts',
        departments: ['Bangla', 'English', 'Arabic', 'Islamic Studies', 'Persian Language and Literature', 'Urdu', 'Sanskrit and Pali', 'History', 'Islamic History and Culture', 'Philosophy', 'Linguistics', 'Theatre and Performance Studies', 'Music', 'Information Science and Library Management', 'World Religions and Culture']
      },
      {
        name: 'Faculty of Social Sciences',
        departments: ['Economics', 'Political Science', 'International Relations', 'Sociology', 'Public Administration', 'Mass Communication and Journalism', 'Anthropology', 'Population Sciences', 'Peace and Conflict Studies', 'Women and Gender Studies', 'Development Studies', 'Criminology', 'Television, Film and Photography', 'Communication Disorders', 'Printing and Publication Studies']
      },
      {
        name: 'Faculty of Law',
        departments: ['Law']
      },
      {
        name: 'Faculty of Science',
        departments: ['Mathematics', 'Physics', 'Chemistry', 'Statistics', 'Soil, Water and Environment', 'Geology', 'Applied Mathematics', 'Theoretical Physics']
      },
      {
        name: 'Faculty of Biological Sciences',
        departments: ['Botany', 'Zoology', 'Psychology', 'Genetic Engineering and Biotechnology', 'Microbiology', 'Biochemistry and Molecular Biology', 'Clinical Psychology', 'Fisheries', 'Soil, Water and Environment']
      },
      {
        name: 'Faculty of Business Studies',
        departments: ['Accounting and Information Systems', 'Management', 'Marketing', 'Finance', 'Banking and Insurance', 'Management Information Systems', 'International Business', 'Tourism and Hospitality Management']
      },
      {
        name: 'Faculty of Pharmacy',
        departments: ['Pharmacy']
      },
      {
        name: 'Faculty of Earth and Environmental Sciences',
        departments: ['Geography and Environment', 'Geology', 'Disaster Science and Climate Resilience', 'Oceanography']
      },
      {
        name: 'Faculty of Engineering and Technology',
        departments: ['Computer Science and Engineering', 'Applied Chemistry and Chemical Engineering', 'Robotics and Mechatronics Engineering', 'Electrical and Electronic Engineering', 'Nuclear Engineering', 'Biomedical Engineering']
      },
      {
        name: 'Faculty of Education',
        departments: ['Institute of Education and Research (IER)']
      },
      {
        name: 'Faculty of Fine Arts',
        departments: ['Drawing and Painting', 'Sculpture', 'Graphic Design', 'Printmaking', 'Ceramics', 'Oriental Art', 'Crafts', 'History of Art']
      },
      {
        name: 'Faculty of Medicine',
        departments: ['Dhaka Medical College and affiliated medical/dental colleges under DU']
      },
      {
        name: 'Key Institutes',
        departments: ['Institute of Business Administration (IBA)', 'Institute of Education and Research (IER)', 'Institute of Health Economics', 'Institute of Statistical Research and Training (ISRT)', 'Institute of Nutrition and Food Science', 'Institute of Social Welfare and Research', 'Institute of Energy', 'Institute of Disaster Management and Vulnerability Studies', 'Institute of Information Technology (IIT)', 'Institute of Modern Languages', 'South Asian Institute of Policy and Governance', 'Bangabandhu Institute for Development Studies']
      }
    ],
    careers: {
      local: ['BCS (Administration, Foreign Affairs, Police, Customs, and all other cadres - DU graduates dominate BCS cadre intake every year)', 'Bangladesh Bank and commercial/state-owned banks (especially from Economics, Accounting, Finance, IBA)', 'Judiciary and legal practice (from Faculty of Law, after Bar Council enrollment)', 'University and college teaching, research institutes (BIDS, BRAC Institutes)', 'Journalism and media houses (Prothom Alo, The Daily Star, television channels)', 'NGOs and development sector (BRAC, World Bank Dhaka office, UN agencies)', 'Corporate roles in telecom, FMCG, pharma (Grameenphone, Unilever, Square)', 'Civil service and policy think tanks (PRI, CPD)'],
      abroad: ['Graduate school (MS/MPhil/PhD) in the US, UK, Australia, and Europe, especially from Economics, Physics, CSE, and IBA, often with Fulbright, Chevening, or Commonwealth scholarships', 'UN and international organization roles for IR and Development Studies graduates', 'IT and software roles abroad for CSE and Applied Mathematics graduates', 'International law and human rights work for Law graduates, including ICC and ICJ internships', 'Global consulting and finance (McKinsey, big banks) for top IBA graduates']
    }
  },
  {
    id: 'issb',
    name: 'ISSB and the Bangladesh Armed Forces (Army, Navy, Air Force)',
    short: 'ISSB / Defense',
    location: 'Nationwide (ISSB centres, cadet colleges, BMA, BNA, BAFA)',
    tier: 'flagship',
    category: 'defense',
    established: 'ISSB formed 1976',
    blurb: 'Not a university, but the gateway into a commissioned officer career in the Bangladesh Army, Navy, and Air Force. The Inter Services Selection Board (ISSB) is a 4-day assessment of intelligence, leadership, and personality that every officer candidate must pass after initial written/medical screening.',
    faculties: [
      {
        name: 'Entry Pathways',
        departments: ['Bangladesh Military Academy (BMA) - Long Course, for direct entry officer cadets after HSC', 'BMA Special Course - for graduates with a bachelor\'s degree', 'Direct Entry Officer (DEO) schemes in technical, medical, and administrative branches', 'Bangladesh Naval Academy (BNA) for Navy officer cadets, including Nautical Science and Marine Engineering streams', 'Bangladesh Air Force Academy (BAFA) for pilot (GD(P)), engineering, and ground branch officers', 'Officer entry through Bangladesh University of Professionals (BUP) for those already holding relevant degrees']
      },
      {
        name: 'Selection Process',
        departments: ['Initial written and physical screening by the respective service headquarters', 'ISSB 4-day assessment: intelligence tests, Picture Perception and Discussion Test (PPDT), group tasks, individual obstacles, psychological tests, and final interview', 'Medical board examination for ISSB-recommended ("Green Card") candidates', 'Final merit list and academy enrollment']
      }
    ],
    careers: {
      local: ['Commissioned officer career in the Army, Navy, or Air Force, with a structured promotion path from Lieutenant/equivalent upward', 'Specialist branches: Engineers, Signals, Artillery, Armoured Corps, Army Medical Corps, Education Corps, and more', 'Postings with UN peacekeeping missions abroad as part of Bangladesh\'s armed forces contingents', 'Transition into Bangladesh University of Professionals (BUP) for academic/teaching roles after service', 'Post-retirement career opportunities in government, security consultancy, and corporate management'],
      abroad: ['United Nations peacekeeping deployments worldwide as part of Bangladesh\'s major contribution to UN missions', 'Joint training and exchange programs with foreign military academies (UK Sandhurst-linked training, US, China, Turkey)', 'Defense attache and diplomatic postings at Bangladesh missions abroad for senior officers', 'International security and defense consultancy after retirement']
    }
  }
];

const UNI_LIGHT = [
  { name: 'Rajshahi University (RU)', location: 'Rajshahi', category: 'general', note: 'Second-oldest public university (1953), strong in Social Sciences, Science, and Bangla.' },
  { name: 'University of Chittagong (CU)', location: 'Chattogram', category: 'general', note: 'Major general university (1966) with a large, scenic hill-tract campus.' },
  { name: 'Jahangirnagar University (JU)', location: 'Savar, Dhaka', category: 'general', note: 'Known for residential campus life, strong in Computer Science, Drama, and Social Sciences.' },
  { name: 'Shahjalal University of Science and Technology (SUST)', location: 'Sylhet', category: 'science_tech', note: 'Leading science and technology university, strong CSE and Genetic Engineering programs.' },
  { name: 'Khulna University (KU)', location: 'Khulna', category: 'general', note: 'Discipline-based (not departmental) structure; strong in Architecture and Disaster Management.' },
  { name: 'Bangladesh Agricultural University (BAU)', location: 'Mymensingh', category: 'agriculture', note: 'Oldest and largest agricultural university (1961), strong Veterinary and Agriculture faculties.' },
  { name: 'Bangladesh University of Professionals (BUP)', location: 'Dhaka (Mirpur Cantonment)', category: 'defense', note: 'Run under the Armed Forces Division; offers civilian and defense-linked degrees, including affiliated medical colleges.' },
  { name: 'Bangladesh University of Textiles (BUTEX)', location: 'Dhaka', category: 'engineering', note: 'Premier textile engineering university, closely linked to the country\'s RMG export industry.' },
  { name: 'Islamic University, Bangladesh', location: 'Kushtia', category: 'general', note: 'General public university with Science, Arts, and Islamic Studies faculties.' },
  { name: 'Jagannath University (JnU)', location: 'Dhaka (old city)', category: 'general', note: 'Converted from Jagannath College in 2005; rapidly growing science and business faculties.' },
  { name: 'Comilla University', location: 'Cumilla', category: 'general', note: 'General university serving the greater Comilla region.' },
  { name: 'Jessore University of Science and Technology (JUST)', location: 'Jashore', category: 'science_tech', note: 'Science and technology focused, southwestern Bangladesh.' },
  { name: 'Noakhali Science and Technology University (NSTU)', location: 'Noakhali', category: 'science_tech', note: 'Science and technology university for the southeastern coastal region.' },
  { name: 'Patuakhali Science and Technology University (PSTU)', location: 'Patuakhali', category: 'agriculture', note: 'Agriculture, fisheries, and science and technology faculties for the coastal south.' },
  { name: 'Begum Rokeya University, Rangpur (BRUR)', location: 'Rangpur', category: 'general', note: 'General university serving the Rangpur division, named after the pioneering feminist writer.' },
  { name: 'Pabna University of Science and Technology (PUST)', location: 'Pabna', category: 'science_tech', note: 'Science and technology university in northern Bangladesh.' },
  { name: 'Mawlana Bhashani Science and Technology University (MBSTU)', location: 'Tangail', category: 'science_tech', note: 'Science and technology university named after Maulana Bhashani.' },
  { name: 'Hajee Mohammad Danesh Science and Technology University (HSTU)', location: 'Dinajpur', category: 'science_tech', note: 'Agriculture-linked science and technology university in the northwest.' },
  { name: 'Bangabandhu Sheikh Mujibur Rahman Science and Technology University', location: 'Gopalganj', category: 'science_tech', note: 'Named after the Father of the Nation, general science and technology focus.' },
  { name: 'Khulna University of Engineering and Technology (KUET)', location: 'Khulna', category: 'engineering', note: 'One of the four major engineering universities alongside BUET, RUET, and CUET.' },
  { name: 'Rajshahi University of Engineering and Technology (RUET)', location: 'Rajshahi', category: 'engineering', note: 'Leading engineering university for the northern region.' },
  { name: 'Chittagong University of Engineering and Technology (CUET)', location: 'Chattogram', category: 'engineering', note: 'Leading engineering university for the southeastern region.' },
  { name: 'Dhaka University of Engineering and Technology (DUET)', location: 'Gazipur', category: 'engineering', note: 'Caters mainly to diploma-holding engineers pursuing bachelor degrees.' },
  { name: 'Bangabandhu Sheikh Mujibur Rahman Agricultural University (BSMRAU)', location: 'Gazipur', category: 'agriculture', note: 'Postgraduate-focused agricultural university.' },
  { name: 'Sher-e-Bangla Agricultural University (SAU)', location: 'Dhaka', category: 'agriculture', note: 'Urban agricultural university in the capital.' },
  { name: 'Sylhet Agricultural University', location: 'Sylhet', category: 'agriculture', note: 'Agricultural university for the northeastern haor region.' },
  { name: 'Chattogram Veterinary and Animal Sciences University (CVASU)', location: 'Chattogram', category: 'agriculture', note: 'Specialized veterinary, animal, and fisheries science university.' },
  { name: 'Bangabandhu Sheikh Mujibur Rahman Maritime University (BSMRMU)', location: 'Dhaka', category: 'maritime', note: 'Maritime studies, nautical science, and marine engineering.' },
  { name: 'Bangabandhu Sheikh Mujib Medical University (BSMMU)', location: 'Dhaka', category: 'medical', note: 'Country\'s only fully postgraduate medical university (MD, MS, FCPS, PhD only).' },
  { name: 'Chittagong Medical University', location: 'Chattogram', category: 'medical', note: 'Oversees government and private medical/dental colleges in Chattogram division.' },
  { name: 'Rajshahi Medical University', location: 'Rajshahi', category: 'medical', note: 'Oversees medical/dental colleges in Rajshahi division.' },
  { name: 'Sylhet Medical University', location: 'Sylhet', category: 'medical', note: 'Oversees medical/dental colleges in Sylhet division.' },
  { name: 'National University, Bangladesh', location: 'Gazipur', category: 'affiliating', note: 'World\'s largest affiliating university by enrollment; oversees most government and private degree colleges nationwide.' },
  { name: 'Bangladesh Open University', location: 'Gazipur', category: 'distance', note: 'Distance and open learning university offering SSC-to-postgraduate level programs nationwide.' },
  { name: 'Islamic Arabic University', location: 'Dhaka', category: 'islamic', note: 'Specialized university for Arabic and Islamic studies, affiliated madrasah education.' },
  { name: 'Barisal University', location: 'Barishal', category: 'general', note: 'General public university serving the Barishal division.' },
  { name: 'Pirojpur Science and Technology University', location: 'Pirojpur', category: 'science_tech', note: 'Newer science and technology university in the southern region.' },
  { name: 'Joypurhat Science and Technology University', location: 'Joypurhat', category: 'science_tech', note: 'Newer science and technology university in the northern region.' },
  { name: 'Naogaon Science and Technology University', location: 'Naogaon', category: 'science_tech', note: 'Newer science and technology university in the northern region.' },
  { name: 'Habiganj Science and Technology University', location: 'Habiganj', category: 'science_tech', note: 'Newer science and technology university in the northeastern region.' },
  { name: 'Sunamganj Science and Technology University', location: 'Sunamganj', category: 'science_tech', note: 'Newer science and technology university in the haor region.' },
  { name: 'Chandpur Science and Technology University', location: 'Chandpur', category: 'science_tech', note: 'Newer science and technology university in the southeastern region.' },
  { name: 'Brahmanbaria Science and Technology University', location: 'Brahmanbaria', category: 'science_tech', note: 'Newer science and technology university in the southeastern region.' }
];

const UNI_CATEGORY_LABELS = {
  flagship: 'Flagship - Deep Dive',
  general: 'General',
  engineering: 'Engineering',
  science_tech: 'Science and Technology',
  agriculture: 'Agriculture',
  medical: 'Medical',
  defense: 'Defense',
  maritime: 'Maritime',
  business: 'Business',
  affiliating: 'Affiliating',
  distance: 'Open / Distance',
  islamic: 'Islamic Studies'
};

function uniFilterTags(){
  const tags = ['all', 'flagship', 'general', 'engineering', 'science_tech', 'agriculture', 'medical', 'defense', 'business'];
  const container = document.getElementById('uniFilters');
  if(!container) return;
  container.innerHTML = tags.map(t=>{
    const label = t === 'all' ? 'All' : (UNI_CATEGORY_LABELS[t] || t);
    return `<button type="button" class="uni-filter-btn${t==='all' ? ' active' : ''}" data-cat="${t}" onclick="setUniFilter('${t}')">${label}</button>`;
  }).join('');
}

let UNI_ACTIVE_FILTER = 'all';
function setUniFilter(cat){
  UNI_ACTIVE_FILTER = cat;
  document.querySelectorAll('.uni-filter-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.cat === cat);
  });
  renderUniversities();
}

function uniMatchesSearch(haystack, query){
  if(!query) return true;
  return haystack.toLowerCase().includes(query.toLowerCase());
}

function renderUniversities(){
  const query = (document.getElementById('uniSearchInput')||{}).value || '';
  const resultsEl = document.getElementById('uniResults');
  if(!resultsEl) return;

  let deepHtml = '';
  let deepIndex = 0;
  UNI_DATA.forEach(u=>{
    if(UNI_ACTIVE_FILTER !== 'all' && UNI_ACTIVE_FILTER !== 'flagship' && u.category !== UNI_ACTIVE_FILTER) return;
    const allDeptText = u.faculties.flatMap(f=>f.departments).join(' ') + ' ' + u.name + ' ' + u.blurb + ' ' + (u.careers.local.join(' ')) + ' ' + (u.careers.abroad.join(' '));
    if(!uniMatchesSearch(allDeptText, query)) return;
    deepIndex++;
    deepHtml += renderUniCard(u, deepIndex);
  });

  let lightHtml = '';
  const lightMatches = UNI_LIGHT.filter(u=>{
    if(UNI_ACTIVE_FILTER === 'flagship') return false;
    if(UNI_ACTIVE_FILTER !== 'all' && u.category !== UNI_ACTIVE_FILTER) return false;
    const text = u.name + ' ' + u.location + ' ' + u.note;
    return uniMatchesSearch(text, query);
  });
  if(lightMatches.length){
    lightHtml = `<div class="uni-light-list">` + lightMatches.map((u,i)=>`
      <div class="uni-light-row">
        <span class="uni-light-index">${String(i+1).padStart(2,'0')}</span>
        <div class="uni-light-main">
          <h4>${u.name}</h4>
          <span class="uni-light-loc">${u.location}</span>
          <p>${u.note}</p>
        </div>
        <span class="uni-light-cat">${UNI_CATEGORY_LABELS[u.category]||u.category}</span>
      </div>
    `).join('') + `</div>`;
  }

  if(!deepHtml && !lightHtml){
    resultsEl.innerHTML = `<p class="uni-empty">No universities, departments, or career fields matched your search. Try a different term.</p>`;
    return;
  }

  resultsEl.innerHTML =
    (deepHtml ? `<div class="uni-deep-list">${deepHtml}</div>` : '') +
    (lightHtml ? `<h3 class="uni-light-heading">Other Public Universities</h3><p class="uni-light-sub">${lightMatches.length} institutions</p>${lightHtml}` : '');
}

function renderUniCard(u, index){
  const facultyHtml = u.faculties.map(f=>`
    <div class="uni-faculty">
      <h5>${f.name}</h5>
      <p class="uni-dept-list">${f.departments.join(' &middot; ')}</p>
    </div>
  `).join('');

  return `
    <div class="uni-card" id="uni-${u.id}" data-index="${String(index).padStart(2,'0')}">
      <div class="uni-card-head">
        <div>
          <h3>${u.name}</h3>
          <span class="uni-meta">${u.location} &middot; Est. ${u.established}</span>
        </div>
        <button type="button" class="uni-toggle-btn" onclick="toggleUniCard('${u.id}')" id="uniToggle-${u.id}">View details &rarr;</button>
      </div>
      <p class="uni-blurb">${u.blurb}</p>
      <div class="uni-card-body" id="uniBody-${u.id}" hidden>
        <div class="uni-faculties">
          ${facultyHtml}
        </div>
        <div class="uni-careers">
          <div class="uni-career-col">
            <h5>Career Opportunities in Bangladesh</h5>
            <ul>${u.careers.local.map(c=>`<li>${c}</li>`).join('')}</ul>
          </div>
          <div class="uni-career-col">
            <h5>Career Opportunities Abroad</h5>
            <ul>${u.careers.abroad.map(c=>`<li>${c}</li>`).join('')}</ul>
          </div>
        </div>
      </div>
    </div>
  `;
}

function toggleUniCard(id){
  const body = document.getElementById('uniBody-'+id);
  const btn = document.getElementById('uniToggle-'+id);
  if(!body) return;
  const isHidden = body.hidden;
  body.hidden = !isHidden;
  if(btn) btn.innerHTML = isHidden ? 'Hide details &larr;' : 'View details &rarr;';
}

document.addEventListener('DOMContentLoaded', ()=>{
  if(document.getElementById('uniFilters')){
    uniFilterTags();
    renderUniversities();
  }
});

/* ============================================================
   LUSION-STYLE MOTION LAYER
   - Kinetic hero title (letters split into spans, staggered entrance)
   - Hero mouse parallax (title/logo/tagline drift on cursor move)
   - Magnetic pull on buttons/links/cards (element leans toward cursor)
   - Upgraded scroll reveals (.reveal / .reveal-scale / .reveal-mask / .reveal-stagger)
   Runs alongside the existing DNA cursor trail and ambient canvas -
   none of the calendar/routine/university/admin logic above is touched.
   ============================================================ */
(function(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const noHover = window.matchMedia('(hover: none)').matches;

  /* ---- Kinetic hero title: split "MEMEBRANE" into per-letter spans ---- */
  function splitHeroTitle(){
    const el = document.getElementById('heroTitle');
    if(!el || el.dataset.split) return;
    const text = el.dataset.text || el.textContent;
    el.textContent = '';
    text.split('').forEach((ch, i)=>{
      const span = document.createElement('span');
      span.className = 'kchar';
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      span.style.animationDelay = (i * 0.045) + 's';
      el.appendChild(span);
    });
    el.dataset.split = 'true';
  }
  splitHeroTitle();

  /* ---- Hero mouse parallax ---- */
  if(!reduceMotion && !noHover){
    const stage = document.getElementById('heroStage');
    if(stage){
      let px = 0, py = 0, tx = 0, ty = 0;
      window.addEventListener('mousemove', e=>{
        const r = stage.getBoundingClientRect();
        if(e.clientY > r.bottom + 200) return; // only react near/above hero
        const cx = r.left + r.width/2, cy = r.top + r.height/2;
        tx = ((e.clientX - cx) / r.width) * 18;
        ty = ((e.clientY - cy) / r.height) * 18;
      }, { passive:true });
      (function loop(){
        px += (tx - px) * 0.08;
        py += (ty - py) * 0.08;
        stage.style.setProperty('--px', px.toFixed(2) + 'px');
        stage.style.setProperty('--py', py.toFixed(2) + 'px');
        requestAnimationFrame(loop);
      })();
    }
  }

  /* ---- Magnetic pull on interactive elements ---- */
  if(!reduceMotion && !noHover){
    const magSelector = '.btn, .nav-links a, .social-icon, .pill, .theme-switch, .uni-filter-btn, .calendar-nav button';
    const magState = new Map(); // el -> {tx,ty,cx,cy,raf}

    function attachMagnet(el){
      if(el.dataset.magBound) return;
      el.dataset.magBound = 'true';
      el.style.transition = 'transform 0.25s cubic-bezier(.2,.8,.2,1)';
      let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;

      function tick(){
        cx += (tx - cx) * 0.2;
        cy += (ty - cy) * 0.2;
        el.style.transform = `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px)`;
        if(Math.abs(tx-cx) > 0.1 || Math.abs(ty-cy) > 0.1){
          raf = requestAnimationFrame(tick);
        } else {
          raf = null;
        }
      }
      function start(){ if(!raf) raf = requestAnimationFrame(tick); }

      el.addEventListener('mousemove', e=>{
        const r = el.getBoundingClientRect();
        const relX = e.clientX - (r.left + r.width/2);
        const relY = e.clientY - (r.top + r.height/2);
        tx = relX * 0.28;
        ty = relY * 0.28;
        start();
        document.getElementById('cursor-dot')?.classList.add('magnet-active');
      });
      el.addEventListener('mouseleave', ()=>{
        tx = 0; ty = 0;
        start();
        document.getElementById('cursor-dot')?.classList.remove('magnet-active');
      });
    }

    // Attach now, and re-scan after page switches / re-renders since content is dynamic.
    function scanMagnets(){
      document.querySelectorAll(magSelector).forEach(attachMagnet);
    }
    scanMagnets();
    const magObserver = new MutationObserver(()=>scanMagnets());
    magObserver.observe(document.body, { childList:true, subtree:true });
  }

  /* ---- Upgraded scroll reveals for the new .reveal* classes ---- */
  function setupReveals(){
    const targets = document.querySelectorAll('.reveal, .reveal-scale, .reveal-blur, .reveal-mask, .reveal-stagger');
    if(!targets.length) return;
    const obs = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold:0.15, rootMargin:'0px 0px -40px 0px' });
    targets.forEach(el=>obs.observe(el));
  }
  setupReveals();
  // Re-scan on page nav (goToPage swaps [hidden] pages in/out) and after dynamic renders.
  const revealRescan = new MutationObserver(()=>setupReveals());
  revealRescan.observe(document.body, { attributes:true, attributeFilter:['hidden'], subtree:true });
})();
