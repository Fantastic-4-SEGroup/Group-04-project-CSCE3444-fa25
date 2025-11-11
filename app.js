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

  // 1) persist unique favorite
  const k = keyOf(cur);
  const exists = state.favorites.some(t => keyOf(t) === k);
  if (!exists){
    state.favorites.push(cur);
    saveJSON('guest_favorites', state.favorites);
  }

  // 2) append a flagged copy to the end of the queue so it plays again later
  state.queue.push({ ...cur, fav: true });
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
  if (playPauseBtn) playPauseBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play().catch(()=>{});
      // user initiated play — reveal share immediately
      revealShareOnce();
    } else audio.pause();
  });
  if (skipBtn) skipBtn.addEventListener('click', nextTrack);
  if (newSongBtn) newSongBtn.addEventListener('click', newRandomSong);
  if (favoriteBtn) favoriteBtn.addEventListener('click', favoriteCurrent);
  if (newPick) newPick.addEventListener('click', () => {
    sessionStorage.removeItem('guest_mood');
    window.location.href = 'index.html';
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

  // Cancel/hide modal
  if (shareCancel) shareCancel.addEventListener('click', () => {
    if (shareModal) shareModal.classList.add('hidden');
  });

  // Perform Instagram share flow: copy text and open Instagram web
  if (shareInstagram) shareInstagram.addEventListener('click', async () => {
    const cur = state.queue[state.cursor];
    const title = cur?.title || 'a song';
    const shareText = `Listening to "${title}" on MoodSync'd`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
      } else {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = shareText;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch (e) {
      console.warn('Clipboard copy failed', e);
    }

    // Open Instagram web in a new tab/window. This is the most reliable client-side
    // approach for Instagram-only shares without server-side API access.
    try { window.open('https://www.instagram.com/', '_blank'); }
    catch (e) { console.warn('Could not open Instagram', e); }

    // hide modal after initiating the share
    if (shareModal) shareModal.classList.add('hidden');
  });

  // Paint initial queue
  renderQueue();
}

// Run on player.html only
if (document.body.classList.contains('bg-gradient') && document.querySelector('.player-card')) {
  initPlayer();
}


