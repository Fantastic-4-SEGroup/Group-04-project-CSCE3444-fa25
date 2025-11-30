(function(){
  function loadJSON(key, fallback){ try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }catch(e){ return fallback; } }
  function saveJSON(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }
  function keyOf(t){ return (t?.audio || '') + '|' + (t?.title || ''); }

  const listEl = document.getElementById('favoritesList');
  const collageEl = document.getElementById('favCollage');
  const countEl = document.getElementById('favCount');

  // if critical DOM nodes are missing, bail gracefully
  if (!listEl) return; 

  function escapeHtml(s){ return String(s||'').replace(/[&<>\"']/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" })[c]); }

  function render(){
    const favs = loadJSON('guest_favorites', []);
    if (countEl) countEl.textContent = favs.length;

    // collage (2x2) — only if element exists
    if (collageEl){
      collageEl.innerHTML = '';
      const sample = favs.slice(0,4);
      for (let i=0;i<4;i++){
        const img = document.createElement('img');
        if (sample[i]) img.src = sample[i].cover || 'images/default_album_icon.jpg'; else img.src = 'images/default_album_icon.jpg';
        img.alt = '';
        img.className = 'collage-tile';
        collageEl.appendChild(img);
      }
    }

    // filtering removed; always show all favourites
    const q = '';
    // clear list
    listEl.innerHTML = '';
    if (!favs.length){
      const empty = document.createElement('div'); empty.textContent = 'No favorites yet'; empty.className='favorites-empty'; listEl.appendChild(empty); return;
    }

    // show newest favorites first (playlist style)
    const display = favs.slice().reverse();
    // update summary (count, duration, size)
    try{ updateSummary(favs); }catch(e){}

    // header timestamp removed per user request
    display.forEach((t, idx) => {
      if (q && ( (t.title||'').toLowerCase().indexOf(q)===-1 && (t.artist||'').toLowerCase().indexOf(q)===-1)) return;
      const item = document.createElement('li'); item.className='favorite-item favorites-row dark-table-row';

      // title column
      const colTitle = document.createElement('div'); colTitle.className='col col--title'; colTitle.innerHTML = `<div class="title">${escapeHtml(t.title||'Untitled')}</div>`;

      // album column (shows album/subtitle)
      const colAlbum = document.createElement('div'); colAlbum.className='col col--album'; colAlbum.textContent = t.album || '';

      // artist column
      const colArtist = document.createElement('div'); colArtist.className='col col--artist'; colArtist.textContent = t.artist || '';

      // updated column (relative time)
      const colUpdated = document.createElement('div'); colUpdated.className='col col--updated';
      const addedAt = t.dateAdded ? new Date(t.dateAdded).getTime() : null;
      colUpdated.textContent = addedAt ? formatRelativeTime(addedAt) : '';

      // duration column
      const colDuration = document.createElement('div'); colDuration.className='col col--duration';
      const dur = t.duration || t.length || t.time || '--:--'; colDuration.textContent = dur;

      // clicking the item plays the track
      item.addEventListener('click', ()=>{ playTrack(t); });

      item.appendChild(colTitle);
      item.appendChild(colAlbum);
      item.appendChild(colArtist);
      item.appendChild(colUpdated);
      item.appendChild(colDuration);
      listEl.appendChild(item);
    });
  }

  function parseDurationToSeconds(s){
    if (!s) return 0;
    if (typeof s === 'number') return Math.floor(s);
    const m = String(s).trim().split(':').map(x=>parseInt(x,10));
    if (m.length===2 && !isNaN(m[0]) && !isNaN(m[1])) return m[0]*60 + m[1];
    if (m.length===3 && !isNaN(m[0]) && !isNaN(m[1]) && !isNaN(m[2])) return m[0]*3600 + m[1]*60 + m[2];
    return 0;
  }

  function formatSeconds(s){
    const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60);
    if (h>0) return `${h} hr ${m} min`;
    return `${m} min`;
  }

  function formatRelativeTime(epochMs){
    const now = Date.now();
    const delta = Math.max(0, Math.floor((now - epochMs) / 1000)); // seconds
    if (delta < 60) return `${delta}s`;
    if (delta < 3600) return `${Math.floor(delta/60)}m`;
    if (delta < 86400) return `${Math.floor(delta/3600)}h`;
    return `${Math.floor(delta/86400)}d`;
  }
  

  function updateSummary(favs){
    const sumEl = document.getElementById('favoritesSummary'); if (!sumEl) return;
    const secs = (favs||[]).reduce((acc,t)=> acc + parseDurationToSeconds(t.duration||t.length||t.time), 0);
    const songs = (favs||[]).length;
    // estimate size using 320kbps MP3: bytes per second = 320000/8
    const bytes = Math.round(secs * (320000/8));
    const gb = (bytes / (1024*1024*1024));
    const gbStr = gb<0.1 ? `${(gb*1024).toFixed(1)} MB` : `${gb.toFixed(2)} GB`;
    const text = `${songs} songs, ${formatSeconds(secs)}, ${gbStr}`;
    sumEl.textContent = text;
    // also write into the bottom summary bar if present
    const bottom = document.getElementById('favoritesSummaryBar'); if (bottom) bottom.textContent = text;
  }

  function playTrack(t){
    try{ if (typeof setTrackInUI === 'function'){ setTrackInUI(t); window.location.href = 'player.html'; return; } }catch(e){}
    try{ sessionStorage.setItem('favorite_to_play', JSON.stringify(t)); window.location.href = 'player.html'; }catch(e){ window.location.href = 'player.html'; }
  }

  function removeTrack(t){
    const stored = loadJSON('guest_favorites', []);
    const k = keyOf(t); const i = stored.findIndex(x=>keyOf(x)===k); if (i>=0){ stored.splice(i,1); saveJSON('guest_favorites', stored); render(); }
  }

  // filter removed
  document.getElementById('playAllBtn')?.addEventListener('click', ()=>{
    const favs = loadJSON('guest_favorites', []);
    if (!favs || !favs.length) return;
    const display = favs.slice().reverse();
    try{ sessionStorage.setItem('favorites_queue', JSON.stringify(display)); sessionStorage.setItem('favorites_queue_index', '0'); }catch(e){}
    // try to hand off first track
    try{ if (typeof setTrackInUI === 'function'){ setTrackInUI(display[0]); window.location.href='player.html'; return; } }catch(e){}
    window.location.href='player.html';
  });

  document.getElementById('shuffleBtn')?.addEventListener('click', ()=>{
    const favs = loadJSON('guest_favorites', []);
    if (!favs || !favs.length) return;
    const display = favs.slice().reverse();
    // simple in-place shuffle (Fisher-Yates)
    for (let i=display.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [display[i],display[j]]=[display[j],display[i]]; }
    try{ sessionStorage.setItem('favorites_queue', JSON.stringify(display)); sessionStorage.setItem('favorites_queue_index', '0'); }catch(e){}
    try{ if (typeof setTrackInUI === 'function'){ setTrackInUI(display[0]); window.location.href='player.html'; return; } }catch(e){}
    window.location.href='player.html';
  });

  // Demo: seed sample favorites when the demo button is clicked
  const demoSample = [
    { title: 'Money, Money, Money', artist: 'ABBA', album: 'ABBA Gold: Greatest Hits', duration: '3:06', cover: 'images/default_album_icon.jpg', dateAdded: new Date().toISOString() },
    { title: 'One of Us', artist: 'ABBA', album: 'The Visitors (Deluxe Edition)', duration: '3:57', cover: 'images/default_album_icon.jpg', dateAdded: new Date().toISOString() },
    { title: 'Set Fire to the Rain', artist: 'Adele', album: '21', duration: '4:03', cover: 'images/default_album_icon.jpg', dateAdded: new Date().toISOString() },
    { title: 'Organise', artist: 'Asake', album: 'Mr. Money With The Vibe', duration: '2:04', cover: 'images/default_album_icon.jpg', dateAdded: new Date().toISOString() },
    { title: 'Quit Playing Games (With My Heart)', artist: 'Backstreet Boys', album: 'Backstreet Boys', duration: '3:54', cover: 'images/default_album_icon.jpg', dateAdded: new Date().toISOString() }
  ];

  document.getElementById('loadDemoFavorites')?.addEventListener('click', ()=>{
    try{ saveJSON('guest_favorites', demoSample); localStorage.setItem('guest_favorites_demo_seeded','1'); }catch(e){}
    render();
  });

  // If there are no favorites yet, auto-seed demo once so the layout shows example songs (only once)
  (function autoSeedIfEmpty(){
    try{
      const existing = loadJSON('guest_favorites', []);
      const seeded = localStorage.getItem('guest_favorites_demo_seeded');
      if ((!existing || existing.length===0) && !seeded){
        saveJSON('guest_favorites', demoSample);
        localStorage.setItem('guest_favorites_demo_seeded','1');
      }
    }catch(e){}
  })();

  // Initial render
  // re-render when favorites change in other tabs/windows
  window.addEventListener('storage', (e)=>{ if (e.key === 'guest_favorites') render(); });
  render();
})();
