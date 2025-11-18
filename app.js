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
    window.location.href = 'player.html';
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
      cover: track.artwork?.['150x150'] || 'images/default_album_icon.jpg',
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
      // open preview and clear modal
      window.open('share_preview.html', '_blank');
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
