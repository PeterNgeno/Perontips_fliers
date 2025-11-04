// script-updated.js
// Frontend payment integration for Peron Tips backend
// Make sure this file is included by update.html (or your chosen page).

const BACKEND_BASE = 'https://perontips-fliers-backend.onrender.com'; // change if needed
const MAX_AMOUNT = 30; // KES

// ---------- elements ----------
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
const amountInput = document.getElementById('amountInput');

const priceSpan = document.getElementById('priceSpan');
const buyBtn = document.getElementById('buyBtn');
const resetPaymentBtn = document.getElementById('resetPaymentBtn');
const saveDraftBtn = document.getElementById('saveDraftBtn');
const payStatus = document.getElementById('payStatus');

const flierTitle = document.getElementById('flierTitle');
const flierSubtitle = document.getElementById('flierSubtitle');
const flierDate = document.getElementById('flierDate');
const flierVenue = document.getElementById('flierVenue');
const flierContact = document.getElementById('flierContact');
const heroArea = document.getElementById('heroArea');
const flierPriceTag = document.getElementById('flierPriceTag');

const downloadBtn = document.getElementById('downloadBtn');
const downloadPDFBtn = document.getElementById('downloadPDFBtn');

document.getElementById('year').textContent = new Date().getFullYear();

// ---------- data ----------
const CATEGORIES = {
  "Church & Faith-Based":[ "Crusades","Revival Service","Youth Conference","Women’s Fellowship","Men’s Fellowship","Choir Concert","Bible Study","Ordination Ceremony","Thanksgiving Service" ],
  "Personal & Family":[ "Wedding","Engagement","Bridal Shower","Baby Shower","Birthday","Anniversary","Graduation","House Warming","Funeral","Family Reunion" ],
  "School & Education":[ "School Meeting","Success Card","Talent Show","Alumni Reunion","Parents' Day","Academic Conference" ],
  "Business & Professional":[ "Job Advertisement","Business Launch","Product Promotion","Workshop / Training","Sales / Discount","Career Fair" ],
  "Community & Social":[ "Committee Meeting","Charity Event","Sports Tournament","Cultural Festival","Political Rally" ],
  "Entertainment & Creative":[ "Music Concert","Movie Night","Art Exhibition","Fashion Show","Talent Competition" ]
};

const TEMPLATES = [
  {id:"church-1",title:"Crusade Night",category:"Church & Faith-Based",price:20,bg:"#0b3b6f",color:"#fff"},
  {id:"choir-1",title:"Choir Concert",category:"Church & Faith-Based",price:18,bg:"#6b21a8",color:"#fff"},
  {id:"wedding-1",title:"Elegant Wedding",category:"Personal & Family",price:30,bg:"#db2777",color:"#fff"},
  {id:"birthday-1",title:"Birthday Bash",category:"Personal & Family",price:15,bg:"#f59e0b",color:"#111827"},
  {id:"job-1",title:"Job Vacancy",category:"Business & Professional",price:10,bg:"#111827",color:"#fff"}
];

// ---------- state ----------
let state = {
  selectedCategory: Object.keys(CATEGORIES)[0],
  selectedTemplateId: TEMPLATES[0].id,
  fields: { title: TEMPLATES[0].title, subtitle:'Put your subtitle here', date:'', venue:'', contact:'' },
  photoDataUrl: null,
  paid: false,
  lastCheckoutId: null
};

// ---------- helpers ----------
function getTemplateById(id){ return TEMPLATES.find(t=>t.id===id) || TEMPLATES[0]; }
function normalizePhoneInput(phone){
  if(!phone) return null;
  const cleaned = String(phone).replace(/\s|\+|-/g,'');
  // If user typed 07..., allow; if they typed 7..., convert to 07...; if 254..., keep
  if(/^7\d{8}$/.test(cleaned)) return '0' + cleaned;
  if(/^07\d{8}$/.test(cleaned)) return cleaned;
  if(/^2547\d{8}$/.test(cleaned)) return cleaned;
  // fallback to provided value
  return cleaned;
}

function showStatus(msg, opts={}) {
  payStatus.textContent = msg;
  if(opts.error) payStatus.style.color = '#b91c1c';
  else payStatus.style.color = '#374151';
}

// ---------- rendering ----------
function renderCategories(){
  categoriesEl.innerHTML = '';
  Object.keys(CATEGORIES).forEach(cat=>{
    const btn = document.createElement('button');
    btn.className = 'cat-btn' + (state.selectedCategory===cat ? ' active' : '');
    btn.textContent = cat;
    btn.onclick = ()=>{ state.selectedCategory = cat; renderTemplates(); renderCategories(); selectFirstInCategory(); };
    categoriesEl.appendChild(btn);
  });
}

function renderTemplates(){
  const q = (templateSearchEl.value||'').toLowerCase();
  templatesGridEl.innerHTML = '';
  const list = TEMPLATES.filter(t=>t.category===state.selectedCategory && t.title.toLowerCase().includes(q));
  (list.length ? list : TEMPLATES.filter(t=>t.category===state.selectedCategory)).forEach(t=>{
    const card = document.createElement('div');
    card.className = 'template-card';
    card.innerHTML = `<div class='template-thumb' style='background:${t.bg}'>${t.title.split(' ')[0]}</div>
                      <div class='template-meta'><h4>${t.title}</h4><p>${t.category} • KES ${t.price}</p></div>`;
    card.onclick = ()=> selectTemplate(t.id);
    templatesGridEl.appendChild(card);
  });
}

function renderTemplateSelect(){
  templateSelectEl.innerHTML = '';
  TEMPLATES.forEach(t=>{
    const opt = document.createElement('option');
    opt.value = t.id; opt.textContent = `${t.title} — KES ${t.price}`;
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
    heroArea.innerHTML = `<img src="${state.photoDataUrl}" style="width:100%;height:100%;object-fit:cover">`;
  } else {
    heroArea.style.background = t.bg;
    heroArea.style.color = t.color || '#fff';
    heroArea.innerHTML = `<div style="text-align:center;padding:8px"><div style="font-size:20px;font-weight:700">${(state.fields.title||t.title)}</div><div style="opacity:.85;margin-top:6px;font-size:13px">${t.category}</div></div>`;
  }
  flierPriceTag.style.background = 'rgba(255,255,255,0.9)';
  flierPriceTag.style.color = '#0b1220';
}

// ---------- selection & events ----------
function selectTemplate(id){
  state.selectedTemplateId = id;
  const t = getTemplateById(id);
  state.fields.title = t.title;
  state.fields.subtitle = 'Put your subtitle here';
  state.photoDataUrl = null;
  state.paid = false;
  state.lastCheckoutId = null;
  templateSelectEl.value = id;
  titleInput.value = state.fields.title;
  subtitleInput.value = state.fields.subtitle;
  dateInput.value = '';
  venueInput.value = '';
  contactInput.value = '';
  amountInput.value = Math.min(t.price, MAX_AMOUNT);
  updatePriceDisplay();
  renderPreview();
  showStatus('');
}

function selectFirstInCategory(){
  const first = TEMPLATES.find(t=>t.category===state.selectedCategory);
  if(first) selectTemplate(first.id);
}

templateSelectEl.addEventListener('change',(e)=>selectTemplate(e.target.value));
templateSearchEl.addEventListener('input',()=>renderTemplates());

titleInput.addEventListener('input',(e)=>{state.fields.title=e.target.value;renderPreview();});
subtitleInput.addEventListener('input',(e)=>{state.fields.subtitle=e.target.value;renderPreview();});
dateInput.addEventListener('input',(e)=>{state.fields.date=e.target.value;renderPreview();});
venueInput.addEventListener('input',(e)=>{state.fields.venue=e.target.value;renderPreview();});
contactInput.addEventListener('input',(e)=>{state.fields.contact=e.target.value;renderPreview();});

photoInput.addEventListener('change',(e)=>{
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = ev => { state.photoDataUrl = ev.target.result; renderPreview(); }
  r.readAsDataURL(f);
});

// ---------- payment flow ----------

/**
 * initiatePayment
 * Calls backend /pay to start STK push
 * Returns { checkoutId }
 */
async function initiatePayment(phone, amount) {
  const url = `${BACKEND_BASE}/pay`;
  const body = { phone, amount };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(body),
    credentials: 'omit'
  });
  const data = await resp.json();
  if(!resp.ok) throw data;
  return data;
}

/**
 * pollStatus
 * Polls /status?phone=... until status !== 'Pending' or timeout
 */
async function pollStatus(phone, timeoutMs = 60000, intervalMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const q = new URLSearchParams({ phone });
      const resp = await fetch(`${BACKEND_BASE}/status?${q.toString()}`);
      if (resp.status === 404) {
        // Not yet found; keep polling
        await new Promise(r => setTimeout(r, intervalMs));
        continue;
      }
      const data = await resp.json();
      // data.status expected 'Pending' | 'Success' | 'Failed'
      if (data.status && data.status !== 'Pending') {
        return data;
      }
    } catch (err) {
      // network or other error; continue polling until timeout
      console.warn('Polling error', err);
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error('Payment status polling timed out');
}

buyBtn.addEventListener('click', async ()=>{
  // basic validation
  const phoneRaw = contactInput.value || '';
  const phone = normalizePhoneInput(phoneRaw);
  const amountVal = Number(amountInput.value || 0);

  if(!phone){
    showStatus('Enter a valid phone number (e.g., 07XXXXXXXX).', { error:true });
    return;
  }
  if(!/^(0|254)/.test(phone) && !/^07/.test(phone)) {
    // allow 07xxxxxxxx or 2547xxxxxxxx
    // we still let server validate but warn here
    console.warn('Phone normalized to:', phone);
  }

  if(Number.isNaN(amountVal) || amountVal <= 0) {
    showStatus('Enter a valid amount.', { error:true });
    return;
  }
  if(amountVal > MAX_AMOUNT) {
    showStatus(`Amount must not exceed KES ${MAX_AMOUNT}.`, { error:true });
    return;
  }

  // update UI
  showStatus('Initiating payment... please approve the STK push on your phone.');

  buyBtn.disabled = true;
  try {
    // Initiate STK push
    const init = await initiatePayment(phone, amountVal);
    state.lastCheckoutId = init.checkoutId || init.CheckoutRequestID || null;
    showStatus('STK push sent — waiting for confirmation on your phone (polling)...');

    // Poll for status
    const result = await pollStatus(phone, 90000, 3000); // 90s timeout
    if(result.status === 'Success' || result.status === 'Success' || result.status === 'Completed') {
      state.paid = true;
      showStatus('Payment confirmed — you may now download the flier.');
      buyBtn.textContent = 'Paid ✓';
      buyBtn.style.background = '#10b981';
    } else {
      state.paid = false;
      showStatus(`Payment failed: ${result.resultDesc || JSON.stringify(result)}`, { error:true });
      buyBtn.disabled = false;
      buyBtn.textContent = `Buy (KES ${getTemplateById(state.selectedTemplateId).price})`;
    }
  } catch (err) {
    console.error('Payment error', err);
    const msg = err && err.error && err.error.error ? err.error.error : (err.message || JSON.stringify(err));
    showStatus('Payment error: ' + msg, { error:true });
    buyBtn.disabled = false;
    buyBtn.textContent = `Buy (KES ${getTemplateById(state.selectedTemplateId).price})`;
  }
});

resetPaymentBtn.addEventListener('click', ()=>{
  state.paid = false;
  state.lastCheckoutId = null;
  buyBtn.disabled = false;
  buyBtn.textContent = `Buy (KES ${getTemplateById(state.selectedTemplateId).price})`;
  showStatus('');
});

saveDraftBtn.addEventListener('click', ()=>{
  const drafts = JSON.parse(localStorage.getItem('peron_drafts') || '[]');
  drafts.push({ id: Date.now(), templateId: state.selectedTemplateId, fields: {...state.fields}, photoDataUrl: state.photoDataUrl });
  localStorage.setItem('peron_drafts', JSON.stringify(drafts));
  alert('Draft saved locally');
});

// ---------- download/export ----------
downloadBtn.addEventListener('click', async ()=>{
  if(!state.paid){
    alert('Please complete payment before downloading.');
    return;
  }
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
    alert('Download failed: ' + (err.message || err));
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

// ---------- init ----------
function init(){
  renderCategories();
  renderTemplates();
  renderTemplateSelect();

  // pre-select category from query string if supplied
  const params = new URLSearchParams(window.location.search);
  const cat = params.get('category');
  if(cat && Object.keys(CATEGORIES).includes(decodeURIComponent(cat))){
    state.selectedCategory = decodeURIComponent(cat);
  }

  selectFirstInCategory();
  renderPreview();

  // set amount input to default (template price or 30 whichever smaller)
  amountInput.value = Math.min(getTemplateById(state.selectedTemplateId).price, MAX_AMOUNT);
}
init();
