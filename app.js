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
    card.className = 'person-card glass fade-up visible';
    const photoSrc = p.photo && p.photo.trim() ? p.photo : placeholderAvatar(p.name);
    card.innerHTML = `
      <div class="glass-shine"></div>
      <img class="person-photo" src="${escapeHtml(photoSrc)}" alt="${escapeHtml(p.name)}" onerror="this.src='${placeholderAvatar(p.name)}'">
      <div class="person-name">${escapeHtml(p.name)}</div>
      <div class="person-role">${escapeHtml(p.role)}</div>
      <div class="person-bio">${escapeHtml(p.bio)}</div>
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
    return `<div class="upcoming-item flat-panel">
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

function downloadRoutinePDF(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'pt', format:'a4', orientation:'landscape' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // ---- Dark palette ----
  const VOID       = [4,  20,  13];   // page background
  const MOSS       = [10, 40,  24];   // cell alt row
  const MOSS_MID   = [14, 55,  32];   // header / day header
  const GOLD       = [212,168,  67];  // primary accent
  const GOLD_DIM   = [140,108,  38];  // subdued gold
  const GREEN      = [111,174, 126];  // membrane green
  const CREAM      = [241,234, 217];  // primary text
  const CREAM_DIM  = [160,152, 136];  // secondary text
  const LINE       = [30,  60,  40];  // grid lines
  const LINE_BRIGHT= [45,  90,  58];  // brighter grid lines

  // ---- Full dark background ----
  doc.setFillColor(...VOID);
  doc.rect(0, 0, pageW, pageH, 'F');

  // ---- Subtle radial glow top-left (drawn as layered soft rects) ----
  const glowSteps = 8;
  for(let g = glowSteps; g >= 1; g--){
    const t = g / glowSteps;
    const alpha = 0.018 * (1 - t);
    // jsPDF doesn't support radial gradients; fake with concentric ellipses
    doc.setFillColor(14, 59, 34);
    doc.setGState(doc.GState({ opacity: alpha }));
    doc.ellipse(0, 0, pageW * 0.55 * t, pageH * 0.55 * t, 'F');
  }
  doc.setGState(doc.GState({ opacity: 1 }));

  // ---- Decorative corner accent circles (top-right) ----
  const circleAlphas = [0.06, 0.04, 0.025];
  const circleR      = [110, 75, 45];
  circleAlphas.forEach((a, i) => {
    doc.setFillColor(...GREEN);
    doc.setGState(doc.GState({ opacity: a }));
    doc.circle(pageW - 10, 10, circleR[i], 'F');
  });
  doc.setGState(doc.GState({ opacity: 1 }));

  // ---- Gold top-edge accent bar ----
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, pageW, 3, 'F');

  // ---- Header area ----
  const headerH = 72;
  doc.setFillColor(...MOSS_MID);
  doc.setGState(doc.GState({ opacity: 0.6 }));
  doc.rect(0, 3, pageW, headerH, 'F');
  doc.setGState(doc.GState({ opacity: 1 }));

  // Brand logo mark - layered circles + M
  const logoX = 42, logoY = 3 + headerH / 2;
  // outer glow ring
  doc.setFillColor(...GOLD);
  doc.setGState(doc.GState({ opacity: 0.18 }));
  doc.circle(logoX, logoY, 22, 'F');
  doc.setGState(doc.GState({ opacity: 1 }));
  // gold ring border
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.8);
  doc.circle(logoX, logoY, 17, 'S');
  // inner fill
  doc.setFillColor(...MOSS_MID);
  doc.circle(logoX, logoY, 15.5, 'F');
  // "M" glyph
  doc.setFont(undefined, 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...GOLD);
  doc.text('M', logoX, logoY + 5.5, { align:'center' });

  // Title
  doc.setFont(undefined, 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...CREAM);
  doc.text(DATA.routine.title || 'Study Routine', 72, logoY - 6);

  // Subtitle line
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...GREEN);
  const subLeft = DATA.routine.name ? `${DATA.routine.name}  ·  Memebrane Study Planner` : 'Memebrane Study Planner';
  doc.text(subLeft, 72, logoY + 12);

  // Date top-right
  const dateStr = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  doc.setFontSize(8.5);
  doc.setTextColor(...CREAM_DIM);
  doc.text(dateStr, pageW - 28, logoY - 6, { align:'right' });
  doc.setTextColor(...GOLD_DIM);
  doc.text('memebraniacs.vercel.app', pageW - 28, logoY + 10, { align:'right' });

  // Gold divider under header
  doc.setDrawColor(...GOLD_DIM);
  doc.setLineWidth(0.6);
  doc.line(0, 3 + headerH, pageW, 3 + headerH);

  // ---- Table geometry ----
  const days = ROUTINE_DAYS;
  const margin = 24;
  const startX = margin;
  const startY = 3 + headerH + 16;
  const tableW = pageW - margin * 2;
  const footerReserve = 32;
  const tableH = pageH - startY - footerReserve;

  const colTimeW = 88;
  const colW = (tableW - colTimeW) / days.length;
  const headRowH = 30;
  const bodyRowCount = Math.max(DATA.routine.rows.length, 1);
  const bodyRowH = Math.max(28, (tableH - headRowH) / bodyRowCount);
  const tableContentH = headRowH + bodyRowH * bodyRowCount;

  // Table outer border (gold)
  doc.setDrawColor(...GOLD_DIM);
  doc.setLineWidth(1.2);
  doc.rect(startX, startY, tableW, tableContentH, 'S');

  // ---- Day header row ----
  doc.setFillColor(...MOSS_MID);
  doc.rect(startX, startY, tableW, headRowH, 'F');

  // TIME label
  doc.setFont(undefined, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...GOLD);
  doc.text('TIME', startX + colTimeW / 2, startY + headRowH / 2 + 3, { align:'center' });

  // vertical divider after time col
  doc.setDrawColor(...GOLD_DIM);
  doc.setLineWidth(0.8);
  doc.line(startX + colTimeW, startY, startX + colTimeW, startY + headRowH);

  days.forEach((d, i) => {
    const x = startX + colTimeW + i * colW;
    // day column dividers
    if(i > 0){
      doc.setDrawColor(...LINE_BRIGHT);
      doc.setLineWidth(0.5);
      doc.line(x, startY + 5, x, startY + headRowH - 5);
    }
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...CREAM);
    doc.text(d.label.toUpperCase(), x + colW / 2, startY + headRowH / 2 + 3.5, { align:'center' });
  });

  // ---- Body rows ----
  let y = startY + headRowH;
  DATA.routine.rows.forEach((row, ri) => {
    const isAlt = ri % 2 === 1;
    // row background
    doc.setFillColor(...(isAlt ? MOSS : VOID));
    doc.setGState(doc.GState({ opacity: isAlt ? 1 : 0.85 }));
    doc.rect(startX, y, tableW, bodyRowH, 'F');
    doc.setGState(doc.GState({ opacity: 1 }));

    // time cell subtle green tint
    doc.setFillColor(...GREEN);
    doc.setGState(doc.GState({ opacity: 0.07 }));
    doc.rect(startX, y, colTimeW, bodyRowH, 'F');
    doc.setGState(doc.GState({ opacity: 1 }));

    // row border
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.5);
    doc.rect(startX, y, tableW, bodyRowH, 'S');

    // time col divider
    doc.setDrawColor(...LINE_BRIGHT);
    doc.setLineWidth(0.7);
    doc.line(startX + colTimeW, y, startX + colTimeW, y + bodyRowH);

    // Time text
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GOLD);
    const timeLines = doc.splitTextToSize(row.time || '—', colTimeW - 12);
    doc.text(timeLines, startX + colTimeW / 2, y + bodyRowH / 2 - (timeLines.length - 1) * 5.5 + 3.5, { align:'center' });

    // Day cells
    days.forEach((d, i) => {
      const x = startX + colTimeW + i * colW;
      if(i > 0){
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.5);
        doc.line(x, y, x, y + bodyRowH);
      }
      const text = row[d.key] || '';
      doc.setFontSize(9.5);
      if(text){
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...CREAM);
        const lines = doc.splitTextToSize(text, colW - 12);
        doc.text(lines, x + colW / 2, y + bodyRowH / 2 - (lines.length - 1) * 5.5 + 3.5, { align:'center' });
      } else {
        doc.setTextColor(...LINE_BRIGHT);
        doc.text('·', x + colW / 2, y + bodyRowH / 2 + 3.5, { align:'center' });
      }
    });
    y += bodyRowH;
  });

  // ---- Footer ----
  const footerY = pageH - 10;
  // gold footer line
  doc.setDrawColor(...GOLD_DIM);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 14, pageW - margin, footerY - 14);

  doc.setFont(undefined, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text('Memebrane', margin, footerY);

  doc.setFont(undefined, 'normal');
  doc.setTextColor(...CREAM_DIM);
  doc.text('  ·  Made for the Memebraniacs. Stick this on your wall and stay on track.', margin + 50, footerY);

  doc.setTextColor(...GREEN);
  doc.text('Stay consistent. Stay chaotic. 🧠', pageW - margin, footerY, { align:'right' });

  doc.save(((DATA.routine.name||'memebrane')+'-routine').replace(/\s+/g,'_') + '.pdf');
  toast('PDF downloaded ✓');
}

/* ---------- PAGE ROUTER ---------- */
const PAGES = ['home','events','writings','photography','routine'];

function goToPage(pageId, skipHash){
  if(!PAGES.includes(pageId)) pageId = 'home';
  PAGES.forEach(p=>{
    const el = document.getElementById('page-'+p);
    if(el) el.hidden = (p !== pageId);
  });
  document.querySelectorAll('.nav-link').forEach(a=>{
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
document.querySelectorAll('.nav-link').forEach(a=>{
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
   CUSTOM CURSOR
   ============================================================ */
(function(){
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if(!dot || !ring) return;
  if(window.matchMedia('(hover: none)').matches) return; // skip on touch devices

  let mouseX = window.innerWidth/2, mouseY = window.innerHeight/2;
  let ringX = mouseX, ringY = mouseY;

  window.addEventListener('mousemove', (e)=>{
    mouseX = e.clientX; mouseY = e.clientY;
    dot.style.left = mouseX + 'px';
    dot.style.top = mouseY + 'px';
  });

  function ringFollow(){
    ringX += (mouseX - ringX) * 0.22;
    ringY += (mouseY - ringY) * 0.22;
    ring.style.left = ringX + 'px';
    ring.style.top = ringY + 'px';
    requestAnimationFrame(ringFollow);
  }
  ringFollow();

  const interactiveSelector = 'a, button, input, textarea, select, .person-card, .writing-entry, .photo-tile, .cal-cell, [onclick]';
  document.addEventListener('mouseover', (e)=>{
    if(e.target.closest(interactiveSelector)){
      document.body.classList.add('cursor-pointer');
    }
  });
  document.addEventListener('mouseout', (e)=>{
    if(e.target.closest(interactiveSelector)){
      document.body.classList.remove('cursor-pointer');
    }
  });

  document.addEventListener('mouseleave', ()=>{
    dot.style.opacity = '0'; ring.style.opacity = '0';
  });
  document.addEventListener('mouseenter', ()=>{
    dot.style.opacity = '1'; ring.style.opacity = '1';
  });

  document.addEventListener('mousedown', ()=> document.body.classList.add('cursor-down'));
  document.addEventListener('mouseup', ()=> document.body.classList.remove('cursor-down'));
})();


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

  // Bubbles (membrane organelles)
  const bubbles = Array.from({length: 22}, ()=>({
    x: rand(0,1)*W, y: rand(0,1)*H,
    r: rand(8,46),
    vy: rand(0.08,0.35),
    vx: rand(-0.08,0.08),
    hue: Math.random()>0.5 ? 'gold' : 'green',
    alpha: rand(0.05,0.18),
    wobble: rand(0,Math.PI*2),
    wobbleSpeed: rand(0.002,0.006)
  }));

  // Floating particles
  const particles = Array.from({length: 60}, ()=>({
    x: rand(0,1)*W, y: rand(0,1)*H,
    r: rand(0.6,2.2),
    vy: rand(0.05,0.25),
    vx: rand(-0.05,0.05),
    alpha: rand(0.15,0.55)
  }));

  // Drifting brain glyph paths (simple blob "brain" silhouettes drawn procedurally)
  const brains = Array.from({length: 4}, ()=>({
    x: rand(0,1)*W, y: rand(0,1)*H,
    scale: rand(0.5,1.1),
    rot: rand(0,Math.PI*2),
    rotSpeed: rand(-0.0006,0.0006),
    vx: rand(-0.06,0.06),
    vy: rand(-0.04,0.04),
    alpha: rand(0.04,0.09)
  }));

  function drawBrainGlyph(b){
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    ctx.scale(b.scale, b.scale);
    ctx.globalAlpha = b.alpha;
    ctx.strokeStyle = '#e8c873';
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

    // bubbles
    bubbles.forEach(b=>{
      b.y -= b.vy; b.wobble += b.wobbleSpeed;
      b.x += b.vx + Math.sin(b.wobble)*0.15;
      if(b.y < -b.r){ b.y = H + b.r; b.x = rand(0,1)*W; }
      if(b.x < -b.r) b.x = W + b.r;
      if(b.x > W + b.r) b.x = -b.r;

      const grad = ctx.createRadialGradient(b.x-b.r*0.3, b.y-b.r*0.3, b.r*0.1, b.x, b.y, b.r);
      if(b.hue==='gold'){
        grad.addColorStop(0, `rgba(232,200,115,${b.alpha+0.12})`);
        grad.addColorStop(0.7, `rgba(212,168,67,${b.alpha*0.5})`);
        grad.addColorStop(1, `rgba(212,168,67,0)`);
      } else {
        grad.addColorStop(0, `rgba(160,220,180,${b.alpha+0.10})`);
        grad.addColorStop(0.7, `rgba(111,174,126,${b.alpha*0.5})`);
        grad.addColorStop(1, `rgba(111,174,126,0)`);
      }
      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = b.hue==='gold' ? `rgba(232,200,115,${b.alpha+0.15})` : `rgba(111,174,126,${b.alpha+0.15})`;
      ctx.lineWidth = 1;
      ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
      ctx.stroke();
    });

    // particles
    particles.forEach(p=>{
      p.y -= p.vy; p.x += p.vx;
      if(p.y < -5){ p.y = H+5; p.x = rand(0,1)*W; }
      ctx.beginPath();
      ctx.fillStyle = `rgba(241,234,217,${p.alpha})`;
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
