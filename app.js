const STORAGE_KEY = 'gridiron-assignor-v2';
const roles = ['Referee','Umpire','Head Line Judge','Line Judge','Back Judge','Side Judge','Field Judge'];
const auxiliaryRoles = ['Play Clock','Box','Chain 1','Chain 2'];
const defaults = {
  organization: { name: 'Lone Star Football Officials', region: 'Texas' },
  session: { personId: 9001, role: 'assignor' },
  users: [
    { id: 9001, name: 'Alex Morgan', role: 'assignor' },
    { id: 1, name: 'Marcus Reynolds', role: 'official' },
    { id: 8, name: 'Lena Ortiz', role: 'auxiliary' }
  ],
  officials: [
    {id:1,name:'Marcus Reynolds',zip:'75201',years:14,type:'official'}, {id:2,name:'David Chen',zip:'75001',years:9,type:'official'},
    {id:3,name:'Thomas Brooks',zip:'76010',years:18,type:'official'}, {id:4,name:'Andre Williams',zip:'77002',years:7,type:'official'},
    {id:5,name:'Eli Garza',zip:'78701',years:5,type:'official'}, {id:6,name:'Raymond Price',zip:'75052',years:11,type:'official'},
    {id:7,name:'Jordan King',zip:'76102',years:3,type:'official'}, {id:8,name:'Lena Ortiz',zip:'75204',years:4,type:'auxiliary'},
    {id:9,name:'Chris Flores',zip:'75080',years:6,type:'auxiliary'}, {id:10,name:'Maya Patel',zip:'76011',years:2,type:'auxiliary'}
  ],
  games: [
    {id:101,date:'2026-10-02',time:'19:00',home:'Highland Park',away:'Rockwall',venue:'Highlander Stadium',zip:'75205',region:'North',level:'Varsity',crewSize:7,auxiliary:4,assignments:{}},
    {id:102,date:'2026-10-02',time:'19:30',home:'Allen',away:'McKinney',venue:'Eagle Stadium',zip:'75002',region:'North',level:'Varsity',crewSize:7,auxiliary:5,assignments:{'Referee':1,'Umpire':2,'Head Line Judge':3}},
    {id:103,date:'2026-10-01',time:'18:00',home:'Arlington Lamar',away:'Martin',venue:'Cravens Field',zip:'76011',region:'West',level:'Sub-varsity',crewSize:5,auxiliary:0,assignments:{'Referee':6,'Umpire':7}},
    {id:104,date:'2026-10-03',time:'10:00',home:'North Dallas Youth',away:'Plano Youth',venue:'Moss Park',zip:'75229',region:'North',level:'Youth',crewSize:3,auxiliary:4,assignments:{}},
    {id:105,date:'2026-10-03',time:'18:30',home:'Texas Wesleyan',away:'Southwestern',venue:'Farrington Field',zip:'76107',region:'West',level:'College',crewSize:6,auxiliary:5,assignments:{'Referee':3,'Umpire':6,'Head Line Judge':2,'Line Judge':1}}
  ], crews: [], interests: [], availabilityBlocks: []
};
let state = load();
let previewMode = currentUser().role === 'assignor' ? 'assignor' : 'official';
function load(){
  try {
    const legacy = JSON.parse(localStorage.getItem(STORAGE_KEY)) || JSON.parse(localStorage.getItem('gridiron-assignor-v1'));
    const saved = legacy || structuredClone(defaults);
    saved.organization ??= structuredClone(defaults.organization);
    saved.users ??= structuredClone(defaults.users);
    saved.session ??= structuredClone(defaults.session);
    saved.crews ??= []; saved.interests ??= []; saved.availabilityReports ??= []; saved.availabilityBlocks ??= [];
    saved.games ??= []; saved.officials ??= [];
    saved.games.forEach(g=>{
      g.assignments ??= {}; g.assignmentStatus ??= {};
      if(g.assignments?.['Head Linesman']){g.assignments['Head Line Judge']=g.assignments['Head Linesman'];delete g.assignments['Head Linesman'];}
      // Migrate the previous prototype's external-confirmation states.
      const legacyStatus=g['zebra'+'Status'] || {};
      Object.entries(legacyStatus).forEach(([role,status])=>g.assignmentStatus[role]=status==='accepted'?'accepted':status==='entered'?'pending_acceptance':'proposed');
      delete g['zebra'+'Status'];
    });
    return saved;
  } catch { return structuredClone(defaults); }
}
function save(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); render(); }
function uid(){ return Date.now()+Math.floor(Math.random()*999); }
function fmtDate(date){ const d = new Date(date+'T12:00:00'); return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}); }
function fmtTime(time){ const [h,m]=time.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`; }
function auxiliaryCount(game){ return game.auxiliary ?? (game.aux ? 4 : 0); }
function gameRoles(game){ const aux=auxiliaryCount(game); return [...roles.slice(0,game.crewSize),...(aux===5?['Game Clock',...auxiliaryRoles]:aux===4?auxiliaryRoles:[])]; }
function crewLabel(game){ const aux=auxiliaryCount(game); return `${game.crewSize}${aux?` + ${aux}`:''}`; }
function assignedCount(game){ return Object.keys(game.assignments).length; }
function person(id){ return state.officials.find(o=>o.id===Number(id)); }
function currentUser(){ return state.users.find(u=>u.id===Number(state.session?.personId)) || state.users[0]; }
function isAssignor(){ return currentUser().role==='assignor'; }
function assignmentStatus(game, role){ return game.assignmentStatus?.[role] || 'proposed'; }
function setAssignmentStatus(game, role, status){ game.assignmentStatus ??= {}; game.assignmentStatus[role]=status; }
function activeAssignment(game, role){ return game.assignments[role] && !['turned_back','cancelled'].includes(assignmentStatus(game,role)); }
function initials(name){ return name.split(' ').map(x=>x[0]).join('').slice(0,2); }
function zipDistance(a,b){ if(!/^\d{5}$/.test(String(a))||!/^\d{5}$/.test(String(b))) return 999; const n=Math.abs(Number(a)-Number(b)); return Math.max(4, Math.min(190, Math.round(n/8.5)+Math.abs(String(a).slice(-2)-String(b).slice(-2))*2)); }
function isBusy(officialId, game){ return state.games.some(g=>g.id!==game.id && g.date===game.date && Object.entries(g.assignments).some(([role,id])=>Number(id)===Number(officialId)&&activeAssignment(g,role))); }
function isAvailable(officialId, game){
  const report=state.availabilityReports.find(r=>r.date===game.date);
  if(report && !report.officialIds.includes(Number(officialId))) return false;
  const gameStart=game.time || '00:00';
  return !state.availabilityBlocks.some(block=>block.personId===Number(officialId)&&block.date===game.date&&(
    block.allDay || (!block.start || !block.end) || (gameStart>=block.start&&gameStart<=block.end)
  ));
}
function qualificationScore(official, role){ if(official.type==='auxiliary') return 0; const classPoints={'Division 1':18,'Division 2':11,'Division 5':4}[official.classification]||0; return classPoints+(official.primaryPosition===role?25:0)+(official.secondaryPosition===role?10:0); }
function staffStatus(game){ const a=assignedCount(game), total=gameRoles(game).length; return {a,total,full:a===total}; }
function openings(){ return state.games.flatMap(game=>gameRoles(game).filter(role=>!game.assignments[role]).map(role=>({game,role}))); }
function requestedInterest(gameId,role){ return state.interests.filter(i=>i.gameId===gameId&&i.role===role&&i.status==='requested'); }
function render(){ renderMetrics(); renderAttention(); renderGames(); renderOfficials(); renderOpenings(); renderHandoff(); renderMyAssignments(); const gameCount=document.querySelector('#gameCount'), officialCount=document.querySelector('#officialCount'), demoUserSelect=document.querySelector('#demoUserSelect'); if(gameCount) gameCount.textContent=state.games.length; if(officialCount) officialCount.textContent=state.officials.length; if(demoUserSelect) demoUserSelect.value=String(currentUser().id); }
function renderMetrics(){ const games=state.games, assigned=games.reduce((n,g)=>n+assignedCount(g),0), required=games.reduce((n,g)=>n+gameRoles(g).length,0), open=required-assigned, full=games.filter(g=>staffStatus(g).full).length; document.querySelector('#metrics').innerHTML=`<article class="metric"><small>GAMES THIS WEEK</small><strong>${games.length}</strong></article><article class="metric"><small>OPEN POSITIONS</small><strong class="${open?'warn':'good'}">${open}</strong></article><article class="metric"><small>FULLY STAFFED</small><strong class="good">${full}</strong></article><article class="metric"><small>ASSIGNMENT RATE</small><strong>${required?Math.round(assigned/required*100):0}%</strong></article>`; }
function renderAttention(){ const filter=document.querySelector('#levelFilter').value; const games=state.games.filter(g=>!filter||g.level===filter).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)); const root=document.querySelector('#attentionGames'); if(!games.length){root.innerHTML='<div class="empty">No games match this filter.</div>';return;} root.innerHTML=games.map(g=>{const s=staffStatus(g), percent=Math.round(s.a/s.total*100);return `<article class="game-card ${s.full?'full':''}"><div class="date-block"><b>${fmtDate(g.date)}</b>${fmtTime(g.time)}</div><div class="matchup">${g.away} <span class="subtle">at</span> ${g.home}<small>${g.level} · ${g.region||'Unassigned region'} · ${crewLabel(g)} positions</small></div><div class="venue">${g.venue}<br />ZIP ${g.zip}</div><div class="staffing"><b>${s.a} of ${s.total} positions filled</b><div class="progress"><span style="width:${percent}%"></span></div></div><button class="assign-button" onclick="openAssign(${g.id})">${s.full?'View crew':'Assign crew'}</button></article>`;}).join(''); }
function renderGames(){ document.querySelector('#gamesTable').innerHTML=state.games.map(g=>{const s=staffStatus(g);return `<tr><td><div class="game-title">${g.away} at ${g.home}</div><div class="subtle">${g.level} · ${g.region||'No region'}</div></td><td>${fmtDate(g.date)}<div class="subtle">${fmtTime(g.time)}</div></td><td>${g.venue}<div class="subtle">${g.zip}</div></td><td>${crewLabel(g)} · ${s.a} / ${s.total}</td><td><span class="pill ${s.full?'full':'open'}">${s.full?'Staffed':'Open'}</span></td><td><button class="table-button" onclick="openAssign(${g.id})">Manage</button></td></tr>`;}).join(''); }
function handoffLabel(status){ return ({proposed:'Proposed',pending_acceptance:'Awaiting response',accepted:'Accepted',turned_back:'Turned back'})[status]||'Proposed'; }
function renderHandoff(){
  const rows=state.games.flatMap(g=>Object.entries(g.assignments).map(([role,officialId])=>({g,role,official:person(officialId),status:assignmentStatus(g,role)})));
  const count=document.querySelector('#handoffCount'); if(count) count.textContent=rows.filter(x=>x.status!=='accepted').length;
  const table=document.querySelector('#handoffTable'); if(!table) return;
  table.innerHTML=rows.length?rows.map(({g,role,official,status})=>`<tr><td><div class="game-title">${g.away} at ${g.home}</div><div class="subtle">${fmtDate(g.date)} · ${fmtTime(g.time)}</div></td><td>${role}</td><td>${official?.name||'Unknown'}</td><td>${isAssignor()?`<select class="handoff-select" onchange="setHandoffStatus(${g.id},'${role}',this.value)"><option value="proposed" ${status==='proposed'?'selected':''}>Proposed</option><option value="pending_acceptance" ${status==='pending_acceptance'?'selected':''}>Awaiting response</option><option value="accepted" ${status==='accepted'?'selected':''}>Accepted</option><option value="turned_back" ${status==='turned_back'?'selected':''}>Turned back</option></select>`:`<span class="pill ${status==='accepted'?'full':'open'}">${handoffLabel(status)}</span>`}</td><td>${isAssignor()?`<button class="table-button" onclick="reopenPosition(${g.id},'${role}')">Reopen</button>`:''}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">There are no assignments yet.</td></tr>';
}
function renderOpenings(){
  const items=openings(),root=document.querySelector('#openingsList');
  const openingCount=document.querySelector('#openingCount'); if(openingCount) openingCount.textContent=items.length;
  const assignorView=previewMode==='assignor';
  const mode=document.querySelector('#modeIndicator'); if(mode) mode.textContent=assignorView?'Assignor workspace':`${currentUser().name}'s portal`;
  const heading=document.querySelector('#openingsHeading'); if(heading) heading.textContent=assignorView?'Open positions':'Available openings';
  const description=document.querySelector('#openingsDescription'); if(description) description.textContent=assignorView?'Review interested people and make the assignment.':'Express interest only. An assignor makes every assignment.';
  root.innerHTML=items.length?items.map(({game,role})=>{
    const count=requestedInterest(game.id,role).length;
    const candidate=currentUser();
    const roleType=['Game Clock',...auxiliaryRoles].includes(role)?'auxiliary':'official';
    const eligible=!assignorView && candidate.role===roleType && isAvailable(candidate.id,game) && !isBusy(candidate.id,game);
    const alreadyInterested=state.interests.some(i=>i.gameId===game.id&&i.role===role&&i.officialId===candidate.id&&i.status==='requested');
    const button=assignorView?(count?'Review requests':'No requests yet'):alreadyInterested?'Interest recorded':eligible?'Express interest':'Not eligible';
    const action=assignorView?`openRequests(${game.id},'${role}')`:eligible&&!alreadyInterested?`openInterestRequest(${game.id},'${role}')`:'';
    return `<article class="game-card"><div class="date-block"><b>${fmtDate(game.date)}</b>${fmtTime(game.time)}</div><div class="matchup">${role}<small>${game.away} at ${game.home} · ${game.level}</small></div><div class="venue">${game.venue}<br />${game.region||'No region'} · ZIP ${game.zip}</div><div class="staffing"><b>${count} interested person${count===1?'':'s'}</b><div class="subtle">${assignorView?'Assignor approval required':eligible?'No self-assignment':'Availability or role conflict'}</div></div><button class="assign-button" ${action?`onclick="${action}"`: 'disabled'}>${button}</button></article>`;
  }).join(''):'<div class="empty">Every position is staffed.</div>';
}
function renderOfficials(){ const crewNote=state.crews.length?`<article class="crew-summary"><h3>${state.crews.length} crews saved</h3><p>Crew role maps stay together so the assignor can make crew-aware recommendations.</p></article>`:''; const root=document.querySelector('#officialsGrid'); if(root) root.innerHTML=state.officials.map(o=>`<article class="official-card"><header><div class="person"><span class="avatar">${initials(o.name)}</span><div><b>${o.name}</b><small>${o.classification||'Unclassified'} · ${o.primaryPosition||'Position not entered'}</small></div></div><span class="type-tag">${o.type}</span></header><div class="person-detail"><span>Experience<br /><b>${o.years} years</b></span><span>Home ZIP<br /><b>${o.zip||'Not entered'}</b></span></div></article>`).join('')+crewNote; }
function renderMyAssignments(){
  const root=document.querySelector('#myAssignmentsList'); if(!root) return;
  const user=currentUser();
  const assignments=state.games.flatMap(game=>Object.entries(game.assignments).filter(([,id])=>Number(id)===Number(user.id)).map(([role])=>({game,role,status:assignmentStatus(game,role)})));
  root.innerHTML=assignments.length?assignments.map(({game,role,status})=>`<article class="game-card"><div class="date-block"><b>${fmtDate(game.date)}</b>${fmtTime(game.time)}</div><div class="matchup">${role}<small>${game.away} at ${game.home} · ${game.level}</small></div><div class="venue">${game.venue}<br />${handoffLabel(status)}</div><div class="staffing">${status==='pending_acceptance'?'<b>Action needed</b><div class="subtle">Confirm your availability</div>':'<b>No action needed</b>'}</div>${status==='pending_acceptance'?`<div><button class="table-button" onclick="respondToAssignment(${game.id},'${role}','accepted')">Accept</button><button class="table-button" onclick="respondToAssignment(${game.id},'${role}','turned_back')">Turn back</button></div>`:''}</article>`).join(''):'<div class="empty">No assignments for this demo user.</div>';
}
function showModal(content){ document.querySelector('#modalContent').innerHTML=content; document.querySelector('#modal').showModal(); }
function closeModal(){ document.querySelector('#modal').close(); }
function openGameForm(){ if(!isAssignor()){toast('Only an assignor can add games.');return;} showModal(`<h2 class="modal-title">Add a game</h2><p class="modal-subtitle">Set the exact crew and support positions required for this game.</p><div class="form-grid"><label class="field">DATE<input name="date" type="date" required value="2026-10-02"></label><label class="field">KICKOFF<input name="time" type="time" required value="19:00"></label><label class="field">HOME TEAM<input name="home" required placeholder="e.g. Highland Park"></label><label class="field">AWAY TEAM<input name="away" required placeholder="e.g. Rockwall"></label><label class="field wide">VENUE<input name="venue" required placeholder="Stadium or field name"></label><label class="field">VENUE ZIP<input name="zip" pattern="[0-9]{5}" required placeholder="75201"></label><label class="field">REGION<select name="region"><option>North</option><option>South</option><option>East</option><option>West</option></select></label><label class="field">LEVEL<select name="level"><option>Varsity</option><option>Sub-varsity</option><option>Youth</option><option>College</option></select></label><label class="field">CREW SIZE<select name="crewSize">${[3,4,5,6,7].map(n=>`<option value="${n}" ${n===5?'selected':''}>${n}-person</option>`).join('')}</select></label><label class="field">AUXILIARY<select name="auxiliary"><option value="0">None</option><option value="4">4: Play Clock, Box, Chains</option><option value="5" selected>5: Game/Play Clock, Box, Chains</option></select></label></div><div class="modal-actions"><button class="secondary" type="button" onclick="closeModal()">Cancel</button><button class="primary" value="default" id="saveGame">Add game</button></div>`); document.querySelector('#modalForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);state.games.push({id:uid(),date:f.get('date'),time:f.get('time'),home:f.get('home'),away:f.get('away'),venue:f.get('venue'),zip:f.get('zip'),region:f.get('region'),level:f.get('level'),crewSize:Number(f.get('crewSize')),auxiliary:Number(f.get('auxiliary')),assignments:{}});save();closeModal();toast('Game added to the board.');}; }
function openOfficialForm(){ if(!isAssignor()){toast('Only an assignor can manage the roster.');return;} showModal(`<h2 class="modal-title">Add a person</h2><p class="modal-subtitle">Officials and auxiliary workers are managed from one roster.</p><div class="form-grid"><label class="field wide">FULL NAME<input name="name" required placeholder="First and last name"></label><label class="field">HOME ZIP<input name="zip" pattern="[0-9]{5}" required placeholder="75201"></label><label class="field">YEARS WORKED<input name="years" type="number" min="0" required value="1"></label><label class="field wide">TYPE<select name="type"><option value="official">Official</option><option value="auxiliary">Auxiliary</option></select></label></div><div class="modal-actions"><button class="secondary" type="button" onclick="closeModal()">Cancel</button><button class="primary" value="default">Add person</button></div>`);document.querySelector('#modalForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);state.officials.push({id:uid(),name:f.get('name'),zip:f.get('zip'),years:Number(f.get('years')),type:f.get('type')});save();closeModal();toast('Added to roster.');}; }
function openAssign(id){
  if(!isAssignor()){ toast('Only an assignor can make assignments.'); return; }
  const game=state.games.find(g=>g.id===id); const open=gameRoles(game).filter(r=>!game.assignments[r]);
  const chips=gameRoles(game).map(r=>`<span class="assignment-chip ${game.assignments[r]?'':'empty-chip'}"><b>${r}</b>${game.assignments[r]?`${person(game.assignments[r]).name} · ${handoffLabel(assignmentStatus(game,r))}`:'Open'}</span>`).join('');
  showModal(`<h2 class="modal-title">${game.away} at ${game.home}</h2><p class="modal-subtitle">${fmtDate(game.date)} · ${fmtTime(game.time)} · ${game.venue}</p><div class="assignment-list">${chips}</div>${open.length?`<label class="field">OPEN POSITION<select id="roleSelect">${open.map(r=>`<option>${r}</option>`).join('')}</select></label><div class="candidates" id="candidates"></div>`:'<div class="callout"><strong>Crew complete</strong><p>Every required position is staffed.</p></div>'}`);
  if(open.length){ renderCandidates(game,open[0]);document.querySelector('#roleSelect').onchange=e=>renderCandidates(game,e.target.value); }
}
function openInterestRequest(gameId,role){
  const game=state.games.find(g=>g.id===gameId), candidate=currentUser(), auxiliary=['Game Clock',...auxiliaryRoles].includes(role);
  if(isAssignor() || candidate.role!==(auxiliary?'auxiliary':'official') || !isAvailable(candidate.id,game) || isBusy(candidate.id,game)){ toast('You are not eligible for this opening.'); return; }
  showModal(`<h2 class="modal-title">Express interest</h2><p class="modal-subtitle">${role} · ${game.away} at ${game.home} · ${fmtDate(game.date)} ${fmtTime(game.time)}</p><div class="callout"><strong>${candidate.name}</strong><p>This notifies the assignor. It does not assign you to the game.</p></div><div class="modal-actions"><button class="secondary" type="button" onclick="closeModal()">Cancel</button><button class="primary" type="button" onclick="recordInterest(${gameId},'${role}',${candidate.id})">Express interest</button></div>`);
}
function recordInterest(gameId,role,officialId){
  const game=state.games.find(g=>g.id===gameId);
  if(!game || isAssignor() || Number(officialId)!==Number(currentUser().id) || !isAvailable(officialId,game) || isBusy(officialId,game)){ toast('Interest could not be recorded.'); closeModal(); return; }
  if(state.interests.some(i=>i.gameId===gameId&&i.role===role&&i.officialId===officialId&&i.status==='requested')){toast('Interest already recorded.');closeModal();return;}
  state.interests.push({id:uid(),gameId,role,officialId,status:'requested',requestedAt:new Date().toISOString()});save();closeModal();toast('Your interest was sent to the assignor.');
}
function openRequests(gameId,role){ if(!isAssignor()){toast('Only an assignor can review requests.');return;} const game=state.games.find(g=>g.id===gameId), requests=requestedInterest(gameId,role).map(i=>({i,o:person(i.officialId),score:(person(i.officialId).years||0)*4+qualificationScore(person(i.officialId),role)-zipDistance(person(i.officialId).zip,game.zip)/5})).sort((a,b)=>b.score-a.score); showModal(`<h2 class="modal-title">Interested officials</h2><p class="modal-subtitle">${role} · ${game.away} at ${game.home}. Only the assignor can select a person.</p>${requests.length?`<div class="candidates">${requests.map(({i,o,score},n)=>`<div class="candidate ${n===0?'recommended':''}"><span class="avatar">${initials(o.name)}</span><div class="candidate-info"><b>${o.name}${n===0?' · Strongest fit':''}</b><small>${o.classification||`${o.years} years`} · ${o.primaryPosition||'No primary position'} · Requested ${new Date(i.requestedAt).toLocaleString()}</small></div><div class="score">${Math.round(score)} fit<small>${zipDistance(o.zip,game.zip)===999?'distance unknown':`${zipDistance(o.zip,game.zip)} mi`}</small></div><button onclick="assign(${gameId},'${role}',${o.id})">Assign</button></div>`).join('')}</div>`:'<div class="empty">No one has expressed interest yet.</div>'}`); }
function renderCandidates(game,role){ const auxiliary=['Game Clock',...auxiliaryRoles].includes(role); const candidates=state.officials.filter(o=>o.type===(auxiliary?'auxiliary':'official')).map(o=>({o,d:zipDistance(o.zip,game.zip),busy:isBusy(o.id,game),available:isAvailable(o.id,game),score:o.years*4+qualificationScore(o,role)-zipDistance(o.zip,game.zip)/5})).filter(x=>x.available).sort((a,b)=>b.score-a.score); document.querySelector('#candidates').innerHTML=candidates.length?candidates.map(({o,d,busy,score},i)=>`<div class="candidate ${i===0&&!busy?'recommended':''}"><span class="avatar">${initials(o.name)}</span><div class="candidate-info"><b>${o.name}${i===0&&!busy?' · Best fit':''}</b><small>${o.classification||`${o.years} years`} · ${o.primaryPosition||'No primary position'} · ${d===999?'ZIP needed':`${d} mi from venue`}${busy?' · Already assigned this day':''}</small></div><div class="score">${Math.round(score)} fit<small>${d===999?'distance unknown':`${d} mi`}</small></div>${busy?'<span class="type-tag">Conflict</span>':`<button onclick="assign(${game.id},'${role}',${o.id})">Assign</button>`}</div>`).join(''):'<div class="empty">No available candidates match this position for this date.</div>'; }
function assign(gameId,role,personId){
  const game=state.games.find(g=>g.id===gameId); if(!isAssignor()){toast('Only an assignor can make assignments.');return;}
  if(isBusy(personId,game)||!isAvailable(personId,game)){toast('That person is not available for this game.');return;}
  game.assignments[role]=personId; setAssignmentStatus(game,role,'pending_acceptance');
  state.interests.filter(i=>i.gameId===gameId&&i.role===role&&i.status==='requested').forEach(i=>i.status=i.officialId===personId?'selected':'not_selected');
  save();openAssign(gameId);toast(`${person(personId).name} assigned as ${role}; awaiting response.`);
}
function setHandoffStatus(gameId,role,status){
  const game=state.games.find(g=>g.id===gameId); if(!game) return;
  if(!isAssignor()){ toast('Only an assignor can update this status.'); return; }
  setAssignmentStatus(game,role,status); save(); toast(handoffLabel(status));
}
function respondToAssignment(gameId,role,response){
  const game=state.games.find(g=>g.id===gameId); if(!game || Number(game.assignments[role])!==Number(currentUser().id)){toast('This assignment is not yours.');return;}
  if(assignmentStatus(game,role)!=='pending_acceptance'){toast('There is no response needed for this assignment.');return;}
  if(response==='accepted') setAssignmentStatus(game,role,'accepted');
  else { setAssignmentStatus(game,role,'turned_back'); delete game.assignments[role]; state.interests.push({id:uid(),gameId,role,officialId:currentUser().id,status:'withdrawn',requestedAt:new Date().toISOString()}); }
  save(); toast(response==='accepted'?'Assignment accepted.':'Assignment turned back to the assignor.');
}
function reopenPosition(gameId,role){ const game=state.games.find(g=>g.id===gameId); if(!isAssignor()){toast('Only an assignor can reopen positions.');return;} delete game.assignments[role]; if(game.assignmentStatus) delete game.assignmentStatus[role]; state.interests.filter(i=>i.gameId===gameId&&i.role===role&&i.status==='selected').forEach(i=>i.status='requested'); save(); toast(`${role} reopened.`); }
function parseCSV(text){ const lines=text.trim().split(/\r?\n/); const headers=lines.shift().split(',').map(x=>x.trim().toLowerCase());return lines.filter(Boolean).map(line=>{const cells=line.split(',').map(x=>x.trim());return Object.fromEntries(headers.map((h,i)=>[h,cells[i]||'']));}); }
function readImport(file,kind){ const r=new FileReader();r.onload=()=>{try{const rows=parseCSV(r.result);if(kind==='games')rows.forEach(x=>state.games.push({id:uid(),date:x.date,time:x.time||'19:00',home:x.home_team,away:x.away_team,venue:x.venue,zip:x.zip,region:x.region||'North',level:x.level||'Varsity',crewSize:Number(x.crew_size)||5,auxiliary:Number(x.auxiliary)||0,assignments:{}}));else rows.forEach(x=>state.officials.push({id:uid(),name:x.name,zip:x.zip,years:Number(x.years)||0,type:x.type==='auxiliary'?'auxiliary':'official'}));save();toast(`${rows.length} ${kind} imported.`);}catch{toast('Could not read that CSV.');}};r.readAsText(file); }
function importCrewExport(file){ const reader=new FileReader();reader.onload=()=>{try{const doc=new DOMParser().parseFromString(reader.result,'text/html'); const rows=[...doc.querySelectorAll('tr')].map(row=>[...row.querySelectorAll('th,td')].map(cell=>cell.textContent.trim())).filter(row=>row.length>=8); const headerIndex=rows.findIndex(row=>row[0]?.toLowerCase().includes('crew')&&row.includes('Referee')); if(headerIndex<0) throw Error('Crew table not found'); const uniquePeople=new Map(state.officials.map(o=>[o.name.trim().toLowerCase(),o])); const crewRows=rows.slice(headerIndex+1).filter(row=>row[0]&&row.slice(1,8).some(Boolean)); let addedPeople=0; const imported=crewRows.map(row=>{const members={};roles.forEach((role,index)=>{const name=row[index+1];if(!name)return;const key=name.toLowerCase();let official=uniquePeople.get(key);if(!official){official={id:uid(),name,zip:'',years:0,type:'official'};state.officials.push(official);uniquePeople.set(key,official);addedPeople++;}members[role]=official.id;});return {id:uid(),name:row[0],members};}); state.crews=[...state.crews,...imported];save();toast(`${imported.length} crews and ${addedPeople} new officials imported.`);}catch(error){toast('This file does not look like a crew export.');}};reader.readAsText(file);}
function importAvailabilityExport(file,date){ if(!date){toast('Choose the report date before importing.');return;} const reader=new FileReader();reader.onload=()=>{try{const doc=new DOMParser().parseFromString(reader.result,'text/html');const rows=[...doc.querySelectorAll('tr')].map(row=>[...row.querySelectorAll('th,td')].map(cell=>cell.textContent.trim())).filter(row=>row.length>=10);const headerIndex=rows.findIndex(row=>row.includes('Official')&&row.includes('Classification'));if(headerIndex<0)throw Error('Availability report not found');const headers=rows[headerIndex], index=Object.fromEntries(headers.map((h,i)=>[h,i]));const people=new Map(state.officials.map(o=>[o.name.trim().toLowerCase(),o]));let added=0;const officialIds=rows.slice(headerIndex+1).filter(row=>row[index.Official]).map(row=>{const name=row[index.Official],key=name.toLowerCase();let official=people.get(key);if(!official){official={id:uid(),name,zip:'',years:0,type:'official'};state.officials.push(official);people.set(key,official);added++;}official.classification=row[index.Classification]||official.classification||'';official.primaryPosition=row[index['Primary Position']]||official.primaryPosition||'';official.secondaryPosition=row[index['Secondary Position']]||official.secondaryPosition||'';official.closestTeam=row[index['Closest Team']]||official.closestTeam||'';return official.id;});state.availabilityReports=state.availabilityReports.filter(r=>r.date!==date);state.availabilityReports.push({date,officialIds});save();toast(`${officialIds.length} available officials imported for ${date}; ${added} added to roster.`);}catch(error){toast('This file does not look like an availability report.');}};reader.readAsText(file);}
function downloadTemplate(kind){ const text=kind==='games'?'date,time,home_team,away_team,venue,zip,region,level,crew_size,auxiliary\n2026-09-25,19:00,Home High,Away High,Example Stadium,75201,North,Varsity,7,5\n':'name,zip,years,type\nJane Smith,75201,8,official\nSam Jones,75001,2,auxiliary\n'; download(`${kind}-template.csv`,text); }
function download(name,text){ const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/csv'}));a.download=name;a.click();URL.revokeObjectURL(a.href); }
function exportGames(){ const head='date,time,home_team,away_team,venue,zip,region,level,crew_size,auxiliary,filled_positions\n';download('gridiron-games.csv',head+state.games.map(g=>[g.date,g.time,g.home,g.away,g.venue,g.zip,g.region||'',g.level,g.crewSize,auxiliaryCount(g),assignedCount(g)].join(',')).join('\n')); }
function toast(msg){const el=document.querySelector('#toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600);}
function setDemoUser(personId){
  const user=state.users.find(u=>u.id===Number(personId)); if(!user) return;
  state.session={personId:user.id,role:user.role}; previewMode=user.role==='assignor'?'assignor':'official';
  save();
  const button=document.querySelector('#previewModeBtn'); if(button) button.textContent=previewMode==='assignor'?'Official portal preview':'Return to assignor view';
  toast(`Demo role: ${user.role}.`);
}
function addAvailabilityBlock(personId,date,start='',end='',allDay=true){
  if(Number(personId)!==Number(currentUser().id) && !isAssignor()){ toast('You can only update your own availability.'); return false; }
  if(!personId||!date){ toast('Choose a date for the availability block.'); return false; }
  state.availabilityBlocks.push({id:uid(),personId:Number(personId),date,start,end,allDay:Boolean(allDay)}); save(); return true;
}
function removeAvailabilityBlock(blockId){
  const block=state.availabilityBlocks.find(b=>b.id===Number(blockId)); if(!block || (block.personId!==currentUser().id&&!isAssignor())) return;
  state.availabilityBlocks=state.availabilityBlocks.filter(b=>b.id!==Number(blockId)); save();
}
function openAvailabilityForm(){
  const user=currentUser();
  if(isAssignor()){ toast('Choose an official or auxiliary demo user to update availability.'); return; }
  const blocks=state.availabilityBlocks.filter(b=>b.personId===user.id).sort((a,b)=>a.date.localeCompare(b.date));
  showModal(`<h2 class="modal-title">My availability</h2><p class="modal-subtitle">Block a full date or a specific time window. Openings during a block are not eligible.</p><div class="form-grid"><label class="field">DATE<input name="date" type="date" required value="2026-10-01"></label><label class="field"><input name="allDay" type="checkbox" checked> FULL DAY</label><label class="field">START (optional)<input name="start" type="time"></label><label class="field">END (optional)<input name="end" type="time"></label></div>${blocks.length?`<div class="assignment-list">${blocks.map(b=>`<span class="assignment-chip"><b>${b.date}</b>${b.allDay?'Unavailable all day':`${b.start}–${b.end}`} <button class="text-button" type="button" onclick="removeAvailabilityBlock(${b.id});openAvailabilityForm()">Remove</button></span>`).join('')}</div>`:'<div class="empty">No availability blocks saved.</div>'}<div class="modal-actions"><button class="secondary" type="button" onclick="closeModal()">Close</button><button class="primary" value="default">Save block</button></div>`);
  document.querySelector('#modalForm').onsubmit=e=>{e.preventDefault(); const f=new FormData(e.currentTarget); const allDay=f.get('allDay')==='on'; if(!allDay&&(!f.get('start')||!f.get('end'))){toast('Add both start and end times, or use a full-day block.');return;} if(addAvailabilityBlock(user.id,f.get('date'),f.get('start'),f.get('end'),allDay)){closeModal();toast('Availability updated.');}};
}
document.querySelectorAll('.nav-link').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav-link,.view').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelector('#'+b.dataset.view).classList.add('active');document.querySelector('#pageTitle').textContent=b.textContent.replace(/[▦◫♙↥⚑⇄]/g,'').replace(/\d+/g,'').trim();});
const on=(selector,event,handler)=>{const el=document.querySelector(selector);if(el)el.addEventListener(event,handler);};
on('#addGameBtn','click',openGameForm);on('#addOfficialBtn','click',openOfficialForm);on('#availabilityBtn','click',openAvailabilityForm);on('#previewModeBtn','click',()=>{setDemoUser(previewMode==='assignor'?1:9001);});on('#demoUserSelect','change',e=>setDemoUser(e.target.value));on('#levelFilter','change',renderAttention);on('#gamesFile','change',e=>e.target.files[0]&&readImport(e.target.files[0],'games'));on('#officialsFile','change',e=>e.target.files[0]&&readImport(e.target.files[0],'officials'));on('#crewsFile','change',e=>e.target.files[0]&&importCrewExport(e.target.files[0]));on('#availabilityFile','change',e=>e.target.files[0]&&importAvailabilityExport(e.target.files[0],document.querySelector('#availabilityDate').value));document.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>downloadTemplate(b.dataset.template));on('#exportGamesBtn','click',exportGames);
render();
