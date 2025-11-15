// Setup screen logic: team creation, CSV parsing, localStorage save, demo data

const LOGO_URLS = [
  'https://i.ibb.co/1fQPB0f/red.png',
  'https://i.ibb.co/h1F4JQp/blue.png',
  'https://i.ibb.co/fnJtD1S/green.png',
  'https://i.ibb.co/GCws7Vq/orange.png',
  'https://i.ibb.co/vqZ6gNf/purple.png',
  'https://i.ibb.co/Jr5tCv6/yellow.png',
  'https://i.ibb.co/xYhMhgR/black.png',
  'https://i.ibb.co/QFkWQzW/white.png'
];

const LS_KEYS = {
  teams: 'teams',
  players: 'players',
  currentIndex: 'currentPlayerIndex'
};

const teamCountEl = document.getElementById('teamCount');
const teamsContainer = document.getElementById('teamsContainer');
const csvFile = document.getElementById('csvFile');
const csvPreview = document.getElementById('csvPreview');
const startBtn = document.getElementById('startAuction');
const loadDemo = document.getElementById('loadDemo');

function renderTeamInputs(){
  const count = parseInt(teamCountEl.value, 10);
  teamsContainer.innerHTML = '';
  for(let i=0;i<count;i++){
    const row = document.createElement('div');
    row.className = 'team-row';
    const logo = document.createElement('img');
    logo.src = LOGO_URLS[i];
    logo.className = 'team-logo';
    const input = document.createElement('input');
    input.className = 'input';
    input.placeholder = `Team ${i+1} name`;
    input.value = `Team ${i+1}`;
    row.appendChild(logo);
    row.appendChild(input);
    teamsContainer.appendChild(row);
  }
}

function parseCSV(text){
  // Simple CSV parser expecting header: name,category,basePrice,rating,photo
  const lines = text.split(/\r?\n/).filter(l=>l.trim().length);
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map(h=>h.trim().toLowerCase());
  const idx = {
    name: header.indexOf('name'),
    category: header.indexOf('category'),
    basePrice: header.indexOf('baseprice'),
    rating: header.indexOf('rating'),
    photo: header.indexOf('photo'),
  };
  const out = [];
  for(let i=1;i<lines.length;i++){
    const cols = lines[i].split(',');
    if (!cols.length) continue;
    const obj = {
      id: crypto.randomUUID(),
      name: (cols[idx.name]||'').trim(),
      category: (cols[idx.category]||'').trim(),
      basePrice: Number((cols[idx.basePrice]||'0').trim()),
      rating: Number((cols[idx.rating]||'0').trim()),
      photo: (cols[idx.photo]||'').trim(),
    };
    if (obj.name) out.push(obj);
  }
  return out;
}

let parsedPlayers = [];

csvFile?.addEventListener('change', async ()=>{
  const file = csvFile.files[0];
  if (!file) return;
  const text = await file.text();
  parsedPlayers = parseCSV(text);
  csvPreview.textContent = `${parsedPlayers.length} players loaded`;
});

function createTeams(){
  const count = parseInt(teamCountEl.value, 10);
  const inputs = [...teamsContainer.querySelectorAll('input')];
  const teams = inputs.slice(0,count).map((inp, i)=> ({
    id: 't'+(i+1),
    name: inp.value.trim() || `Team ${i+1}`,
    logo: LOGO_URLS[i],
    purse: 500000000, // 50 Cr in rupees
    players: []
  }));
  return teams;
}

function saveAndStart(){
  const teams = createTeams();
  const players = parsedPlayers.length ? parsedPlayers : demoPlayers();
  localStorage.setItem(LS_KEYS.teams, JSON.stringify(teams));
  localStorage.setItem(LS_KEYS.players, JSON.stringify(players));
  localStorage.setItem(LS_KEYS.currentIndex, '0');
  window.location.href = '/auction-live.html';
}

function demoPlayers(){
  return [
    {id:crypto.randomUUID(), name:'Virat Kohli', category:'Batsman', basePrice:20000000, rating:10, photo:'https://images.unsplash.com/photo-1549646033-ec93f22d73b1?q=80&w=1200&auto=format&fit=crop'},
    {id:crypto.randomUUID(), name:'Hardik Pandya', category:'All Rounder', basePrice:15000000, rating:9, photo:'https://images.unsplash.com/photo-1547106634-56dcd53ae883?q=80&w=1200&auto=format&fit=crop'},
    {id:crypto.randomUUID(), name:'MS Dhoni', category:'Wicket Keeper', basePrice:20000000, rating:9, photo:'https://images.unsplash.com/photo-1516567727245-06e525fcb346?q=80&w=1200&auto=format&fit=crop'},
    {id:crypto.randomUUID(), name:'Jasprit Bumrah', category:'Fast Bowler', basePrice:12000000, rating:9, photo:'https://images.unsplash.com/photo-1609175874318-81e4a4f2c9ae?q=80&w=1200&auto=format&fit=crop'},
    {id:crypto.randomUUID(), name:'Rashid Khan', category:'Spinner', basePrice:12000000, rating:9, photo:'https://images.unsplash.com/photo-1517959105821-eaf2591984dd?q=80&w=1200&auto=format&fit=crop'}
  ];
}

startBtn?.addEventListener('click', saveAndStart);

loadDemo?.addEventListener('click', ()=>{
  parsedPlayers = demoPlayers();
  csvPreview.textContent = `${parsedPlayers.length} demo players loaded`;
});

renderTeamInputs();
teamCountEl?.addEventListener('change', renderTeamInputs);
