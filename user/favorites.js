
(function(){
  // =========================
  // Utilities for localStorage JSON
  // =========================
  function loadJSON(key, fallback){
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch(e) {
      return fallback;
    }
  }

  function saveJSON(key, val){
    try { localStorage.setItem(key, JSON.stringify(val)); }
    catch(e) { /* ignore */ }
  }

  function keyOf(t){
    // Dedup key: audio + title (adjust if your schema differs)
    return (t?.audio || t?.url || '') + '\n' + (t?.title || '');
  }

  // =========================
  // DOM refs
  // =========================
  const listEl       = document.getElementById('favoritesList');
  const collageEl    = document.getElementById('favCollage');
  const summaryEl    = document.getElementById('favoritesSummary');
  const summaryBarEl = document.getElementById('favoritesSummaryBar');
  const clearBtn     = document.getElementById('clearFavoritesBtn');

  if (!listEl) return; // bail if critical node missing

  // =========================
  // Summary updater (count only)
  // =========================
  function updateSummary(favs){
    const songs = (favs || []).length;
    const text = `${songs} songs`;
    if (summaryEl)    summaryEl.textContent    = text;
    if (summaryBarEl) summaryBarEl.textContent = text;
  }

  // =========================
  // Collage: show first 4 covers
  // =========================
  function renderCollage(favs){
    if (!collageEl) return;
    collageEl.innerHTML = '';
    const sample = (favs || []).slice(0, 4);
    for (let i = 0; i < 4; i++){
      const img = document.createElement('img');
      img.className = 'collage-tile';
      img.src = sample[i]?.cover || '../images/default_album_icon.jpg';
      img.alt = '';
      collageEl.appendChild(img);
    }
  }

  // =========================
  // Play a track
  // =========================
  function playTrack(t){
    try {
      // If your player exposes setTrackInUI, use it:
      if (typeof setTrackInUI === 'function'){
        setTrackInUI(t);
        window.location.href = 'player.html';
        return;
      }
    } catch (e) { /* ignore */ }

    // Pass the track to player via sessionStorage
    try {
      sessionStorage.setItem('favorite_to_play', JSON.stringify(t));
      window.location.href = 'player.html';
    } catch (e) {
      window.location.href = 'player.html';
    }
  }

  // =========================
  // Main renderer (2 columns: SONG | ARTIST)
  // =========================
  function render(){
    const favs = loadJSON('guest_favorites', []);

    // Update summary + collage
    try { updateSummary(favs); } catch(e) { /* ignore */ }
    try { renderCollage(favs); } catch(e) { /* ignore */ }

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

    // Build compact rows (2 columns: SONG | ARTIST)
    listEl.innerHTML = '';
    display.forEach((t, idx) => {
      const item = document.createElement('li');
      item.className = 'song-row';
      item.addEventListener('click', () => { playTrack(t); });

      // === SONG column: number + cover (in one cell) ===
      const songCell = document.createElement('div');
      songCell.className = 'song-cell';

      const num = document.createElement('span');
      num.className = 'song-number';
      num.textContent = String(idx + 1);

      const cover = document.createElement('img');
      cover.className = 'song-cover';
      cover.src = t.cover || '../images/default_album_icon.jpg';
      cover.alt = '';

      songCell.appendChild(num);
      songCell.appendChild(cover);
      item.appendChild(songCell);

      // === ARTIST column: title (top) + artist/album (below) ===
      const artistCell = document.createElement('div');
      artistCell.className = 'artist-cell';

      const title = document.createElement('div');
      title.className = 'song-title';
      title.textContent = t.title || 'Untitled';

      const sub = document.createElement('div');
      sub.className = 'song-sub';
      const artistName = (t.artist || '').trim();
      const albumName  = (t.album || '').trim();
      sub.textContent = albumName ? `${artistName} • ${albumName}` : artistName;

      artistCell.appendChild(title);
      artistCell.appendChild(sub);
      item.appendChild(artistCell);

      listEl.appendChild(item);
    });

    // Keep Clear button state in sync
    if (clearBtn) {
      try { clearBtn.disabled = !(favs && favs.length > 0); }
      catch { clearBtn.disabled = true; }
    }
  }

  // =========================
  // Play all (Favorites-only)
  // =========================
  document.getElementById('playAllBtn')?.addEventListener('click', () => {
    const favs = loadJSON('guest_favorites', []);
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

  // =========================
  // Clear Favorites (persisted)
  // =========================
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const ok = confirm('Clear all favorites? This will remove every saved song from your Favorites.');
      if (!ok) return;
      try {
        localStorage.setItem('guest_favorites', '[]');
      } catch (e) { /* ignore */ }
      render();
    });
  }

  // =========================
  // Keep UI in sync across tabs/windows
  // =========================
  window.addEventListener('storage', (e) => {
    if (e.key === 'guest_favorites') {
      try {
        const favs = JSON.parse(e.newValue || '[]');
        if (clearBtn) clearBtn.disabled = !favs || favs.length === 0;
      } catch {
        if (clearBtn) clearBtn.disabled = true;
      }
      render();
    }
  });

  // =========================
  // Initial render
  // =========================
  render();
})();
