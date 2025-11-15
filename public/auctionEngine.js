// Auction Engine for Live Screen
// Handles: data load, player rotation, bidding logic, timer, teams UI, modal

const LS_KEYS = {
  teams: 'teams',
  players: 'players',
  currentIndex: 'currentPlayerIndex',
};

const COLORS = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
};

let teams = JSON.parse(localStorage.getItem(LS_KEYS.teams) || '[]');
let players = JSON.parse(localStorage.getItem(LS_KEYS.players) || '[]');
let currentIndex = parseInt(localStorage.getItem(LS_KEYS.currentIndex) || '0', 10);

// State
let currentBid = 0; // in Rupees
let leadingTeamId = null;
let timer = null;
let timeLeft = 15;
const FULL_DASH = 2 * Math.PI * 80; // circumference for r=80

// Elements
const playerPhoto = document.getElementById('playerPhoto');
const playerName = document.getElementById('playerName');
const playerCategory = document.getElementById('playerCategory');
const playerBase = document.getElementById('playerBase');
const playerRating = document.getElementById('playerRating');
const currentBidEl = document.getElementById('currentBid');
const soldStamp = document.getElementById('soldStamp');
const unsoldStamp = document.getElementById('unsoldStamp');

const timerCircle = document.getElementById('timerCircle');
const timeText = document.getElementById('timeText');

const teamsGrid = document.getElementById('teamsGrid');

const skipBtn = document.getElementById('skipBtn');
const nextBtn = document.getElementById('nextBtn');

const modalBackdrop = document.getElementById('modalBackdrop');
const openRemaining = document.getElementById('openRemaining');
const closeModal = document.getElementById('closeModal');
const remainingList = document.getElementById('remainingList');
const filterRow = document.getElementById('filterRow');

function formatCr(amount) {
  // amount in rupees, return Cr string
  const cr = amount / 10000000; // 1 Cr = 10,000,000
  return cr.toFixed(2) + ' Cr';
}

function formatL(amount) {
  const l = amount / 100000; // 1 L = 100,000
  return l.toFixed(2) + ' L';
}

function parseNumber(x){
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function getIncrement(amount){
  // amount is current bid in rupees
  const cr = amount / 10000000;
  if (cr < 1) return 2500000; // 25L
  if (cr >= 1 && cr <= 5) return 2500000; // 25L
  if (cr > 5 && cr <= 10) return 5000000; // 50L
  return 10000000; // 1Cr
}

function showStamp(type){
  const el = type === 'sold' ? soldStamp : unsoldStamp;
  el.classList.remove('show');
  // trigger reflow
  void el.offsetWidth;
  el.classList.add('show');
}

function updateTimerColor(){
  if (timeLeft > 10) timerCircle.setAttribute('stroke', COLORS.green);
  else if (timeLeft > 5) timerCircle.setAttribute('stroke', COLORS.yellow);
  else timerCircle.setAttribute('stroke', COLORS.red);
}

function resetTimer(){
  clearInterval(timer);
  timeLeft = 15;
  timeText.textContent = timeLeft;
  timerCircle.setAttribute('stroke-dasharray', FULL_DASH);
  timerCircle.setAttribute('stroke-dashoffset', '0');
  updateTimerColor();
  timer = setInterval(()=>{
    timeLeft -= 1;
    if (timeLeft < 0){
      clearInterval(timer);
      onTimerEnd();
      return;
    }
    timeText.textContent = Math.max(0,timeLeft);
    const progress = (15 - timeLeft) / 15;
    timerCircle.setAttribute('stroke-dashoffset', String(FULL_DASH * progress));
    updateTimerColor();
  }, 1000);
}

function onTimerEnd(){
  if (leadingTeamId == null){
    // UNSOLD
    const p = players[currentIndex];
    p.status = 'UNSOLD';
    showStamp('unsold');
    savePlayers();
  } else {
    // SOLD
    const p = players[currentIndex];
    p.status = 'SOLD';
    p.soldPrice = currentBid;
    p.teamId = leadingTeamId;
    // Deduct purse, add player to team
    const t = teams.find(t=>t.id===leadingTeamId);
    t.purse = Math.max(0, parseNumber(t.purse) - currentBid);
    t.players = t.players || [];
    t.players.push({ id: p.id || crypto.randomUUID(), name:p.name, category:p.category, price: currentBid, photo:p.photo });
    showStamp('sold');
    saveTeams();
    savePlayers();
    renderTeams();
  }
}

function saveTeams(){ localStorage.setItem(LS_KEYS.teams, JSON.stringify(teams)); }
function savePlayers(){ localStorage.setItem(LS_KEYS.players, JSON.stringify(players)); }
function saveIndex(){ localStorage.setItem(LS_KEYS.currentIndex, String(currentIndex)); }

function renderTeams(){
  teamsGrid.innerHTML = '';
  teams.forEach(t => {
    const playerCount = (t.players?.length || 0);
    const el = document.createElement('div');
    el.className = 'team-card';
    el.innerHTML = `
      <img src="${t.logo}" alt="logo" class="team-logo"/>
      <div>
        <div style="font-weight:800">${t.name}</div>
        <div class="team-meta">Purse: <span class="team-purse">${formatCr(parseNumber(t.purse))}</span> • ${playerCount}/15</div>
      </div>
    `;
    el.addEventListener('click', ()=> onBid(t.id));
    teamsGrid.appendChild(el);
  });
}

function starsHTML(rating){
  const r = Math.max(0, Math.min(10, parseInt(rating||'0',10)));
  let s='';
  for(let i=0;i<10;i++) s += i<r ? '★' : '☆';
  return s;
}

function loadPlayer(){
  const p = players[currentIndex];
  if (!p){
    // Auction finished
    playerName.textContent = 'All players processed';
    playerPhoto.src = 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?q=80&w=1200&auto=format&fit=crop';
    playerCategory.textContent = '';
    playerBase.textContent = '';
    playerRating.innerHTML = '';
    currentBidEl.textContent = '';
    clearInterval(timer);
    return;
  }
  leadingTeamId = null;
  currentBid = parseNumber(p.basePrice);
  currentBidEl.textContent = formatCr(currentBid);
  playerName.textContent = p.name;
  playerCategory.textContent = p.category;
  playerBase.textContent = formatCr(parseNumber(p.basePrice));
  playerPhoto.src = p.photo || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1200&auto=format&fit=crop';
  playerRating.textContent = starsHTML(p.rating);
  resetTimer();
}

function onBid(teamId){
  const p = players[currentIndex];
  if (!p) return;
  const team = teams.find(t=>t.id===teamId);
  const nextBid = currentBid === 0 ? parseNumber(p.basePrice) : currentBid + getIncrement(currentBid);
  if (nextBid > parseNumber(team.purse)){
    // ignore if not enough purse
    return;
  }
  currentBid = nextBid;
  leadingTeamId = teamId;
  currentBidEl.textContent = formatCr(currentBid);
  resetTimer();
}

function nextPlayer(){
  clearInterval(timer);
  currentIndex += 1;
  saveIndex();
  loadPlayer();
  renderRemaining();
}

function skipPlayer(){
  const p = players[currentIndex];
  if (p){ p.status = 'UNSOLD'; savePlayers(); }
  nextPlayer();
  showStamp('unsold');
}

// Remaining players modal
const CATEGORIES = ['Batsman','All Rounder','Wicket Keeper','Fast Bowler','Spinner'];
let activeFilter = 'All';

function renderFilters(){
  filterRow.innerHTML = '';
  const all = document.createElement('button');
  all.className = 'chip' + (activeFilter==='All'?' active':'');
  all.textContent = 'All';
  all.onclick = ()=>{ activeFilter='All'; renderFilters(); renderRemaining(); };
  filterRow.appendChild(all);
  CATEGORIES.forEach(cat=>{
    const b = document.createElement('button');
    b.className = 'chip' + (activeFilter===cat?' active':'');
    b.textContent = cat;
    b.onclick = ()=>{ activeFilter=cat; renderFilters(); renderRemaining(); };
    filterRow.appendChild(b);
  });
}

function renderRemaining(){
  remainingList.innerHTML = '';
  const list = players.filter((p,idx)=> idx>=currentIndex && p.status!=='SOLD');
  list.forEach(p=>{
    if (activeFilter!=='All' && p.category !== activeFilter) return;
    const el = document.createElement('div');
    el.className = 'player-item';
    el.innerHTML = `
      <img src="${p.photo}" alt="${p.name}"/>
      <div>
        <div style="font-weight:800">${p.name}</div>
        <div class="team-meta">${p.category} • Base: ${formatCr(parseNumber(p.basePrice))}</div>
      </div>
    `;
    remainingList.appendChild(el);
  });
}

function initTilt(){
  const card = document.getElementById('playerCard');
  card.addEventListener('mousemove', (e)=>{
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width/2;
    const cy = rect.top + rect.height/2;
    const dx = (e.clientX - cx)/rect.width; // -0.5..0.5
    const dy = (e.clientY - cy)/rect.height;
    card.style.transform = `rotateY(${dx*6}deg) rotateX(${-dy*6}deg) translateY(-2px) scale(1.01)`;
  });
  card.addEventListener('mouseleave', ()=>{
    card.style.transform = '';
  });
}

function ensureDefaults(){
  if (!Array.isArray(teams) || teams.length===0 || !Array.isArray(players) || players.length===0){
    // Fallback demo data
    const logos = [
      'https://i.ibb.co/1fQPB0f/red.png',
      'https://i.ibb.co/h1F4JQp/blue.png',
      'https://i.ibb.co/fnJtD1S/green.png',
      'https://i.ibb.co/GCws7Vq/orange.png',
      'https://i.ibb.co/vqZ6gNf/purple.png',
      'https://i.ibb.co/Jr5tCv6/yellow.png',
      'https://i.ibb.co/xYhMhgR/black.png',
      'https://i.ibb.co/QFkWQzW/white.png'
    ];
    teams = Array.from({length:4}).map((_,i)=>({id:'t'+(i+1), name:'Team '+(i+1), logo:logos[i], purse:500000000, players:[]}));
    players = [
      {name:'Virat Kohli', category:'Batsman', basePrice:20000000, rating:10, photo:'https://images.unsplash.com/photo-1549646033-ec93f22d73b1?q=80&w=1200&auto=format&fit=crop'},
      {name:'Hardik Pandya', category:'All Rounder', basePrice:15000000, rating:9, photo:'https://images.unsplash.com/photo-1547106634-56dcd53ae883?q=80&w=1200&auto=format&fit=crop'},
      {name:'MS Dhoni', category:'Wicket Keeper', basePrice:20000000, rating:9, photo:'https://images.unsplash.com/photo-1516567727245-06e525fcb346?q=80&w=1200&auto=format&fit=crop'},
      {name:'Jasprit Bumrah', category:'Fast Bowler', basePrice:12000000, rating:9, photo:'https://images.unsplash.com/photo-1609175874318-81e4a4f2c9ae?q=80&w=1200&auto=format&fit=crop'},
      {name:'Rashid Khan', category:'Spinner', basePrice:12000000, rating:9, photo:'https://images.unsplash.com/photo-1517959105821-eaf2591984dd?q=80&w=1200&auto=format&fit=crop'}
    ];
    localStorage.setItem(LS_KEYS.teams, JSON.stringify(teams));
    localStorage.setItem(LS_KEYS.players, JSON.stringify(players));
    localStorage.setItem(LS_KEYS.currentIndex, '0');
  }
}

function boot(){
  ensureDefaults();
  renderTeams();
  renderFilters();
  renderRemaining();
  loadPlayer();
  initTilt();
}

// Wire events
skipBtn.addEventListener('click', skipPlayer);
nextBtn.addEventListener('click', nextPlayer);
openRemaining.addEventListener('click', ()=>{ modalBackdrop.style.display='flex'; renderRemaining(); });
closeModal.addEventListener('click', ()=>{ modalBackdrop.style.display='none'; });
modalBackdrop.addEventListener('click', (e)=>{ if (e.target===modalBackdrop) modalBackdrop.style.display='none'; });

// start
boot();
