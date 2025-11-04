// Peron Tips frontend → live backend integration
const BACKEND_BASE = 'https://perontips-fliers-backend.onrender.com';
const MAX_AMOUNT = 30;

// DOM
const categoriesEl=document.getElementById('categories'),templatesGridEl=document.getElementById('templatesGrid'),
templateSelectEl=document.getElementById('templateSelect'),templateSearchEl=document.getElementById('templateSearch'),
titleInput=document.getElementById('titleInput'),subtitleInput=document.getElementById('subtitleInput'),
dateInput=document.getElementById('dateInput'),venueInput=document.getElementById('venueInput'),
contactInput=document.getElementById('contactInput'),photoInput=document.getElementById('photoInput'),
paymentPhoneInput=document.getElementById('paymentPhoneInput'),amountInput=document.getElementById('amountInput'),
priceSpan=document.getElementById('priceSpan'),buyBtn=document.getElementById('buyBtn'),
resetPaymentBtn=document.getElementById('resetPaymentBtn'),saveDraftBtn=document.getElementById('saveDraftBtn'),
payStatus=document.getElementById('payStatus'),flierTitle=document.getElementById('flierTitle'),
flierSubtitle=document.getElementById('flierSubtitle'),flierDate=document.getElementById('flierDate'),
flierVenue=document.getElementById('flierVenue'),flierContact=document.getElementById('flierContact'),
heroArea=document.getElementById('heroArea'),flierPriceTag=document.getElementById('flierPriceTag'),
downloadBtn=document.getElementById('downloadBtn'),downloadPDFBtn=document.getElementById('downloadPDFBtn');
document.getElementById('year').textContent=new Date().getFullYear();

// categories + templates
const CATEGORIES={
"Church & Faith-Based":["Crusades","Revival","Youth Conference","Choir Concert","Ordination"],
"Personal & Family":["Wedding","Birthday","Graduation","Anniversary"],
"Business & Professional":["Job Ad","Workshop","Launch"],
"Community & Social":["Committee","Charity","Sports"],
"Entertainment & Creative":["Music","Fashion","Movie"]
};
const TEMPLATES=[
{id:"wedding1",title:"Wedding Invite",category:"Personal & Family",price:30,bg:"#db2777",color:"#fff"},
{id:"crusade1",title:"Crusade Night",category:"Church & Faith-Based",price:20,bg:"#0b3b6f",color:"#fff"},
{id:"job1",title:"Job Vacancy",category:"Business & Professional",price:10,bg:"#111827",color:"#fff"}
];

let state={selectedCategory:Object.keys(CATEGORIES)[0],selectedTemplateId:TEMPLATES[0].id,
fields:{title:TEMPLATES[0].title,subtitle:'Subtitle',date:'',venue:'',contact:''},
photoDataUrl:null,paid:false,lastCheckoutId:null};

function showStatus(msg,opt={}){payStatus.textContent=msg;payStatus.style.color=opt.error?'#b91c1c':'#374151';}
function getTemplate(){return TEMPLATES.find(t=>t.id===state.selectedTemplateId)||TEMPLATES[0];}

// render helpers
function renderCategories(){
 categoriesEl.innerHTML='';
 Object.keys(CATEGORIES).forEach(c=>{
  const b=document.createElement('button');b.className='cat-btn'+(state.selectedCategory===c?' active':'');
  b.textContent=c;b.onclick=()=>{state.selectedCategory=c;renderTemplates();renderCategories();};
  categoriesEl.appendChild(b);
 });
}
function renderTemplates(){
 templatesGridEl.innerHTML='';
 TEMPLATES.filter(t=>t.category===state.selectedCategory).forEach(t=>{
  const d=document.createElement('div');d.className='template-card';
  d.innerHTML=`<div class='template-thumb' style='background:${t.bg}'>${t.title.split(' ')[0]}</div>
               <div class='template-meta'><h4>${t.title}</h4><p>${t.category} • KES ${t.price}</p></div>`;
  d.onclick=()=>selectTemplate(t.id);templatesGridEl.appendChild(d);
 });
}
function renderTemplateSelect(){
 templateSelectEl.innerHTML='';TEMPLATES.forEach(t=>{const o=document.createElement('option');
 o.value=t.id;o.textContent=`${t.title} — KES ${t.price}`;templateSelectEl.appendChild(o);});
 templateSelectEl.value=state.selectedTemplateId;priceSpan.textContent=getTemplate().price;
 flierPriceTag.textContent='KES '+getTemplate().price;
}
function renderPreview(){
 const f=state.fields,t=getTemplate();
 flierTitle.textContent=f.title||'Title';flierSubtitle.textContent=f.subtitle;
 flierDate.textContent=f.date||'TBA';flierVenue.textContent=f.venue||'TBA';flierContact.textContent=f.contact||'TBA';
 if(state.photoDataUrl){heroArea.innerHTML=`<img src='${state.photoDataUrl}' style='width:100%;height:100%;object-fit:cover'>`;}
 else{heroArea.style.background=t.bg;heroArea.style.color=t.color;heroArea.innerHTML=`<div style='text-align:center'><b>${f.title}</b><div>${t.category}</div></div>`;}
}
function selectTemplate(id){state.selectedTemplateId=id;state.fields.title=getTemplate().title;renderTemplateSelect();renderPreview();}

// inputs
[titleInput,subtitleInput,dateInput,venueInput,contactInput].forEach(inp=>{
 inp.oninput=()=>{state.fields[inp.id.replace('Input','')]=inp.value;renderPreview();}
});
photoInput.onchange=e=>{
 const f=e.target.files[0];if(!f)return;const r=new FileReader();
 r.onload=ev=>{state.photoDataUrl=ev.target.result;renderPreview();};r.readAsDataURL(f);
};

// backend helpers
async function initiatePayment(phone,amount){
 const r=await fetch(`${BACKEND_BASE}/pay`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,amount})});
 const j=await r.json();if(!r.ok)throw j;return j;
}
async function pollStatus(phone,timeout=90000,interval=3000){
 const start=Date.now();while(Date.now()-start<timeout){
  const r=await fetch(`${BACKEND_BASE}/status?phone=${phone}`);if(r.status===404){await new Promise(r=>setTimeout(r,interval));continue;}
  const j=await r.json();if(j.status!=='Pending')return j;await new Promise(r=>setTimeout(r,interval));
 }throw new Error('Timed out waiting for payment confirmation.');
}
function normalizePhone(p){if(!p)return null;const c=p.replace(/\s|\+|-/g,'');
 if(/^7\d{8}$/.test(c))return'0'+c;if(/^07\d{8}$/.test(c))return c;if(/^2547\d{8}$/.test(c))return c;return null;}

// payment
buyBtn.onclick=async()=>{
 const phone=normalizePhone(paymentPhoneInput.value);const amt=Number(amountInput.value);
 if(!phone)return showStatus('Enter valid phone 07XXXXXXXX',{error:true});
 if(!amt||amt<=0)return showStatus('Enter valid amount',{error:true});
 if(amt>MAX_AMOUNT)return showStatus(`Max KES ${MAX_AMOUNT}`,{error:true});
 showStatus('Sending STK push...');buyBtn.disabled=true;
 try{
  const init=await initiatePayment(phone,amt);state.lastCheckoutId=init.checkoutId;
  showStatus('Check your phone and approve payment...');
  const res=await pollStatus(phone);if(/success/i.test(res.status)){state.paid=true;showStatus('Payment confirmed. You can download now.');buyBtn.textContent='Paid ✓';buyBtn.style.background='#10b981';}
  else{showStatus('Payment failed — '+(res.resultDesc||res.status),{error:true});buyBtn.disabled=false;}
 }catch(e){console.error(e);showStatus('Error '+(e.message||JSON.stringify(e)),{error:true});buyBtn.disabled=false;}
};

// reset/save/download
resetPaymentBtn.onclick=()=>{state.paid=false;buyBtn.disabled=false;buyBtn.textContent=`Buy (KES ${getTemplate().price})`;showStatus('');};
saveDraftBtn.onclick=()=>{const d=JSON.parse(localStorage.getItem('peron_drafts')||'[]');d.push({...state});localStorage.setItem('peron_drafts',JSON.stringify(d));alert('Draft saved');};
downloadBtn.onclick=async()=>{if(!state.paid)return alert('Pay first');const c=await html2canvas(document.getElementById('flierPreview'),{scale:2});const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='flier.png';a.click();};
downloadPDFBtn.onclick=async()=>{if(!state.paid)return alert('Pay first');const c=await html2canvas(document.getElementById('flierPreview'),{scale:2});const w=window.open('');w.document.write('<img src="'+c.toDataURL('image/png')+'" style="max-width:100%">');w.document.close();};

// init
renderCategories();renderTemplates();renderTemplateSelect();renderPreview();
