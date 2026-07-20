/* ===================================================================
   cjoftherosary — Admin Panel Logic
   Handles: Firebase Auth, Firestore CRUD, drag-and-drop reorder
   =================================================================== */

/* ===== IMAGE FALLBACK ===== */
window.addEventListener('error', function (e) {
  if (e.target && e.target.tagName === 'IMG') {
    var img = e.target;
    if (img.dataset.fallbackAttempted) return;
    img.dataset.fallbackAttempted = 'true';
    var src = img.getAttribute('src') || '';
    var filename = src.split('/').pop().split('?')[0];
    if (filename) {
      img.src = 'pictures/' + filename;
    }
  }
}, true);

/* ===== FIREBASE INIT ===== */
var ALLOWED_EMAIL = "christinejade1234@gmail.com";

firebase.initializeApp({
  apiKey: "AIzaSyDK4OmS0iG9O2Q2rrRGsEU3h6GKVnsRLPE",
  authDomain: "portfolio-89e48.firebaseapp.com",
  projectId: "portfolio-89e48",
  storageBucket: "portfolio-89e48.firebasestorage.app",
  messagingSenderId: "502772014035",
  appId: "1:502772014035:web:6887cf13d00f47a3e4ed26"
});

var auth = firebase.auth();
var db = firebase.firestore();

var entries = [];
var editingId = null;
var dragSrcId = null;

var catColors = {
  articles: 'dot-articles',
  projects: 'dot-projects',
  'creative-writing': 'dot-creative-writing',
  excel: 'dot-excel'
};

/* ===== AUTH ===== */
auth.onAuthStateChanged(async function (user) {
  document.getElementById('loadingScreen').style.display = 'none';
  if (user && user.email === ALLOWED_EMAIL) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    await loadEntries();
  } else if (user) {
    await auth.signOut();
    document.getElementById('loginError').style.display = 'block';
    document.getElementById('loginScreen').style.display = 'flex';
  } else {
    document.getElementById('loginScreen').style.display = 'flex';
  }
});

document.getElementById('googleSignInBtn').addEventListener('click', function () {
  var provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(function (err) { console.error(err); });
});

document.getElementById('logoutBtn').addEventListener('click', function () {
  auth.signOut();
});

/* ===== FIRESTORE ===== */
async function loadEntries() {
  var snap = await db.collection('entries').get();
  entries = [];
  snap.forEach(function (d) { entries.push(Object.assign({ id: d.id }, d.data())); });
  entries.sort(function (a, b) {
    return (a.order != null ? a.order : 9999) - (b.order != null ? b.order : 9999) || (b.createdAt || 0) - (a.createdAt || 0);
  });
  renderList();
}

async function saveToFirestore(entry) {
  await db.collection('entries').doc(entry.id).set(entry);
}

async function saveOrder() {
  var batch = db.batch();
  entries.forEach(function (e, i) {
    batch.update(db.collection('entries').doc(e.id), { order: i });
  });
  await batch.commit();
}

/* ===== ENTRY LIST ===== */
function renderList() {
  var ul = document.getElementById('entryList');
  var empty = document.getElementById('emptyMsg');
  if (entries.length === 0) {
    ul.innerHTML = '';
    ul.appendChild(empty);
    empty.style.display = 'block';
    return;
  }
  ul.innerHTML = '';
  entries.forEach(function (e) {
    var li = document.createElement('li');
    li.className = 'entry-item' + (editingId === e.id ? ' active' : '');
    li.draggable = true;
    li.dataset.id = e.id;
    li.innerHTML =
      '<span class="drag-handle" title="Drag to reorder">⠿</span>' +
      '<span class="entry-cat-dot ' + (catColors[e.cat] || '') + '"></span>' +
      '<div class="entry-info">' +
      '<div class="entry-title">' + (e.title || 'Untitled') + '</div>' +
      '<div class="entry-meta">' + (e.category || e.cat || '') + ' · ' + (e.date || 'No date') + (e.byline ? ' · ' + e.byline : '') + '</div>' +
      '</div>' +
      '<button class="entry-del" data-id="' + e.id + '" title="Delete">✕</button>';

    li.querySelector('.entry-del').addEventListener('click', function (ev) {
      ev.stopPropagation();
      deleteEntry(e.id);
    });

    li.addEventListener('click', function (ev) {
      if (ev.target.classList.contains('entry-del') || ev.target.classList.contains('drag-handle')) return;
      editEntry(e.id);
    });

    li.addEventListener('dragstart', function (ev) {
      dragSrcId = e.id;
      setTimeout(function () { li.classList.add('dragging'); }, 0);
      ev.dataTransfer.effectAllowed = 'move';
    });
    li.addEventListener('dragend', function () {
      li.classList.remove('dragging');
      ul.querySelectorAll('.entry-item').forEach(function (el) { el.classList.remove('drag-over'); });
    });
    li.addEventListener('dragover', function (ev) {
      ev.preventDefault();
      ul.querySelectorAll('.entry-item').forEach(function (el) { el.classList.remove('drag-over'); });
      if (e.id !== dragSrcId) li.classList.add('drag-over');
    });
    li.addEventListener('drop', async function (ev) {
      ev.preventDefault();
      li.classList.remove('drag-over');
      if (!dragSrcId || dragSrcId === e.id) return;
      var fromIdx = entries.findIndex(function (x) { return x.id === dragSrcId; });
      var toIdx = entries.findIndex(function (x) { return x.id === e.id; });
      var moved = entries.splice(fromIdx, 1)[0];
      entries.splice(toIdx, 0, moved);
      renderList();
      await saveOrder();
      showToast('✓ Order saved!');
    });

    ul.appendChild(li);
  });
}

/* ===== FORM ===== */
function newEntry() {
  editingId = null;
  document.getElementById('formTitle').textContent = 'New Entry';
  document.getElementById('formSubtitle').textContent = 'Fill in the details below. Your entry will appear on the public portfolio.';
  ['fTitle', 'fByline', 'fCategory', 'fDate', 'fPreview', 'articleBody', 'fImage', 'fSkills', 'fLink', 'fLinkText'].forEach(function (id) {
    document.getElementById(id).value = '';
  });
  document.getElementById('fCat').value = 'articles';
  renderList();
}

function editEntry(id) {
  var e = entries.find(function (x) { return x.id === id; });
  if (!e) return;
  editingId = id;
  document.getElementById('formTitle').textContent = 'Edit Entry';
  document.getElementById('formSubtitle').textContent = 'Editing: ' + (e.title || 'Untitled');
  document.getElementById('fTitle').value = e.title || '';
  document.getElementById('fByline').value = e.byline || '';
  document.getElementById('fCat').value = e.cat || 'articles';
  document.getElementById('fCategory').value = e.category || '';
  document.getElementById('fDate').value = e.date || '';
  document.getElementById('fPreview').value = e.preview || '';
  document.getElementById('articleBody').value = e.body || '';
  document.getElementById('fImage').value = e.image || '';
  document.getElementById('fSkills').value = e.skills || '';
  document.getElementById('fLink').value = e.link || '';
  document.getElementById('fLinkText').value = e.linkText || '';
  renderList();
}

async function saveEntry() {
  var title = document.getElementById('fTitle').value.trim();
  if (!title) { alert('Please add a title.'); return; }

  var existing = editingId ? entries.find(function (x) { return x.id === editingId; }) : null;
  var entry = {
    id: editingId || ('e_' + Date.now()),
    createdAt: existing ? (existing.createdAt || Date.now()) : Date.now(),
    order: existing ? (existing.order != null ? existing.order : entries.length) : entries.length,
    title: title,
    byline: document.getElementById('fByline').value.trim(),
    cat: document.getElementById('fCat').value,
    category: document.getElementById('fCategory').value.trim(),
    date: document.getElementById('fDate').value.trim(),
    preview: document.getElementById('fPreview').value.trim(),
    body: document.getElementById('articleBody').value.trim(),
    image: document.getElementById('fImage').value.trim(),
    skills: document.getElementById('fSkills').value.trim(),
    link: document.getElementById('fLink').value.trim(),
    linkText: document.getElementById('fLinkText').value.trim(),
  };

  await saveToFirestore(entry);

  if (editingId) {
    var idx = entries.findIndex(function (x) { return x.id === editingId; });
    if (idx !== -1) entries[idx] = entry;
  } else {
    entries.push(entry);
    editingId = entry.id;
  }

  renderList();
  showToast('✓ Entry saved!');
}

async function deleteEntry(id) {
  if (!confirm('Delete this entry? This cannot be undone.')) return;
  await db.collection('entries').doc(id).delete();
  entries = entries.filter(function (x) { return x.id !== id; });
  if (editingId === id) newEntry();
  renderList();
  showToast('Entry deleted.');
}

function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(function () { t.style.display = 'none'; }, 2200);
}

/* ===== WIRE UP BUTTONS ===== */
document.getElementById('saveBtn').addEventListener('click', saveEntry);
document.getElementById('clearBtn').addEventListener('click', newEntry);
document.getElementById('newEntryBtn').addEventListener('click', newEntry);
