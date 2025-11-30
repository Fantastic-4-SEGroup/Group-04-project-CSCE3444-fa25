(function(){
  // Utilities for localStorage JSON
  function loadJSON(key, fallback){
    try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }catch(e){ return fallback; }
  }
  function saveJSON(key, val){
    try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){ /* ignore */ }
  }
  function keyOf(t){ return (t?.audio || '') + '\n' + (t?.title || ''); }

  // DOM refs
  const listEl = document.getElementById('favoritesList');
  const collageEl = document.getElementById('favCollage');
  const summaryEl = document.getElementById('favoritesSummary');
  const summaryBarEl = document.getElementById('favoritesSummaryBar');

  if (!listEl) return; // bail if critical node missing

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({
    '&':'&', '<':'<', '>':'>', '"':'"', "'":"'"
  })[c]); }

  // Duration helpers
  function parseDurationToSeconds(s){
    if (!s) return 0; if (typeof s === 'number') return Math.floor(s);
    const m = String(s).trim().split(':').map(x=>parseInt(x,10));
    if (m.length===2 && !isNaN(m[0]) && !isNaN(m[1])) return m[0]*60 + m[1];
    if (m.length===3 && !isNaN(m[0]) && !isNaN(m[1]) && !isNaN(m[2])) return m[0]*3600 + m[1]*60 + m[2];
    return 0;
  }
  function formatSeconds(s){ const h=Math.floor(s/3600), m=Math.floor((s%3600)/60); return h>0?`${h} hr ${m} min`:`${m} min`; }
  function formatRelativeTime(epochMs){
    const now = Date.now(); const delta = Math.max(0, Math.floor((now-epochMs)/1000));
    if (delta < 60) return `${delta}s`; if (delta < 3600) return `${Math.floor(delta/60)}m`; if (delta < 86400) return `${Math.floor(delta/3600)}h`; return `${Math.floor(delta/86400)}d`;
  }

  // Summary updater
  function updateSummary(favs){
    const secs = (favs||[]).reduce((acc,t)=> acc + parseDurationToSeconds(t.duration||t.length||t.time), 0);
    const songs = (favs||[]).length;
    // estimate size using 320kbps MP3: bytes per second = 320000/8
    const bytes = Math.round(secs * (320000/8));
    const gb = (bytes / (1024*1024*1024));
    const gbStr = gb<0.1 ? `${(gb*1024).toFixed(1)} MB` : `${gb.toFixed(2)} GB`;
    const text = `${songs} songs • ${formatSeconds(secs)} • ${gbStr}`;
    if (summaryEl) summaryEl.textContent = text;
    if (summaryBarEl) summaryBarEl.textContent = text;
  }

  // Collage: show first 4 covers
  function renderCollage(favs){
    if (!collageEl) return;
    collageEl.innerHTML = '';
    const sample = (favs||[]).slice(0,4);
    for (let i=0;i<4;i++){
      const img = document.createElement('img');
      img.className = 'collage-tile';
      img.src = sample[i]?.cover || 'images/default_album_icon.jpg';
      img.alt = '';
      collageEl.appendChild(img);
    }
  }

  // Play a track
  function playTrack(t){
    try{
      if (typeof setTrackInUI === 'function'){
        setTrackInUI(t);
        window.location.href = 'player.html';
        return;
      }
    }catch(e){/* ignore */}
    try{ sessionStorage.setItem('favorite_to_play', JSON.stringify(t)); window.location.href = 'player.html'; }
    catch(e){ window.location.href = 'player.html'; }
  }

  // Remove a track from favorites
  function removeTrack(t){
    const stored = loadJSON('guest_favorites', []);
    const k = keyOf(t);
    const i = stored.findIndex(x=> keyOf(x)===k);
    if (i>=0){ stored.splice(i,1); saveJSON('guest_favorites', stored); render(); }
  }

  // Main renderer
  function render(){
    const favs = loadJSON('guest_favorites', []);

    // Update summary + collage
    try{ updateSummary(favs); }catch(e){/* ignore */}
    try{ renderCollage(favs); }catch(e){/* ignore */}

    // Empty state helper toggle
    const emptyWrap = document.getElementById('favoritesEmptyHelper');
    if (!favs.length){
      listEl.innerHTML = '';
      if (emptyWrap) emptyWrap.hidden = false;
      const empty = document.createElement('div');
      empty.textContent = 'No favorites yet';
      empty.className = 'favorites-empty';
      listEl.appendChild(empty);
      return;
    } else {
      if (emptyWrap) emptyWrap.hidden = true;
    }

    // Show newest first
    const display = favs.slice().reverse();

    // Build compact rows
    listEl.innerHTML = '';
    display.forEach((t) => {
      const item = document.createElement('li');
      item.className = 'song-row';
      item.addEventListener('click', () => { playTrack(t); });

      const cover = document.createElement('img');
      cover.className = 'song-cover';
      cover.src = t.cover || 'images/default_album_icon.jpg';
      cover.alt = '';
      item.appendChild(cover);

      const main = document.createElement('div');
      main.className = 'song-main';
      const title = document.createElement('div');
      title.className = 'song-title';
      title.textContent = t.title || 'Untitled';
      const sub = document.createElement('div');
      sub.className = 'song-sub';
      const artistName = (t.artist || '').trim();
      const albumName  = (t.album  || '').trim();
      sub.textContent  = albumName ? `${artistName} • ${albumName}` : artistName;
      main.appendChild(title);
      main.appendChild(sub);
      item.appendChild(main);

      const artistCol = document.createElement('div');
      artistCol.className = 'song-artist';
      artistCol.textContent = artistName;
      item.appendChild(artistCol);

      const durationCol = document.createElement('div');
      durationCol.className = 'song-duration';
      const dur = t.duration || t.length || t.time || '--:--';
      durationCol.textContent = dur;
      item.appendChild(durationCol)

      listEl.appendChild(item);
    });
  }

  // Play all 
  document.getElementById('playAllBtn')?.addEventListener('click', ()=>{
    const favs = JSON.parse(localStorage.getItem('guest_favorites') || '[]');
    if (!favs || !favs.length) return;

    // Show newest first; adjust if you prefer original order
    const display = favs.slice().reverse();

    // Save the entire queue to sessionStorage
    try {
      sessionStorage.setItem('favorites_queue', JSON.stringify(display));
      sessionStorage.setItem('favorites_queue_index', '0');
    } catch (e) { /* ignore */ }

    // Optional: hand off first track immediately if the player exposes setTrackInUI
    try {
      if (typeof setTrackInUI === 'function') {
        setTrackInUI(display[0]);
        window.location.href = 'player.html';
        return;
      }
    } catch (e) { /* ignore */ }

    // Navigate to the player
    window.location.href = 'player.html';
  });


  
  // Clear Favorites
  const clearBtn = document.getElementById('clearFavoritesBtn');
  if (clearBtn) {
    // Disable when empty (and keep it in sync on render)
    function syncClearButtonDisabled() {
      try {
        const favs = JSON.parse(localStorage.getItem('guest_favorites') || '[]');
        clearBtn.disabled = !favs || favs.length === 0;
      } catch {
        clearBtn.disabled = true;
      }
    }

    clearBtn.addEventListener('click', () => {
      // Safety confirm
      const ok = confirm('Clear all favorites? This will remove every saved song from your Favorites.');
      if (!ok) return;

      try {
        localStorage.setItem('guest_favorites', '[]');
        // Also clear the demo seed marker so your helper can show again if desired
        localStorage.removeItem('guest_favorites_demo_seeded');
      } catch (e) { /* ignore */ }

      // Re-render the page state
      render();
      // Keep the button state in sync
      syncClearButtonDisabled();
    });

    // Initialize disabled state on load
    syncClearButtonDisabled();
  }

  // Ensure button stays in sync if favorites change elsewhere (you already have a storage listener)
  window.addEventListener('storage', (e) => {
    if (e.key === 'guest_favorites') {
      // Existing: render();
      // Also keep Clear button disabled/enabled appropriately
      try {
        const favs = JSON.parse(e.newValue || '[]');
        if (clearBtn) clearBtn.disabled = !favs || favs.length === 0;
      } catch {
        if (clearBtn) clearBtn.disabled = true;
      }
    }
  });


  // Re-render when favorites change in other tabs/windows
  window.addEventListener('storage', (e)=>{ if (e.key === 'guest_favorites') render(); });

  // Initial render
  render();
})();

