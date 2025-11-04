// --- DATA (categories & templates) ---
const CATEGORIES = {
  "Church & Faith-Based":[ "Crusades","Revival Service","Youth Conference","Women’s Fellowship","Men’s Fellowship","Choir Concert","Bible Study","Ordination Ceremony","Thanksgiving Service" ],
  "Personal & Family":[ "Wedding","Engagement","Bridal Shower","Baby Shower","Birthday","Anniversary","Graduation","House Warming","Funeral","Family Reunion" ],
  "School & Education":[ "School Meeting","Success Card","Talent Show","Alumni Reunion","Parents' Day","Academic Conference" ],
  "Business & Professional":[ "Job Advertisement","Business Launch","Product Promotion","Workshop / Training","Sales / Discount","Career Fair" ],
  "Community & Social":[ "Committee Meeting","Charity Event","Sports Tournament","Cultural Festival","Political Rally" ],
  "Entertainment & Creative":[ "Music Concert","Movie Night","Art Exhibition","Fashion Show","Talent Competition" ],
  "Personal Celebrations":[ "Success Card","Congratulations","Achievement" ],
  "Church Departments":[ "Youth Dept","Women Dept","Men Dept","Choir Dept" ]
};

const TEMPLATES = [
  {id:"church-1",title:"Crusade Night",category:"Church & Faith-Based",price:199,bg:"#0b3b6f",color:"#fff"},
  {id:"choir-1",title:"Choir Concert",category:"Church & Faith-Based",price:179,bg:"#6b21a8",color:"#fff"},
  {id:"wedding-1",title:"Elegant Wedding",category:"Personal & Family",price:299,bg:"#db2777",color:"#fff"},
  {id:"birthday-1",title:"Birthday Bash",category:"Personal & Family",price:149,bg:"#f59e0b",color:"#111827"},
  {id:"job-1",title:"Job Vacancy",category:"Business & Professional",price:99,bg:"#111827",color:"#fff"},
  {id:"school-1",title:"Prize Giving",category:"School & Education",price:129,bg:"#065f46",color:"#fff"},
  {id:"charity-1",title:"Fundraiser",category:"Community & Social",price:159,bg:"#f97316",color:"#111827"},
  {id:"music-1",title:"Music Concert",category:"Entertainment & Creative",price:219,bg:"#0ea5e9",color:"#fff"},
  {id:"graduation-1",title:"Graduation Ceremony",category:"Personal & Family",price:179,bg:"#0f172a",color:"#fff"},
  {id:"committee-1",title:"Committee Meeting",category:"Community & Social",price:89,bg:"#94a3b8",color:"#111827"}
];

// --- STATE ---
let state = {
  selectedCategory: Object.keys(CATEGORIES)[0],
  selectedTemplateId: TEMPLATES[0].id,
  fields: { title: TEMPLATES[0].title, subtitle:'Put your subtitle here', date:'', venue:'', contact:'' },
  photoDataUrl: null,
  paid:false
};

// --- DOM ---
const categoriesEl = document.getElementById('categories');
const templatesGridEl = document.getElementById('templatesGrid');
const templateSelectEl = document.getElementById('templateSelect');
const templateSearchEl = document.getElementById('templateSearch');
const titleInput = document.getElementById('titleInput');
const subtitleInput = document.getElementById('subtitleInput');
const dateInput = document.getElementById('dateInput');
const venueInput = document.getElementById('venueInput');
const contactInput = document.getElementById('contactInput');
const photoInput = document.getElementById('photoInput');
const priceSpan = document.getElementById('priceSpan');
const buyBtn = document.getElementById('buyBtn');
const resetPaymentBtn = document.getElementById('resetPaymentBtn');
const saveDraftBtn = document.getElementById('saveDraftBtn');
const flierTitle = document.getElementById('flierTitle');
const flierSubtitle = document.getElementById('flierSubtitle');
const flierDate = document.getElementById('flierDate');
const flierVenue = document.getElementById('flierVenue');
const flierContact = document.getElementById('flierContact');
const heroArea = document.getElementById('heroArea');
const flierPriceTag = document.getElementById('flierPriceTag');
const downloadBtn = document.getElementById('downloadBtn');
const downloadPDFBtn = document.getElementById('downloadPDFBtn');

// set year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// --- helpers ---
function getTemplateById(id){ return TEMPLATES.find(t=>t.id===id) || TEMPLATES[0]; }
function queryStringCategory(){ // read ?category=...
  const params = new URLSearchParams(window.location.search);
  const c = params.get('category');
  return c ? decodeURIComponent(c) : null;
}

// --- render ---
function renderCategories(){
  categoriesEl.innerHTML='';
  Object.keys(CATEGORIES).forEach(cat=>{
    const btn = document.createElement('button');
    btn.className = 'cat-btn' + (state.selectedCategory===cat?' active':'');
    btn.textContent = cat;
    btn.onclick = ()=>{ state.selectedCategory = cat; renderTemplates(); renderCategories(); selectFirstInCategory(); };
    categoriesEl.appendChild(btn);
  });
}

function renderTemplates(){
  const q = (templateSearchEl.value||'').toLowerCase();
  templatesGridEl.innerHTML='';
  const list = TEMPLATES.filter(t => t.category === state.selectedCategory && t.title.toLowerCase().includes(q));
  if(list.length===0){
    // show all templates in category if no search match
    TEMPLATES.filter(t=>t.category===state.selectedCategory).forEach(t=>templatesGridEl.appendChild(renderTemplateCard(t)));
    return;
  }
  list.forEach(t=>templatesGridEl.appendChild(renderTemplateCard(t)));
}

function renderTemplateCard(t){
  const card = document.createElement('div');
  card.className = 'template-card';
  card.onclick = ()=>{ selectTemplate(t.id); };
  const thumb = document.createElement('div');
  thumb.className = 'template-thumb';
  thumb.style.background = t.bg;
  thumb.textContent = t.title.split(' ')[0];
  const meta = document.createElement('div'); meta.className='template-meta';
  meta.innerHTML = `<h4>${t.title}</h4><p>${t.category} • KES ${t.price}</p>`;
  card.appendChild(thumb); card.appendChild(meta);
  return card;
}

function renderTemplateSelect(){
  templateSelectEl.innerHTML='';
  TEMPLATES.forEach(t=>{
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = `${t.title} — KES ${t.price}`;
    templateSelectEl.appendChild(opt);
  });
  templateSelectEl.value = state.selectedTemplateId;
  updatePriceDisplay();
}

function updatePriceDisplay(){
  const t = getTemplateById(state.selectedTemplateId);
  priceSpan.textContent = t.price;
  flierPriceTag.textContent = 'KES ' + t.price;
}

function renderPreview(){
  flierTitle.textContent = state.fields.title || 'Title';
  flierSubtitle.textContent = state.fields.subtitle || '';
  flierDate.textContent = state.fields.date || 'TBA';
  flierVenue.textContent = state.fields.venue || 'TBA';
  flierContact.textContent = state.fields.contact || 'TBA';
  const t = getTemplateById(state.selectedTemplateId);
  if(state.photoDataUrl){
    heroArea.style.background = 'transparent';
    heroArea.innerHTML = `<img src="${state.photoDataUrl}" style="width:100%;height:100%;object-fit:cover" alt="photo">`;
  } else {
    heroArea.style.background = t.bg;
    heroArea.style.color = t.color || '#fff';
    heroArea.innerHTML = `<div style="text-align:center;padding:8px"><div style="font-size:20px;font-weight:700">${(state.fields.title||t.title)}</div><div style="opacity:.85;margin-top:6px;font-size:13px">${t.category}</div></div>`;
  }
  flierPriceTag.style.background = 'rgba(255,255,255,0.9)';
  flierPriceTag.style.color = '#0b1220';
}

// --- selection & events ---
function selectTemplate(id){
  state.selectedTemplateId = id;
  const t = getTemplateById(id);
  state.fields.title = t.title;
  state.fields.subtitle = 'Put your subtitle here';
  state.photoDataUrl = null;
  state.paid = false;
  templateSelectEl.value = id;
  titleInput.value = state.fields.title;
  subtitleInput.value = state.fields.subtitle;
  dateInput.value = '';
  venueInput.value = '';
  contactInput.value = '';
  updatePriceDisplay();
  renderPreview();
}

function selectFirstInCategory(){
  const first = TEMPLATES.find(t=>t.category===state.selectedCategory);
  if(first) selectTemplate(first.id);
}

templateSelectEl.addEventListener('change', (e)=> selectTemplate(e.target.value));
templateSearchEl.addEventListener('input', ()=> renderTemplates());

titleInput.addEventListener('input', (e)=>{ state.fields.title = e.target.value; renderPreview(); });
subtitleInput.addEventListener('input', (e)=>{ state.fields.subtitle = e.target.value; renderPreview(); });
dateInput.addEventListener('input', (e)=>{ state.fields.date = e.target.value; renderPreview(); });
venueInput.addEventListener('input', (e)=>{ state.fields.venue = e.target.value; renderPreview(); });
contactInput.addEventListener('input', (e)=>{ state.fields.contact = e.target.value; renderPreview(); });

photoInput.addEventListener('change', (e)=>{
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev=>{ state.photoDataUrl = ev.target.result; renderPreview(); };
  reader.readAsDataURL(file);
});

buyBtn.addEventListener('click', ()=>{
  const t = getTemplateById(state.selectedTemplateId);
  const confirmed = confirm('Pay KES ' + t.price + ' to download this flier? (Simulated)');
  if(!confirmed) return;
  state.paid = true;
  alert('Payment successful (simulated). You can now download the flier.');
  buyBtn.textContent = 'Paid ✓';
  buyBtn.style.background = '#10b981';
});

resetPaymentBtn.addEventListener('click', ()=>{
  state.paid = false;
  buyBtn.textContent = 'Buy (KES ' + getTemplateById(state.selectedTemplateId).price + ')';
  buyBtn.style.background = '';
});

saveDraftBtn.addEventListener('click', ()=>{
  const drafts = JSON.parse(localStorage.getItem('peron_drafts') || '[]');
  drafts.push({ id: Date.now(), templateId: state.selectedTemplateId, fields: {...state.fields}, photoDataUrl: state.photoDataUrl });
  localStorage.setItem('peron_drafts', JSON.stringify(drafts));
  alert('Draft saved locally');
});

downloadBtn.addEventListener('click', async ()=>{
  if(!state.paid){ alert('Please complete payment before downloading.'); return; }
  const node = document.getElementById('flierPreview');
  try{
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: null });
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${state.selectedTemplateId}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch(err){
    console.error(err);
    alert('Download failed: ' + err.message);
  }
});

downloadPDFBtn.addEventListener('click', async ()=>{
  if(!state.paid){ alert('Please complete payment before downloading.'); return; }
  const node = document.getElementById('flierPreview');
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: null });
  const dataUrl = canvas.toDataURL('image/png');
  const w = window.open('');
  w.document.write('<img src="'+dataUrl+'" style="max-width:100%"/>');
  w.document.close();
});

// --- init ---
function init(){
  // if ?category=... provided, use it
  const qCategory = queryStringCategory();
  if(qCategory && Object.keys(CATEGORIES).includes(qCategory)){
    state.selectedCategory = qCategory;
  }
  renderCategories();
  renderTemplates();
  renderTemplateSelect();
  selectFirstInCategory();
  renderPreview();
}
init();
