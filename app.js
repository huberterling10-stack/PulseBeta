const API = window.BACKEND || 'https://pulsebeta.onrender.com';
let map, markers = [];
let currentLat = 52.2297, currentLng = 21.0122;
let socket;

async function init(){
  document.getElementById('mapBtn').onclick = ()=>{ showSection('map'); initMap(); };
  document.getElementById('addBtn').onclick = ()=>{ showSection('add'); };
  document.getElementById('locBtn').onclick = requestLocation;
  document.getElementById('publishBtn').onclick = publishPost;
  document.getElementById('joinRoomBtn').onclick = joinRoom;
  document.getElementById('sendMsgBtn').onclick = sendMessage;
  document.getElementById('chatBtn').onclick = ()=>{ showSection('chat'); };

  document.querySelectorAll('.emo').forEach(b=>b.onclick=()=>{ document.querySelectorAll('.emo').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); });

  await fetchFeed();
  setupSocket();
}

function showSection(name){
  document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));
  if(name==='map') document.getElementById('mapSection').classList.remove('hidden');
  if(name==='add') document.getElementById('addSection').classList.remove('hidden');
  if(name==='chat') document.getElementById('chatSection').classList.remove('hidden');
  document.getElementById('feedSection').classList.remove('hidden');
}

async function requestLocation(){
  if(!navigator.geolocation) return alert('Twoje urządzenie nie obsługuje geolokalizacji');
  navigator.geolocation.getCurrentPosition((p)=>{ currentLat=p.coords.latitude; currentLng=p.coords.longitude; alert('Lokalizacja ustawiona'); }, (e)=>{ alert('Błąd lokalizacji: '+e.message); }, {enableHighAccuracy:true, timeout:10000});
}

async function fetchFeed(){
  try{
    const res = await fetch(API + '/posts');
    const data = await res.json();
    const feed = document.getElementById('feed');
    feed.innerHTML='';
    if(data.posts && data.posts.length){
      data.posts.forEach(p=>{ const el=document.createElement('div'); el.className='feed-item'; el.innerHTML=`<div><strong>${p.nickname}</strong> ${p.mood}</div><div style="font-size:12px;color:#666">${p.city} • ${new Date(p.createdAt).toLocaleString()}</div><div>${p.text||''}</div>`; feed.appendChild(el); });
    }else{ feed.innerHTML='<div class="feed-item">Brak postów</div>'; }
  }catch(e){ console.error(e); }
}

function initMap(){
  if(map) return;
  map = L.map('map').setView([currentLat, currentLng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19}).addTo(map);
  loadMapMarkers();
}

async function loadMapMarkers(){
  try{
    const res = await fetch(API + '/map');
    const data = await res.json();
    if(data.posts && data.posts.length){
      data.posts.forEach(p=>{
        if(p.location && p.location.lat){
          const m = L.circleMarker([p.location.lat, p.location.lng], {radius:8, color: moodColor(p.mood)}).addTo(map);
          m.bindPopup(`<strong>${p.nickname}</strong> ${p.mood}<br/>${p.text||''}`);
          markers.push(m);
        }
      });
    }
  }catch(e){ console.error(e); }
}

function moodColor(m){
  const map = {'😌':'#4FC3F7','😔':'#90A4AE','🤩':'#FFD54F','😡':'#EF5350','❤️':'#F06292'};
  return map[m] || '#616161';
}

async function publishPost(){
  const nick = document.getElementById('nick').value || 'Anon';
  const city = document.getElementById('city').value || 'Nieznane';
  const text = document.getElementById('postText').value || '';
  const precise = document.getElementById('preciseLoc').checked;
  const emoEl = document.querySelector('.emo.selected');
  if(!emoEl) return alert('Wybierz emocję');
  const mood = emoEl.dataset.emo;
  let lat=null,lng=null;
  if(precise && navigator.geolocation){
    try{
      const pos = await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{timeout:8000}));
      lat=pos.coords.latitude; lng=pos.coords.longitude;
    }catch(e){ console.warn('geo fail', e); }
  }
  const file = document.getElementById('imageInput').files[0];
  let imageBase64 = null;
  if(file){
    imageBase64 = await readFileAsDataURL(file);
  }
  const payload = { nickname:nick, city, mood, text, lat, lng, preciseLoc: !!precise, imageBase64 };
  try{
    const res = await fetch(API + '/posts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const data = await res.json();
    alert('Opublikowano');
    fetchFeed();
    if(map) loadMapMarkers();
  }catch(e){ console.error(e); alert('Błąd publikacji'); }
}

function readFileAsDataURL(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }

// Socket.io chat & E2EE simulation
function setupSocket(){
  try{
    socket = io(API);
    socket.on('connect', ()=> console.log('socket connected', socket.id));
    socket.on('receive_message', (m)=>{
      // show encrypted payload (front end can attempt decryption if it knows key)
      const log = document.getElementById('chatLog');
      log.innerHTML += `<div><strong>${m.from}:</strong> ${m.encryptedText}</div>`;
      log.scrollTop = log.scrollHeight;
    });
  }catch(e){ console.warn('socket fail', e); }
}

function joinRoom(){ const room = document.getElementById('roomInput').value || 'room_test'; if(socket) socket.emit('join_room', { roomId: room }); alert('Dołączono do '+room); }
function sendMessage(){ const room = document.getElementById('roomInput').value || 'room_test'; const msg = document.getElementById('msgInput').value || ''; if(!socket) return alert('Brak połączenia socket'); const key = CryptoJS.SHA256(''+room + '::secret').toString(); const cipher = CryptoJS.AES.encrypt(msg, key).toString(); socket.emit('send_message', { roomId: room, from: socket.id, to: room, encryptedText: cipher }); document.getElementById('chatLog').innerHTML += `<div><strong>Ty:</strong> ${msg}</div>`; document.getElementById('msgInput').value=''; }

window.addEventListener('load', init);