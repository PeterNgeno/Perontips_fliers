// --- DATA ---
const CATEGORIES = {
  "Church & Faith-Based": ["Crusades","Youth Conference","Choir Concert","Ordination Ceremony"],
  "Personal & Family": ["Wedding","Birthday","Graduation","Anniversary"],
  "Business & Professional": ["Job Advertisement","Workshop","Business Launch"],
  "Community & Social": ["Committee Meeting","Charity Event","Sports Tournament"],
  "Entertainment & Creative": ["Music Concert","Fashion Show","Art Exhibition"]
};

const TEMPLATES = [
  {id:"church1",title:"Crusade Night",category:"Church & Faith-Based",price:199,bg:"#0b3b6f",color:"#fff"},
  {id:"wedding1",title:"Wedding",category:"Personal & Family",price:299,bg:"#db2777",color:"#fff"},
  {id:"job1",title:"Job Vacancy",category:"Business & Professional",price:99,bg:"#111827",color:"#fff"},
  {id:"birthday1",title:"Birthday Bash",category:"Personal & Family",price:149,bg:"#f59e0b",color:"#111827"}
];

// --- STATE ---
let state = {
  category: Object.keys(CATEGORIES)[0],
  templateId: TEMPLATES[0].id,
  fields: { title:TEMPLATES[0].title, subtitle:'', date:'', venue:'', contact:'' },
  photo:null,
  paid:false
};

// --- DOM ELEMENTS ---
const cats = document.getElementById('categories');
const grid = document.getElementById('templatesGrid');
const tSelect = document.getElementById('templateSelect');
const titleI = document.getElementById('titleInput');
const subI = document.getElementById('subtitleInput');
const dateI = document.getElementById('dateInput');
const venueI = document.getElementById('venueInput');
const contactI = document.getElementById('contactInput');
const photoI = document.getElementById('photoInput');
const priceSpan = document.getElementById('priceSpan');
const buyBtn = document.getElementById('buyBtn');
const resetBtn = document.getElementById('resetPaymentBtn');
const saveBtn = document.getElementById('saveDraftBtn');
const flier = document.getElementById('flierPreview');
const hero = document.getElementById('heroArea');
const flierTitle = document.getElementById('flierTitle');
const flierSubtitle = document.getElementById('flierSubtitle');
const flierDate = document.getElementById('flierDate');
const flierVenue = document.getElementById('flierVenue');
const flierContact = document.getElementById('flierContact');
const flierPriceTag = document.getElementById('flierPriceTag');
const year = document.getElementById('year');
const downloadBtn = document.getElementById('downloadBtn');
const search = document.getElementById('templateSearch');

year.textContent = new Date().getFullYear();

// --- RENDERING ---
function renderCategories(){
  cats.innerHTML = '';
  for(let c in CATEGORIES){
    const btn = document.createElement('button');
    btn.textContent = c;
    btn.className = 'cat-btn' + (c===state.category?' active':'');
    btn.onclick = ()=>{ state.category = c; renderTemplates(); renderCategories(); };
    cats.appendChild(btn);
  }
}

function renderTemplates(){
  grid.innerHTML='';
  const q = search.value.toLowerCase();
  const list = TEMPLATES.filter(t=>t.category===state.category && t.title.toLowerCase().includes(q));
  list.forEach(t=>{
    const card=document.createElement('div');
    card.className='template-card';
    card.innerHTML=`<div class='template-thumb' style='background:${t.bg}'>${t.title.split(' ')[0]}</div>
                    <div class='template-meta'><h4>${t.title}</h4><p>${t.category} • KES ${t.price}</p></div>`;
    card.onclick=()=>selectTemplate(t.id);
    grid.appendChild(card);
  });
}

function renderTemplateSelect(){
  tSelect.innerHTML='';
  TEMPLATES.forEach(t=>{
    const opt=document.createElement('option');
    opt.value=t.id; opt.textContent=`${t.title} — KES ${t.price}`;
    tSelect.appendChild(opt);
  });
  tSelect.value=state.templateId;
  updatePrice();
}

function updatePrice(){
  const t=getTemplate();
  priceSpan.textContent=t.price;
  flierPriceTag.textContent='KES '+t.price;
}

function getTemplate(){ return TEMPLATES.find(t=>t.id===state.templateId); }

function renderPreview(){
  const t=getTemplate();
  flierTitle.textContent=state.fields.title||'Title';
  flierSubtitle.textContent=state.fields.subtitle||'';
  flierDate.textContent=state.fields.date||'TBA';
  flierVenue.textContent=state.fields.venue||'TBA';
  flierContact.textContent=state.fields.contact||'TBA';
  if(state.photo){
    hero.innerHTML=`<img src='${state.photo}' style='width:100%;height:100%;object-fit:cover'>`;
  } else {
    hero.style.background=t.bg;
    hero.style.color=t.color;
    hero.innerHTML=`<div style='text-align:center'><strong>${state.fields.title||t.title}</strong><div>${t.category}</div></div>`;
  }
}

// --- EVENTS ---
function selectTemplate(id){
  state.templateId=id;
  const t=getTemplate();
  state.fields.title=t.title;
  titleI.value=t.title;
  renderPreview();
  updatePrice();
}

tSelect.onchange=()=>selectTemplate(tSelect.value);
search.oninput=()=>renderTemplates();

titleI.oninput=()=>{state.fields.title=titleI.value;renderPreview();};
subI.oninput=()=>{state.fields.subtitle=subI.value;renderPreview();};
dateI.oninput=()=>{state.fields.date=dateI.value;renderPreview();};
venueI.oninput=()=>{state.fields.venue=venueI.value;renderPreview();};
contactI.oninput=()=>{state.fields.contact=contactI.value;renderPreview();};

photoI.onchange=(e)=>{
  const f=e.target.files[0]; if(!f)return;
  const r=new FileReader();
  r.onload=ev=>{state.photo=ev.target.result;renderPreview();};
  r.readAsDataURL(f);
};

buyBtn.onclick=()=>{
  const t=getTemplate();
  if(confirm(`Pay KES ${t.price}? (Simulated)`)){
    state.paid=true;
    alert('Payment successful (simulated)');
    buyBtn.textContent='Paid ✓';
  }
};

resetBtn.onclick=()=>{state.paid=false;buyBtn.textContent='Buy (KES '+getTemplate().price+')';};

saveBtn.onclick=()=>{
  const d=JSON.parse(localStorage.getItem('drafts')||'[]');
  d.push({...state});
  localStorage.setItem('drafts',JSON.stringify(d));
  alert('Draft saved');
};

downloadBtn.onclick=async()=>{
  if(!state.paid){alert('Please pay first');return;}
  const canvas=await html2canvas(flier,{scale:2});
  const a=document.createElement('a');
  a.href=canvas.toDataURL('image/png');
  a.download='flier.png';
  a.click();
};

// --- INIT ---
renderCategories();
renderTemplates();
renderTemplateSelect();
renderPreview();
