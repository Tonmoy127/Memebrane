/* ============================================================
   MEMEBRANE — app.js
   Data is stored in Firebase Firestore so edits made via the
   admin panel are visible to ALL visitors instantly.
   ============================================================ */

// Firebase config
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

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
const _docRef = doc(_db, 'site', 'data');

const DEFAULT_DATA = {
  about: "Memebrane is a community built on one simple membrane: the thin, glowing line between studying and losing your mind over it. We turn classroom chaos, exam dread, and everyday academic life into memes, art, and writing — made by Memebraniacs, for Memebraniacs.",
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
      // First ever load — write defaults to Firestore
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
    toast('❌ Save failed — ' + e.message);
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
  document.getElementById('personPhotoFile').value = '';

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
  let photo = document.getElementById('personPhotoUrl').value.trim();
  const fileInput = document.getElementById('personPhotoFile');

  if(!name){ toast('Please enter a name'); return; }

  const finalize = (photoData) => {
    if(id){
      const p = DATA[type].find(x=>x.id===id);
      p.name=name; p.role=role; p.bio=bio; if(photoData!==undefined) p.photo = photoData;
    } else {
      DATA[type].push({ id: uid('p'), name, role, bio, photo: photoData || '' });
    }
    saveData();
    renderPeople();
    closeModal('personModalBackdrop');
    toast('Saved ✓');
  };

  if(fileInput.files && fileInput.files[0]){
    const reader = new FileReader();
    reader.onload = e => finalize(e.target.result);
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    finalize(photo);
  }
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
    const cell = document.createElement('div');
    cell.className = 'cal-cell' + (key===todayKey ? ' today' : '');
    const dayEvents = DATA.events.filter(e=>e.date===key);
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
    return `<div class="upcoming-item glass">
      <div class="glass-shine"></div>
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
  toast('Calendar file downloaded — open it to add to your phone/PC calendar');
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
  [...list].reverse().forEach(item=>{
    const card = document.createElement('div');
    card.className = 'submit-card glass fade-up visible';
    card.innerHTML = `
      <div class="glass-shine"></div>
      ${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">` : ''}
      <div class="submit-title">${escapeHtml(item.title)}</div>
      <div class="submit-author">by ${escapeHtml(item.author)}</div>
      ${item.body ? `<div class="submit-body">${escapeHtml(item.body)}</div>` : ''}
      <button class="btn small danger edit-only" onclick="deleteSubmission('writings','${item.id}')">Remove</button>
    `;
    grid.appendChild(card);
  });
}
function renderPhotography(){
  const grid = document.getElementById('photographyGrid');
  const list = DATA.photography;
  grid.innerHTML = '';
  if(!list.length){
    grid.innerHTML = `<div class="empty-state">No photos published yet. Be the first Memebraniac to submit!</div>`;
    return;
  }
  [...list].reverse().forEach(item=>{
    const tile = document.createElement('div');
    tile.className = 'photo-tile glass fade-up visible';
    tile.innerHTML = `
      <div class="glass-shine"></div>
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" onclick="openLightbox('${item.id}')">
      <div class="photo-tile-caption">
        <span class="photo-tile-title">${escapeHtml(item.title)}</span>
        <span class="photo-tile-author">by ${escapeHtml(item.author)}</span>
      </div>
      <button class="btn small danger edit-only photo-delete" onclick="deleteSubmission('photography','${item.id}')">✕</button>
    `;
    grid.appendChild(tile);
  });
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
  document.getElementById('submitImageFile').value = '';
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
  const fileInput = document.getElementById('submitImageFile');

  if(!title){ toast('Please add a title'); return; }
  if(type==='photography' && !imageUrl && !(fileInput.files && fileInput.files[0])){
    toast('Please add a photo (URL or upload)'); return;
  }

  const finalize = (imageData) => {
    DATA[type].push({ id: uid('s'), title, author, body, image: imageData || '' });
    saveData(); renderSubmissions();
    closeModal('submitModalBackdrop');
    toast('Published ✓');
  };
  if(fileInput.files && fileInput.files[0]){
    const reader = new FileReader();
    reader.onload = e => finalize(e.target.result);
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    finalize(imageUrl);
  }
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
      `<td><button class="btn small danger" onclick="removeRoutineRow('${row.id}')">✕</button></td>`;
    body.appendChild(tr);
  });
}
function escapeAttr(s){ return (s??'').replace(/"/g,'&quot;'); }
function updateRoutineCell(id, field, value){
  const row = DATA.routine.rows.find(r=>r.id===id);
  row[field] = value;
  // Routine is session-only — no saveData() here
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

  // ---- Palette (light theme, poster-friendly) ----
  const INK = [30, 38, 33];          // near-black text, easy on the eyes
  const MOSS_DEEP = [16, 59, 34];    // header band
  const GOLD = [180, 138, 45];       // accent (slightly deeper than on-screen gold for print contrast)
  const GOLD_BG = [250, 240, 219];   // pale gold row tint
  const MEMBRANE_BG = [232, 244, 235]; // pale green row tint
  const LINE = [205, 205, 200];      // light grey grid lines
  const WHITE = [255, 255, 255];

  // ---- Page background: clean white ----
  doc.setFillColor(...WHITE);
  doc.rect(0, 0, pageW, pageH, 'F');

  // ---- Header band (deep green, white text) ----
  const headerH = 64;
  doc.setFillColor(...MOSS_DEEP);
  doc.rect(0, 0, pageW, headerH, 'F');

  // simple circular brand mark with "M"
  doc.setFillColor(...GOLD);
  doc.circle(34, headerH/2, 13, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...MOSS_DEEP);
  doc.text('M', 29.5, headerH/2 + 4.5);

  doc.setFont(undefined, 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...WHITE);
  doc.text(DATA.routine.title || 'Study Routine', 58, headerH/2 - 3);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(235, 230, 215);
  doc.text(`${DATA.routine.name ? DATA.routine.name+'  •  ' : ''}Memebrane Study Planner`, 58, headerH/2 + 14);

  const dateStr = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  doc.setFontSize(9);
  doc.text(dateStr, pageW - 24, headerH/2 - 3, { align:'right' });
  doc.text('memebrane', pageW - 24, headerH/2 + 12, { align:'right' });

  // ---- Table geometry — sized to fill the page, large readable cells ----
  const days = ROUTINE_DAYS;
  const margin = 24;
  const startX = margin, startY = headerH + 20;
  const tableW = pageW - margin*2;
  const footerReserve = 34;
  const tableH = pageH - startY - footerReserve;

  const colTimeW = 95;
  const colW = (tableW - colTimeW) / days.length;
  const headRowH = 34;
  const bodyRowCount = Math.max(DATA.routine.rows.length, 1);
  const bodyRowH = Math.max(30, (tableH - headRowH) / bodyRowCount);

  // outer table border
  doc.setDrawColor(...MOSS_DEEP);
  doc.setLineWidth(1.4);
  doc.rect(startX, startY, tableW, headRowH + bodyRowH*bodyRowCount, 'S');

  // head row
  doc.setFillColor(...MOSS_DEEP);
  doc.rect(startX, startY, tableW, headRowH, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text('TIME', startX + 14, startY + headRowH/2 + 4);
  days.forEach((d,i)=>{
    const x = startX + colTimeW + i*colW;
    if(i>0){
      doc.setDrawColor(255,255,255);
      doc.setLineWidth(0.6);
      doc.line(x, startY+6, x, startY+headRowH-6);
    }
    doc.text(d.label.toUpperCase(), x + colW/2, startY + headRowH/2 + 4, { align:'center' });
  });
  doc.setFont(undefined, 'normal');

  // body rows — generous height, light alternating tint, big text
  let y = startY + headRowH;
  DATA.routine.rows.forEach((row, ri)=>{
    const isAlt = ri % 2 === 1;
    doc.setFillColor(...(isAlt ? MEMBRANE_BG : WHITE));
    doc.rect(startX, y, tableW, bodyRowH, 'F');

    // time column gets a soft gold tint to stand out from the grid
    doc.setFillColor(...GOLD_BG);
    doc.rect(startX, y, colTimeW, bodyRowH, 'F');

    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.7);
    doc.rect(startX, y, tableW, bodyRowH, 'S');
    doc.line(startX + colTimeW, y, startX + colTimeW, y + bodyRowH);

    doc.setFont(undefined, 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...GOLD);
    const timeLines = doc.splitTextToSize(row.time || '-', colTimeW - 16);
    doc.text(timeLines, startX + 12, y + bodyRowH/2 - (timeLines.length-1)*6 + 4);
    doc.setFont(undefined, 'normal');

    days.forEach((d,i)=>{
      const x = startX + colTimeW + i*colW;
      if(i>0){
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.7);
        doc.line(x, y, x, y + bodyRowH);
      }
      const text = row[d.key] || '';
      doc.setFontSize(10.5);
      if(text){
        doc.setTextColor(...INK);
        const lines = doc.splitTextToSize(text, colW - 14);
        doc.text(lines, x + colW/2, y + bodyRowH/2 - (lines.length-1)*6 + 4, { align:'center' });
      } else {
        doc.setTextColor(200,200,195);
        doc.text('—', x + colW/2, y + bodyRowH/2 + 4, { align:'center' });
      }
    });
    y += bodyRowH;
  });

  // ---- Footer ----
  const footerY = pageH - 16;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.line(margin, footerY - 14, pageW - margin, footerY - 14);
  doc.setFontSize(9);
  doc.setTextColor(...MOSS_DEEP);
  doc.setFont(undefined, 'bold');
  doc.text('Memebrane', margin, footerY);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(120,120,115);
  doc.text('Made for the Memebraniacs — stick this on your wall and stay on track.', margin + 62, footerY);
  doc.setTextColor(...GOLD);
  doc.text('Stay consistent. Stay chaotic.', pageW - margin, footerY, { align:'right' });

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
  window.scrollTo({top:0, behavior:'instant' in window ? 'instant' : 'auto'});
  if(!skipHash) history.replaceState(null, '', '#'+pageId);
  setupFadeUps();
  updateScrollProgress();
}

document.getElementById('navToggle').addEventListener('click', ()=>{
  document.getElementById('navLinks').classList.toggle('open');
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
// loadData() is async — it fetches from Firestore, then renders
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

  const interactiveSelector = 'a, button, input, textarea, select, .person-card, .submit-card, .photo-tile, .cal-cell, [onclick]';
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
   panel. Correct password reveals all edit/add controls for the
   REST OF THIS PAGE LOAD ONLY — reloading always re-locks.
   The Routine Planner's controls are NOT gated — always visible.
   ============================================================ */
const UNLOCK_PASSWORD = '23091809';
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
function submitUnlock(){
  const val = document.getElementById('unlockInput').value;
  if(val === UNLOCK_PASSWORD){
    document.body.classList.add('unlocked');
    closeUnlockPanel();
    toast('Editor controls unlocked for this page load ✓');
  } else {
    document.getElementById('unlockError').textContent = 'Incorrect password.';
    document.getElementById('unlockInput').value = '';
    document.getElementById('unlockInput').focus();
  }
}
document.getElementById('unlockInput').addEventListener('keydown', (e)=>{
  if(e.key === 'Enter') submitUnlock();
});
// Note: deliberately no persistence (no localStorage/sessionStorage) —
// every reload starts locked, by design.




/* ============================================================
   AMBIENT BACKGROUND — bubbles, drifting brain glyphs, particles
   ============================================================ */
(function(){
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W,H;
  function resize(){ W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

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
