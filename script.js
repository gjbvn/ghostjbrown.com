(function () {
  var SECTIONS = ['city', 'people', 'rural', 'abstract', 'film'];
  var gallery = document.getElementById('gallery');
  var about = document.getElementById('about-panel');
  var tabs = document.querySelectorAll('.sections a');
  var lightbox = document.getElementById('lightbox');
  var lbImg = document.getElementById('lb-img');
  var lbCount = document.getElementById('lb-count');

  var photos = [];
  var current = [];   // photos in the current view
  var index = 0;      // open photo in the lightbox
  var lastFocus = null;

  document.getElementById('year').textContent = new Date().getFullYear();

  function columnCount() {
    var w = gallery.clientWidth || window.innerWidth;
    if (w < 560) return 1;
    if (w < 900) return 2;
    return 3;
  }

  function sectionFromHash() {
    var h = (location.hash || '#all').slice(1).toLowerCase();
    if (h === 'about' || SECTIONS.indexOf(h) !== -1) return h;
    return 'all';
  }

  function render() {
    var section = sectionFromHash();
    tabs.forEach(function (a) {
      if (a.dataset.section === section) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    if (section === 'about') {
      gallery.hidden = true;
      about.hidden = false;
      return;
    }
    about.hidden = true;
    gallery.hidden = false;

    // In "All", a photo that sits in two sections (e.g. Film and City) shows once.
    current = section === 'all'
      ? photos.filter(function (p) { return !p.also; })
      : photos.filter(function (p) { return p.section === section; });
    gallery.innerHTML = '';

    if (!current.length) {
      var empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'Photos coming soon.';
      gallery.appendChild(empty);
      return;
    }

    // Place each photo in the shortest column so the order reads left-to-right.
    var n = columnCount();
    var cols = [], heights = [];
    for (var c = 0; c < n; c++) {
      var col = document.createElement('div');
      col.className = 'col';
      gallery.appendChild(col);
      cols.push(col);
      heights.push(0);
    }

    current.forEach(function (p, i) {
      var shortest = heights.indexOf(Math.min.apply(null, heights));
      heights[shortest] += p.h / p.w;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Open photo ' + (i + 1) + ' of ' + current.length);
      btn.style.aspectRatio = p.w + ' / ' + p.h;

      var img = document.createElement('img');
      img.src = p.thumb;
      img.width = p.w;
      img.height = p.h;
      img.alt = p.alt || '';
      img.loading = i < 6 ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.addEventListener('load', function () { img.classList.add('loaded'); });
      if (img.complete) img.classList.add('loaded');

      btn.appendChild(img);
      btn.addEventListener('click', function () { open(i); });
      cols[shortest].appendChild(btn);
    });
  }

  // Lightbox
  function show() {
    var p = current[index];
    lbImg.src = p.full;
    lbImg.alt = p.alt || '';
    lbCount.textContent = (index + 1) + ' / ' + current.length;
    // Preload neighbours
    [index - 1, index + 1].forEach(function (k) {
      var q = current[(k + current.length) % current.length];
      if (q) { var im = new Image(); im.src = q.full; }
    });
  }
  function open(i) {
    lastFocus = document.activeElement;
    index = i;
    show();
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    lightbox.querySelector('.lb-close').focus();
  }
  function close() {
    lightbox.hidden = true;
    lbImg.removeAttribute('src');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  function step(d) {
    index = (index + d + current.length) % current.length;
    show();
  }

  lightbox.querySelector('.lb-close').addEventListener('click', close);
  lightbox.querySelector('.lb-prev').addEventListener('click', function () { step(-1); });
  lightbox.querySelector('.lb-next').addEventListener('click', function () { step(1); });
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) close();
  });
  document.addEventListener('keydown', function (e) {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });

  // Swipe on phones
  var startX = null;
  lightbox.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    startX = null;
  });

  // Re-layout when the column count changes
  var lastCols = null;
  window.addEventListener('resize', function () {
    var n = columnCount();
    if (n !== lastCols) { lastCols = n; render(); }
  });
  window.addEventListener('hashchange', function () {
    render();
    if (!lightbox.hidden) close();
  });

  fetch('photos.json')
    .then(function (r) { return r.json(); })
    .then(function (data) { photos = data; lastCols = columnCount(); render(); })
    .catch(function () { photos = []; render(); });
})();
