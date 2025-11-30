// ---------------- Mood Selection Logic ----------------
const chips = document.querySelectorAll('.chip');
const generateBtn = document.getElementById('generateBtn');
let selectedMood = null;

chips.forEach(btn => {
  btn.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('is-selected'));
    btn.classList.add('is-selected');
    selectedMood = btn.dataset.mood;
    if (generateBtn) generateBtn.disabled = false;
  });
});

if (generateBtn) {
  generateBtn.addEventListener('click', () => {
    if (!selectedMood) return;
    sessionStorage.setItem('guest_mood', selectedMood);
    window.location.href = 'player-guest.html';
  });
}

// ---------------- Audius API Player Logic ----------------
const state = {
  mood: null,
  queue: [],
  cursor: 0
};

function pickRandomIndex(length) {
  return Math.floor(Math.random() * length);
}

async function fetchTracks() {
  try {
    const hostRes = await fetch('https://api.audius.co');
    const hostData = await hostRes.json();
    const host = hostData.data[0];

    // Get mood and genres
    const mood = sessionStorage.getItem('guest_mood') || '';
    const genres = JSON.parse(localStorage.getItem('user_genres')) || [];

    // Combine mood + genres equally
    const query = [mood, ...genres].join(' ');

    // Fetch tracks only (not playlists)
    const res = await fetch(`${host}/v1/tracks/search?query=${encodeURIComponent(query)}}&app_name=MoodSync`);
    const json = await res.json();

    // Map only individual tracks
    return json.data.map(track => ({
      title: track.title,
      artist: track.user.name,
      cover: track.artwork?.['150x150'] || '../images/default_album_icon.jpg',
      audio: `${host}/v1/tracks/${track.id}/stream?app_name=MoodSync`
    }));
  } catch (error) {
    console.error('Error fetching tracks:', error);
    return [];
  }
}

async function initPlayer() {
  const mood = sessionStorage.getItem('guest_mood');
  if (!mood) return; // Not on player page

  state.mood = mood;
  const moodTitleEl = document.getElementById('moodTitle');
  if (moodTitleEl) moodTitleEl.textContent = `You’re feeling: ${mood}`;

  state.queue = await fetchTracks(mood);
  if (!state.queue.length) {
    alert('No tracks found for this mood.');
    return;
  }

  state.cursor = pickRandomIndex(state.queue.length);
  setTrackInUI(state.queue[state.cursor]);
}

function setTrackInUI(track) {
  const trackTitleEl = document.getElementById('trackTitle');
  const coverArtEl = document.getElementById('coverArt');
  const audioSrc = document.getElementById('audioSrc');
  const audio = document.getElementById('audio');

  if (trackTitleEl) trackTitleEl.textContent = `${track.title} — ${track.artist}`;
  if (coverArtEl) {
    coverArtEl.src = track.cover;
    coverArtEl.alt = `${track.title} cover art`;
  }
  if (audioSrc && audio) {
    audioSrc.src = track.audio;
    audio.load();
    // Autoplay handling
    audio.play().catch(() => {
      console.warn('Autoplay blocked. User must click play.');
    });
  }
  // sync favorite button UI for the loaded track
  try{
    const favBtn = document.getElementById('favoriteBtn');
    if (favBtn){
      const stored = JSON.parse(localStorage.getItem('guest_favorites')||'[]');
      const key = (track?.audio||'') + '|' + (track?.title||'');
      const exists = stored.some(x=>((x.audio||'') + '|' + (x.title||'')) === key);
      if (exists) favBtn.classList.add('favorited'); else favBtn.classList.remove('favorited');
    }
  }catch(e){ /* ignore */ }
}

// Next track
document.getElementById('skipBtn')?.addEventListener('click', () => {
  if (!state.queue.length) return;
  state.cursor = (state.cursor + 1) % state.queue.length;
  setTrackInUI(state.queue[state.cursor]);
});

// Previous track
document.getElementById('prevBtn')?.addEventListener('click', () => {
  if (!state.queue.length) return;
  state.cursor = (state.cursor - 1 + state.queue.length) % state.queue.length;
  setTrackInUI(state.queue[state.cursor]);
});

// ---------------- Play/Pause Button ----------------
const playPauseBtn = document.getElementById('playPauseBtn');
if (playPauseBtn) {
  playPauseBtn.addEventListener('click', () => {
    const audio = document.getElementById('audio');
    if (!audio) return;

    if (audio.paused) {
      audio.play().catch(() => console.warn('Autoplay blocked.'));
      // Change icon to Pause
      playPauseBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
          <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
        </svg>
      `;
    } else {
      audio.pause();
      // Change icon back to Play
      playPauseBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 3v18l15-9L5 3z" fill="currentColor"/>
        </svg>
      `;
    }
  });
}

window.addEventListener('DOMContentLoaded', initPlayer);

// ---------------- Share modal wiring ----------------
// Show a simple choice modal when the share icon is pressed. If the user
// chooses Instagram we generate a preview image (data URL), save it to
// sessionStorage and open the `share_preview.html` page.
;(function wireShareModal(){
  const shareBtn = document.getElementById('shareBtn');
  const shareModal = document.getElementById('shareModal');
  const shareInstagram = document.getElementById('shareInstagram');
  const shareCancel = document.getElementById('shareCancel');

  if (!shareBtn || !shareModal || !shareInstagram || !shareCancel) return;

  shareBtn.addEventListener('click', (e) => {
    e.preventDefault();
    // always show the choice between Instagram and Cancel
    shareModal.classList.remove('hidden');
  });

  shareCancel.addEventListener('click', (e) => {
    e.preventDefault();
    shareModal.classList.add('hidden');
  });

  // Build a simple story-style dataURL from the current cover + title.
  async function buildStoryDataUrl(){
    try{
      const cover = document.getElementById('coverArt');
      const title = document.getElementById('trackTitle')?.textContent || '';
      const mood = sessionStorage.getItem('guest_mood') || '';

      // Choose smaller size on narrow screens
      const useSmall = (window.innerWidth && window.innerWidth < 500) || /Mobi|Android|iPhone/i.test(navigator.userAgent);
      const w = useSmall ? 720 : 1080;
      const h = useSmall ? 1280 : 1920;
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');

      // Background gradient
      const g = ctx.createLinearGradient(0,0,w,h);
      g.addColorStop(0,'#7b42ff'); g.addColorStop(1,'#ffb199');
      ctx.fillStyle = g; ctx.fillRect(0,0,w,h);

      // Heading
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.textAlign = 'center';
      ctx.font = `${Math.round(36 * (w/1080))}px system-ui, Arial`;
      ctx.fillText('this is what im listening to today', w/2, Math.round(110 * (w/1080)));

      // Cover
      const coverSize = Math.floor(w * 0.7);
      const cx = (w - coverSize)/2; const cy = Math.round(160 * (w/1080));
      if (cover && cover.src){
        const img = new Image(); img.crossOrigin = 'anonymous'; img.src = cover.src;
        await new Promise((res) => { img.onload = res; img.onerror = res; });
        // draw clipped rounded cover
        const r = Math.round(20 * (w/1080));
        ctx.save(); ctx.beginPath();
        ctx.moveTo(cx + r, cy); ctx.arcTo(cx + coverSize, cy, cx + coverSize, cy + coverSize, r);
        ctx.arcTo(cx + coverSize, cy + coverSize, cx, cy + coverSize, r);
        ctx.arcTo(cx, cy + coverSize, cx, cy, r); ctx.arcTo(cx, cy, cx + coverSize, cy, r);
        ctx.closePath(); ctx.clip(); ctx.drawImage(img, cx, cy, coverSize, coverSize); ctx.restore();
      }

      // Title
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
      const fontSizeTitle = Math.round(44 * (w/1080)); ctx.font = `700 ${fontSizeTitle}px system-ui, Arial`;
      const maxW = w - Math.round(140 * (w/1080));
      wrapText(ctx, title, w/2, cy + coverSize + Math.round(80 * (w/1080)), maxW, fontSizeTitle * 1.05);

      // Mood pill
      if (mood){
        const pillText = mood; ctx.font = `700 ${Math.round(28 * (w/1080))}px system-ui, Arial`;
        const pillW = Math.min(w - Math.round(160 * (w/1080)), ctx.measureText(pillText).width + Math.round(56 * (w/1080)));
        const pillH = Math.max(36, Math.round(48 * (w/1080)));
        const pillX = (w - pillW)/2; const pillY = h - Math.round(140 * (w/1080));
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(ctx, pillX, pillY, pillW, pillH, Math.round(28 * (w/1080)), true, false);
        ctx.fillStyle = '#fff'; ctx.fillText(pillText, w/2, pillY + pillH/2 + Math.round(10 * (w/1080)));
      }

      return canvas.toDataURL('image/png');
    }catch(e){ console.warn('buildStoryDataUrl failed', e); return null; }
  }

  function roundRect(ctx,x,y,w,h,r,fill,stroke){ if (typeof r==='undefined') r=5; ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); if(fill) ctx.fill(); if(stroke) ctx.stroke(); }
  function wrapText(ctx, text, x, y, maxWidth, lineHeight){ const words = text.split(' '); let line=''; for(let n=0;n<words.length;n++){ const testLine = line + words[n] + ' '; const metrics = ctx.measureText(testLine); if(metrics.width > maxWidth && n>0){ ctx.fillText(line, x, y); line = words[n] + ' '; y += lineHeight; } else { line = testLine; } } ctx.fillText(line, x, y); }

  shareInstagram.addEventListener('click', async (e) => {
    e.preventDefault();
    // Visual: mark the share icon as active
    shareBtn.classList.add('sharing');

    const curTitle = document.getElementById('trackTitle')?.textContent || '';
    const caption = `this is what im listening to today — ${curTitle}`;

    // Build preview image (dataURL) and hand off to preview page
    let dataUrl = null;
    try{ dataUrl = await buildStoryDataUrl(); }catch(e){ console.warn(e); }

    if (dataUrl){
      try{ sessionStorage.setItem('share_image', dataUrl); sessionStorage.setItem('share_caption', caption); sessionStorage.setItem('share_mood', sessionStorage.getItem('guest_mood') || ''); }catch(e){ console.warn('sessionStorage failure', e); }
      // open preview and clear modal (share preview lives under `user/`)
      window.open('../user/share_preview.html', '_blank');
      shareModal.classList.add('hidden');
      // clear sharing visual state after a short delay
      setTimeout(() => shareBtn.classList.remove('sharing'), 700);
      return;
    }

    // If building preview failed, fall back to simply opening Instagram web and clear state
    try{ window.open('https://www.instagram.com/', '_blank'); }catch(e){}
    shareModal.classList.add('hidden');
    setTimeout(() => shareBtn.classList.remove('sharing'), 700);
  });

})();

// ---------------- Home / Back to mood chooser ----------------
function wireHomeButton(){
  const btn = document.getElementById('newPick');
  if (!btn) return;
  btn.addEventListener('click', (e)=>{
    e.preventDefault();
    try{ sessionStorage.removeItem('guest_mood'); }catch(e){}
    try{ const audio = document.getElementById('audio'); if(audio){ audio.pause(); } }catch(e){}
    const path = window.location.pathname || '';
    // Navigate to the appropriate mood-picker page depending on whether we're in /guest/ or /user/.
    // Use origin-aware absolute URLs when served over HTTP(S); fall back to relative paths for file://.
    const target = /[/\\]user[/\\]/.test(path) ? '/user/created-user-home.html' : '/guest/guest_home.html';
    if (location.protocol && (location.protocol === 'http:' || location.protocol === 'https:')){
      window.location.href = `${location.origin}${target}`;
    } else {
      // relative fallback
      if (/[/\\]guest[/\\]/.test(path)) window.location.href = '../guest/guest_home.html';
      else if (/[/\\]user[/\\]/.test(path)) window.location.href = '../user/created-user-home.html';
      else window.location.href = 'guest/guest_home.html';
    }
  });
}
document.addEventListener('DOMContentLoaded', wireHomeButton);

// ---------------- Inject Favorites link into Menu dropdowns ----------------
function injectMenuFavoritesLink(){
  document.querySelectorAll('.dropdown-content').forEach(content=>{
    if (content.querySelector('.menu-favorites-page-link')) return;
    const a = document.createElement('a');
    a.className = 'menu-favorites-page-link';
    a.textContent = 'Favorites';
    try{
      if (location.protocol === 'http:' || location.protocol === 'https:') a.href = `${location.origin}/favorites.html`;
      else a.href = 'favorites.html';
    }catch(e){ a.href = 'favorites.html'; }
    // insert at the top so it's visible
    content.insertBefore(a, content.firstChild);
  });
}
document.addEventListener('DOMContentLoaded', injectMenuFavoritesLink);
// Render a playlist-style favorites panel inside dropdowns (compact version of favorites page)
function renderFavoritesDropdownPanels(){
  function loadJSON(key, fallback){ try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }catch(e){ return fallback; } }

  const favs = loadJSON('guest_favorites', []);
  document.querySelectorAll('.dropdown').forEach(drop => {
    const content = drop.querySelector('.dropdown-content');
    if (!content) return;

    // If a full-page Favorites link exists, do not render the compact songs panel
    // — this keeps the menu simple and ensures clicking "Favorites" navigates
    // to the dedicated `favorites.html` page instead of showing songs inline.
    if (content.querySelector('.menu-favorites-page-link')){
      // remove any existing compact panel to ensure songs are not shown
      const existingPanel = content.querySelector('.favorites-panel');
      if (existingPanel) existingPanel.remove();
      return; // continue to next dropdown
    }

    // ensure a visible opener that toggles the panel
    // Prefer an existing page-link so we don't create duplicate "Favorites" entries.
    let opener = content.querySelector('.menu-favorites-opener') || content.querySelector('.menu-favorites-page-link');
    if (!opener){
      opener = document.createElement('a');
      opener.className = 'menu-favorites-opener';
      opener.href = '#';
      opener.textContent = 'Favorites';
      opener.addEventListener('click', (e)=>{ e.preventDefault(); content.classList.toggle('show-favs'); });
      content.insertBefore(opener, content.firstChild);
    } else {
      // If we found the existing page-link, make it act as the opener (toggle the small panel)
      // Avoid attaching multiple listeners by marking the element once wired.
      if (!opener.dataset.favOpenerAttached){
        opener.addEventListener('click', (e)=>{ e.preventDefault(); content.classList.toggle('show-favs'); });
        opener.dataset.favOpenerAttached = '1';
      }
    }

    // legacy compact panel behavior removed — we intentionally do not create
    // a `.favorites-panel` here so songs are not shown inside the dropdown.

    // populate header collage and count
    const collage = panel.querySelector('.fp-collage'); collage.innerHTML = '';
    const sample = favs.slice(0,4);
    for (let i=0;i<4;i++){ const img = document.createElement('img'); img.className='collage-tile'; img.src = sample[i]?.cover || 'images/default_album_icon.jpg'; collage.appendChild(img); }
    panel.querySelector('.fp-count').textContent = favs.length || 0;

    const listEl = panel.querySelector('.fp-list'); listEl.innerHTML = '';
    if (!favs || !favs.length){ const empty = document.createElement('div'); empty.className='favorites-empty'; empty.textContent='No favorites yet'; listEl.appendChild(empty); }
    else {
      // header row for list (compact)
      const headerRow = document.createElement('div'); headerRow.className='favorites-row favorites-row--header'; headerRow.innerHTML=`<div class="col col--fav"></div><div class="col col--title">TITLE</div><div class="col col--artist">ARTIST</div><div class="col col--actions"></div>`; listEl.appendChild(headerRow);
      favs.slice(0,8).forEach(t=>{
        const row = document.createElement('div'); row.className='favorites-row';
        const colFav = document.createElement('div'); colFav.className='col col--fav'; const heart = document.createElement('button'); heart.className='fav-heart'; heart.innerHTML='<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg"><path d="M12 21s-7-4.35-9-7.5C1.5 9.36 5 5 8.5 5c1.74 0 3.04.81 3.5 1.5.46-.69 1.76-1.5 3.5-1.5C19 5 22.5 9.36 21 13.5 19 16.65 12 21 12 21z" fill="currentColor"/></svg>';
        heart.addEventListener('click', ()=>{ const stored = loadJSON('guest_favorites',[]); const k = (t.audio||'')+'|'+(t.title||''); const i = stored.findIndex(x=>((x.audio||'')+'|'+(x.title||''))===k); if(i>=0){ stored.splice(i,1); localStorage.setItem('guest_favorites', JSON.stringify(stored)); renderFavoritesDropdownPanels(); } });
        colFav.appendChild(heart);
        const colTitle = document.createElement('div'); colTitle.className='col col--title'; colTitle.innerHTML=`<div class="title">${t.title||'Untitled'}</div><div class="sub">${t.artist||''}</div>`;
        const colArtist = document.createElement('div'); colArtist.className='col col--artist'; colArtist.textContent = t.artist||'';
        const colActions = document.createElement('div'); colActions.className='col col--actions'; const playBtn = document.createElement('button'); playBtn.className='fav-play-icon'; playBtn.title='Play'; playBtn.innerHTML='<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
        playBtn.addEventListener('click', ()=>{ try{ if(typeof setTrackInUI==='function'){ setTrackInUI(t); window.location.href = 'player.html'; return; } }catch(e){} try{ sessionStorage.setItem('favorite_to_play', JSON.stringify(t)); window.location.href='player.html'; }catch(e){ window.location.href='player.html'; } });
        colActions.appendChild(playBtn);
        row.appendChild(colFav); row.appendChild(colTitle); row.appendChild(colArtist); row.appendChild(colActions);
        listEl.appendChild(row);
      });
    }

    // wire small filter
    const filter = panel.querySelector('.fp-filter'); filter.value = '';
    filter.oninput = ()=>{
      const q = filter.value.toLowerCase(); Array.from(listEl.querySelectorAll('.favorites-row')).forEach(r=>{ if (r.classList.contains('favorites-row--header')) return; const title = r.querySelector('.col--title .title')?.textContent?.toLowerCase()||''; const artist = r.querySelector('.col--title .sub')?.textContent?.toLowerCase()||''; r.style.display = (title.indexOf(q)!==-1 || artist.indexOf(q)!==-1) ? '' : 'none'; });
    };
  });
}
document.addEventListener('DOMContentLoaded', renderFavoritesDropdownPanels);
window.addEventListener('storage', (e)=>{ if (e.key === 'guest_favorites') renderFavoritesDropdownPanels(); });

// ---------------- Favorite heart: save and open Favorites page ----------------
function wireFavoriteToFavorites(){
  const favBtn = document.getElementById('favoriteBtn');
  if (!favBtn) return;

  favBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    // read current track info from DOM
    const titleText = document.getElementById('trackTitle')?.textContent || '';
    const [titlePart, artistPart] = titleText.split(' — ').map(s=>s && s.trim());
    const cover = document.getElementById('coverArt')?.src || '';
    const audio = document.getElementById('audio')?.currentSrc || '';
    const cur = { title: titlePart || '', artist: artistPart || '', cover, audio, mood: sessionStorage.getItem('guest_mood')||'' };
    if (!cur.title && !cur.audio) return;

    try{
      const stored = JSON.parse(localStorage.getItem('guest_favorites')||'[]');
      const key = (cur.audio||'') + '|' + (cur.title||'');
      const existsIndex = stored.findIndex(x => ((x.audio||'') + '|' + (x.title||'')) === key);
      if (existsIndex >= 0){
        // already favorited -> remove (toggle off)
        stored.splice(existsIndex, 1);
        favBtn.classList.remove('favorited');
      } else {
        // not favorited -> add to top and store when it was added
        cur.dateAdded = (new Date()).toISOString();
        // allow an optional album field if present on the page
        cur.album = document.getElementById('albumName')?.textContent || cur.album || '';
        stored.unshift(cur);
        favBtn.classList.add('favorited');
      }
      localStorage.setItem('guest_favorites', JSON.stringify(stored));
      // do not navigate away — keep user on the current page
    }catch(err){ console.warn('Could not save favorite', err); }
  });
}
document.addEventListener('DOMContentLoaded', wireFavoriteToFavorites);
