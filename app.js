/* Shared helpers */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

function saveJSON(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function loadJSON(key, fallback){
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function keyOf(t){ return (t?.audio||'') + '|' + (t?.title||''); }

/* ------- INDEX PAGE LOGIC ------- */
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
    window.location.href = 'player.html';
  });
}

/* ------- PLAYER PAGE LOGIC ------- */
/* Make sure these keys match index.html data-mood labels */
const moodLibrary = {
  Happy: [
    { title: 'Rock Your Body', audio: 'audio/JustinTimberlake-RockYourBody(Official Video).mp3', cover: 'images/Justin_Timberlake_-_Rock_Your_Body.youtube' },
    { title: 'Happy', audio: 'audio/Pharrell Williams - Happy (Video).mp3', cover: 'images/artworks-000079184494-1nll8c-t500x500.jpg' },
  ],
  Sad: [
    { title: 'Coldplay - Viva La Vida', audio: 'audio/Coldplay - Viva La Vida (Official Video).mp3', cover: 'images/coldplay.jpeg' },
    { title: 'Somewhere Over the Rainbow', audio: 'audio/OFFICIAL Somewhere over the Rainbow - Israel IZ Kamakawiwoʻole.mp3', cover: 'images/somewhere.jpeg' },
  ],
  Workout: [
    { title: 'Grinding', audio: 'audio/Shalon - Grinding (Official Video) feat. Chuck Diamond.mp3', cover: 'images/grinding_by_shalon.jpeg' },
    { title: 'The Weeknd - São Paulo feat. Anitta', audio: 'audio/The Weeknd - São Paulo feat. Anitta (Official Audio).mp3', cover: 'images/sao.jpg' },
  ],
  Study: [
    { title: 'Lo-Fi Study 1', audio: 'audio/lofi1.mp3', cover: 'images/lofi1.jpg' },
    { title: 'Lo-Fi Study 2', audio: 'audio/lofi2.mp3', cover: 'images/lofi2.jpg' },
  ],
  Calm: [
    { title: 'Calm Seas', audio: 'audio/calm1.mp3', cover: 'images/calm1.jpg' },
    { title: 'Deep Breath', audio: 'audio/calm2.mp3', cover: 'images/calm2.jpg' },
  ],
  Rage: [
    { title: 'Push It', audio: 'audio/rage1.mp3', cover: 'images/rage1.jpg' },
    { title: 'Break Stuff', audio: 'audio/rage2.mp3', cover: 'images/rage2.jpg' },
  ],
};

// --- Player state ---
const state = {
  mood: null,
  queue: [],       // array of tracks
  cursor: 0,       // index into queue (current track)
  favorites: loadJSON('guest_favorites', []), // persistent favorites
};

function pickRandomIndex(len, notIndex = -1){
  if (len <= 1) return 0;
  let idx = Math.floor(Math.random() * len);
  if (idx === notIndex) idx = (idx + 1) % len; // avoid immediate repeat
  return idx;
}

function setTrackInUI(track){
  const trackTitleEl = document.getElementById('trackTitle');
  const coverArtEl = document.getElementById('coverArt');
  const audioSrc = document.getElementById('audioSrc');
  const audio = document.getElementById('audio');

  if (trackTitleEl) trackTitleEl.textContent = track?.title || '—';
  if (coverArtEl) {
    coverArtEl.src = track?.cover || '';
    coverArtEl.alt = track?.title ? `${track.title} cover art` : 'Cover art';
  }
  if (audioSrc && audio) {
    audioSrc.src = track?.audio || '';
    audio.load();
  }
  renderQueue();
  // Reflect favorite state on the favorite button
  try{
    const favoriteBtnEl = document.getElementById('favoriteBtn');
    if (favoriteBtnEl){
        const k = keyOf(track);
        const isFav = state.favorites.some(t => keyOf(t) === k);
        if (isFav) favoriteBtnEl.classList.add('favorited'); else favoriteBtnEl.classList.remove('favorited');
        // update accessible pressed state
        try{ favoriteBtnEl.setAttribute('aria-pressed', isFav ? 'true' : 'false'); }catch(e){}
    }
  }catch(e){/* ignore */}
}

function playCurrent(){
  const audio = document.getElementById('audio');
  if (!audio) return;
  audio.play().catch(()=>{/* autoplay might be blocked */});
}

function nextTrack(){
  if (!state.queue.length) return;
  state.cursor = (state.cursor + 1) % state.queue.length;
  setTrackInUI(state.queue[state.cursor]);
  playCurrent();
}

function previousTrack(){
  if (!state.queue.length) return;
  // move cursor back one, wrap to end when at 0
  state.cursor = (state.cursor - 1 + state.queue.length) % state.queue.length;
  setTrackInUI(state.queue[state.cursor]);
  playCurrent();
}

function newRandomSong(){
  if (!state.queue.length) return;
  const idx = pickRandomIndex(state.queue.length, state.cursor);
  state.cursor = idx;
  setTrackInUI(state.queue[state.cursor]);
  playCurrent();
}

function favoriteCurrent(){
  const cur = state.queue[state.cursor];
  if (!cur) return;
  const k = keyOf(cur);
  const exists = state.favorites.some(t => keyOf(t) === k);
  if (exists){
    // remove favorite
    state.favorites = state.favorites.filter(t => keyOf(t) !== k);
  } else {
    // add favorite
    state.favorites.push(cur);
  }
  saveJSON('guest_favorites', state.favorites);
  // update button UI
  const favoriteBtnEl = document.getElementById('favoriteBtn');
  if (favoriteBtnEl){
    if (exists) {
      favoriteBtnEl.classList.remove('favorited');
      try{ favoriteBtnEl.setAttribute('aria-pressed','false'); }catch(e){}
    } else {
      favoriteBtnEl.classList.add('favorited');
      try{ favoriteBtnEl.setAttribute('aria-pressed','true'); }catch(e){}
    }
  }
  renderQueue();
}

/* ---------- Render Queue (Up Next) ---------- */
function renderQueue(limit = 6){
  const pillsWrap = document.getElementById('queuePills');
  if (!pillsWrap) return;

  if (!state.queue.length){
    pillsWrap.innerHTML = '<span class="queue-empty">Nothing queued</span>';
    return;
  }

  // show items after current cursor, wrapping around
  const items = [];
  const total = state.queue.length;
  const max = Math.min(limit, total - 1);

  for (let i = 1; i <= max; i++){
    const idx = (state.cursor + i) % total;
    const t = state.queue[idx];
    const star = t.fav ? '<small>★</small>' : '';
    items.push(`<span class="pill">${star}${escapeHtml(t.title || 'Untitled')}</span>`);
  }

  if (items.length === 0){
    pillsWrap.innerHTML = '<span class="queue-empty">No upcoming songs</span>';
  } else {
    pillsWrap.innerHTML = items.join('');
  }
}

// basic HTML escaper (tiny)
function escapeHtml(str){ return (str + '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }

// --- Init player ---
function initPlayer() {
  const isPlayer = document.querySelector('.player-card');
  if (!isPlayer) return; // not on player page

  const mood = sessionStorage.getItem('guest_mood');
  const moodTitleEl = document.getElementById('moodTitle');
  const newPick = document.getElementById('newPick');

  const playPauseBtn = document.getElementById('playPauseBtn');
  const prevBtn = document.getElementById('prevBtn');
  const skipBtn = document.getElementById('skipBtn');
  const newSongBtn = document.getElementById('newSongBtn');
  const favoriteBtn = document.getElementById('favoriteBtn');
  const audio = document.getElementById('audio');

  if (!mood || !moodLibrary[mood]) {
    window.location.replace('index.html');
    return;
  }
  state.mood = mood;

  if (moodTitleEl) moodTitleEl.textContent = `You’re feeling: ${mood}`;

  // Build initial queue from mood (clone so we can mutate)
  state.queue = (moodLibrary[mood] || []).map(x => ({...x}));
  // Start at a random song
  state.cursor = pickRandomIndex(state.queue.length);
  setTrackInUI(state.queue[state.cursor]);

  // Wire controls
  // Helper to update the play/pause button icon
  function setPlayButtonState(isPlaying){
    if (!playPauseBtn) return;
    if (isPlaying){
      playPauseBtn.classList.add('playing');
      playPauseBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="6" y="5" width="4" height="14" fill="currentColor" />
          <rect x="14" y="5" width="4" height="14" fill="currentColor" />
        </svg>`;
    } else {
      playPauseBtn.classList.remove('playing');
      playPauseBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M5 3v18l15-9L5 3z" fill="currentColor"/>
        </svg>`;
    }
  }

  // Initialize button icon based on current audio state
  setPlayButtonState(!(audio.paused));

  if (playPauseBtn) playPauseBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play().catch(()=>{});
      // user initiated play — reveal share immediately
      revealShareOnce();
    } else {
      audio.pause();
    }
    // Icon update is handled by the audio event listeners below
  });

  // Keep the button icon in sync with actual playback state
  audio.addEventListener('play', () => setPlayButtonState(true));
  audio.addEventListener('pause', () => setPlayButtonState(false));
  if (prevBtn) prevBtn.addEventListener('click', previousTrack);
  if (skipBtn) skipBtn.addEventListener('click', nextTrack);
  if (newSongBtn) newSongBtn.addEventListener('click', newRandomSong);
  if (favoriteBtn) favoriteBtn.addEventListener('click', favoriteCurrent);
  if (newPick) newPick.addEventListener('click', () => {
    // Clear the guest mood and navigate to the mood generator so the user can pick a different mood
    try { sessionStorage.removeItem('guest_mood'); } catch(e){}
    try { const a = document.getElementById('audio'); if (a && !a.paused) a.pause(); } catch(e){}
    // Prefer the guest mood generator page; fall back to index.html if it doesn't exist
    window.location.href = 'guest_home.html';
  });

  // Auto-advance when the song ends
  audio.addEventListener('ended', nextTrack);
  // --- Share to Instagram UI ---
  const shareBtn = document.getElementById('shareBtn');
  const shareModal = document.getElementById('shareModal');
  const shareInstagram = document.getElementById('shareInstagram');
  const shareCancel = document.getElementById('shareCancel');

  // Reveal the share icon once the user has selected a mood and playback has started.
  // Once revealed it stays visible for the session (even if paused) so the user can
  // share the currently playing track at any time.
  let shareRevealed = false;

  function revealShareOnce(){
    if (!shareBtn) return;
    if (!state.mood) return; // don't reveal unless a mood was selected
    shareRevealed = true;
    shareBtn.classList.remove('hidden');
  }

  // On play or when the audio becomes ready, reveal and keep visible
  audio.addEventListener('play', revealShareOnce);
  audio.addEventListener('canplay', revealShareOnce);

  // If autoplay already succeeded by the time we initialize, reveal immediately
  if ((audio && !audio.paused && audio.currentTime > 0) && state.mood) {
    // small timeout to ensure DOM is settled
    setTimeout(revealShareOnce, 50);
  }

  // Show modal when icon clicked
  if (shareBtn) shareBtn.addEventListener('click', () => {
    if (shareModal) shareModal.classList.remove('hidden');
  });

  // Home button: go back to mood picker (index.html)
  const homeBtn = document.getElementById('homeBtn');
  if (homeBtn) homeBtn.addEventListener('click', () => {
    // clear the guest mood and navigate back to the generator
    try { sessionStorage.removeItem('guest_mood'); } catch(e){}
    window.location.href = 'index.html';
  });

  // Cancel/hide modal
  if (shareCancel) shareCancel.addEventListener('click', () => {
    if (shareModal) shareModal.classList.add('hidden');
  });

  // Perform Instagram share flow: copy text and open Instagram web
  // Create a story-style image (canvas) for the current track and return a Blob
  async function createStoryImageBlob(track){
    const w = 1080, h = 1920; // story aspect
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');

    // background gradient
    const g = ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0, '#7b42ff'); g.addColorStop(1, '#ffb199');
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);

    // draw semi-transparent panel for text
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    const pad = 80; const panelH = 420;
    roundRect(ctx, pad, h - panelH - 160, w - pad*2, panelH, 28, true, false);

    // cover art (square) on top-left of panel
    const coverSize = 360;
    const coverX = pad + 30; const coverY = h - panelH - 120;
    try{
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = track?.cover || document.getElementById('coverArt')?.src || '';
      await new Promise((res,rej)=>{ img.onload = res; img.onerror = () => res(); });
      // rounded cover
      roundImage(ctx, img, coverX, coverY, coverSize, 16);
    }catch(e){ /* ignore image load errors */ }

    // Title text
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.font = 'bold 48px system-ui, Arial';
    const title = track?.title || 'A song from MoodSync\'d';
    wrapText(ctx, title, coverX + coverSize + 30, coverY + 60, w - (coverX + coverSize + 30) - pad - 30, 56);

    // small caption
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '20px system-ui, Arial';
    ctx.fillText("Listening on MoodSync'd", coverX + coverSize + 30, coverY + 60 + 140);

    return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  }

  // helpers for rounded rectangles and images
  function roundRect(ctx,x,y,w,h,r,fill,stroke){ if (typeof r==='undefined') r=5; ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); if(fill) ctx.fill(); if(stroke) ctx.stroke(); }
  function roundImage(ctx,img,x,y,size,r){ ctx.save(); const cx = x+size/2, cy = y+size/2; ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+size,y,x+size,y+size,r); ctx.arcTo(x+size,y+size,x,y+size,r); ctx.arcTo(x,y+size,x,y,r); ctx.arcTo(x,y,x+size,y,r); ctx.closePath(); ctx.clip(); if(img && img.width) ctx.drawImage(img,x,y,size,size); ctx.restore(); }
  function wrapText(ctx, text, x, y, maxWidth, lineHeight){ const words = text.split(' '); let line=''; for(let n=0;n<words.length;n++){ const testLine = line + words[n] + ' '; const metrics = ctx.measureText(testLine); if(metrics.width > maxWidth && n>0){ ctx.fillText(line, x, y); line = words[n] + ' '; y += lineHeight; } else { line = testLine; } } ctx.fillText(line, x, y); }

  if (shareInstagram) shareInstagram.addEventListener('click', async () => {
    const cur = state.queue[state.cursor];
    const title = cur?.title || 'a song';
    const caption = `Listening to "${title}" on MoodSync'd`;

    // 1) build story image
    let blob = null;
    try { blob = await createStoryImageBlob(cur); }
    catch(e){ console.warn('Could not create story image', e); }

    // 2) attempt Web Share with files (mobile modern browsers)
    if (blob && window.navigator && navigator.canShare && navigator.canShare({ files: [new File([blob], 'moodstory.png', { type: 'image/png' })] }) && navigator.share){
      try{
        await navigator.share({ files: [new File([blob], 'moodstory.png', { type: 'image/png' })], title, text: caption });
        if (shareModal) shareModal.classList.add('hidden');
        return;
      }catch(e){ console.warn('Web Share failed', e); }
    }

    // 3) Try opening Instagram deep link on mobile (best-effort); this won't attach the image
    const ua = navigator.userAgent || '';
    const isiOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    if (isAndroid){
      // attempt Android intent to open Instagram (may prompt user)
      try{
        window.location.href = 'intent://instagram.com/#Intent;package=com.instagram.android;scheme=https;end';
        if (shareModal) shareModal.classList.add('hidden');
        return;
      }catch(e){ /* ignore */ }
    }

    // 4) Fallback: copy caption to clipboard and open the generated image in a new tab so user can save and upload to Stories manually
    try{ if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(caption); }
    catch(e){ console.warn('Clipboard copy failed', e); }

    if (blob){
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      alert('Copied caption to clipboard and opened story image in a new tab. Save the image and add it to your Instagram Story, then paste the caption.');
    } else {
      // nothing else we can do
      window.open('https://www.instagram.com/', '_blank');
    }

    if (shareModal) shareModal.classList.add('hidden');
  });

  // Paint initial queue
  renderQueue();
}

// Run on player.html only
if (document.body.classList.contains('bg-gradient') && document.querySelector('.player-card')) {
  initPlayer();
}


