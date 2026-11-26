
  const cfg = window.APP_CONFIG || {};
  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("PASTE_") && !cfg.SUPABASE_ANON_KEY.includes("PASTE_");
  const db = configured && window.supabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  const $ = id => document.getElementById(id);
  const toast = msg => { const el=$("toast"); el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),3500); };
  const val = (form, name) => String(new FormData(form).get(name) || "").trim();
  $("year").textContent = new Date().getFullYear();
  $("menuBtn").addEventListener("click",()=>$("navLinks").classList.toggle("open"));
  document.querySelectorAll(".navlinks a").forEach(a=>a.addEventListener("click",()=>$("navLinks").classList.remove("open")));
  if (!db) {
    $("resourceList").innerHTML='<p class="muted">PDF নোটস প্রকাশিত হলে এখানে দেখা যাবে।</p>';
    $("noticeList").innerHTML='<p class="muted">এখনও কোনো নোটিশ প্রকাশ করা হয়নি।</p>';
    $("admissionForm").addEventListener("submit",e=>{e.preventDefault();$("admissionMsg").textContent="ওয়েবসাইটের ডেটাবেস সংযোগ এখনও সেটআপ করা হয়নি। Supabase সেটিংস যোগ করার পর আবেদন জমা নেওয়া যাবে।";});
    $("resultForm").addEventListener("submit",e=>{e.preventDefault();$("resultOutput").textContent="রেজাল্ট পরিষেবা চালু করতে ডেটাবেস সেটআপ প্রয়োজন।";});
  } else {
    $("admissionForm").addEventListener("submit",async e=>{
      e.preventDefault(); const f=e.currentTarget; const msg=$("admissionMsg"); msg.textContent="আবেদন জমা হচ্ছে…";
      const row={student_name:val(f,"student_name"),guardian_name:val(f,"guardian_name"),dob:val(f,"dob"),class_name:val(f,"class_name"),phone:val(f,"phone"),address:val(f,"address")};
      const {error}=await db.from("admissions").insert(row);
      if(error){msg.textContent="আবেদন জমা হয়নি: "+error.message;return;}
      msg.textContent="আপনার আবেদন গ্রহণ করা হয়েছে। কর্তৃপক্ষ যাচাই করে যোগাযোগ করবেন।";f.reset();
    });
    $("resultForm").addEventListener("submit",async e=>{
      e.preventDefault(); const f=e.currentTarget, out=$("resultOutput"); out.textContent="ফলাফল খোঁজা হচ্ছে…";
      const {data,error}=await db.rpc("lookup_student_result",{p_roll_no:val(f,"roll_no"),p_student_name:val(f,"student_name"),p_dob:val(f,"dob"),p_class_name:val(f,"class_name")});
      if(error){out.textContent="ফলাফল খোঁজা যাচ্ছে না। পরে আবার চেষ্টা করুন।";return;}
      if(!data || !data.length){out.textContent="এই তথ্যের সঙ্গে মেলে এমন প্রকাশিত ফলাফল পাওয়া যায়নি।";return;}
      const r=data[0]; out.innerHTML=`<div class="result-card"><h4>পরীক্ষার ফলাফল</h4><table><tr><td>নাম</td><td>${esc(r.student_name)}</td></tr><tr><td>রোল</td><td>${esc(r.roll_no)}</td></tr><tr><td>শ্রেণি</td><td>${esc(r.class_name)}</td></tr><tr><td>পরীক্ষা</td><td>${esc(r.exam_name)}</td></tr><tr><td>প্রাপ্ত নম্বর</td><td>${esc(r.marks)}</td></tr><tr><td>পূর্ণমান</td><td>${esc(r.total_marks)}</td></tr><tr><td>গ্রেড</td><td>${esc(r.grade||"—")}</td></tr></table></div>`;
    });
    loadPublic();
  }
  function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  async function loadPublic(){
    const [rs,ns]=await Promise.all([db.from("resources").select("title,file_url,created_at").eq("is_published",true).order("created_at",{ascending:false}),db.from("notices").select("title,body,created_at").eq("is_published",true).order("created_at",{ascending:false})]);
    $("resourceList").innerHTML=rs.error?'<p class="muted">নোটস লোড করা যায়নি।</p>':(rs.data.length?rs.data.map(x=>`<article class="resource"><span class="pdf">📄</span><div><a href="${esc(x.file_url)}" target="_blank" rel="noopener">${esc(x.title)}</a><div class="muted small">PDF / শিক্ষাসামগ্রী</div></div></article>`).join(""):'<p class="muted">এখনও কোনো PDF প্রকাশ করা হয়নি।</p>');
    $("noticeList").innerHTML=ns.error?'<p class="muted">নোটিশ লোড করা যায়নি।</p>':(ns.data.length?ns.data.map(x=>`<article class="notice-item"><b>${esc(x.title)}</b><div>${esc(x.body)}</div></article>`).join(""):'<p class="muted">এখনও কোনো নোটিশ প্রকাশ করা হয়নি।</p>');
  }
  $("adminOpen").addEventListener("click",()=>{ $("adminDialog").showModal(); });
  $("loginForm").addEventListener("submit",async e=>{
    e.preventDefault(); if(!db){$("loginMsg").textContent="প্রথমে Supabase সংযোগ সেটআপ করুন।";return;}
    const f=e.currentTarget; const {data,error}=await db.auth.signInWithPassword({email:val(f,"email"),password:val(f,"password")});
    if(error){$("loginMsg").textContent="লগইন করা যায়নি। ইমেল ও পাসওয়ার্ড যাচাই করুন।";return;}
    await showAdmin(data.user);
  });
  async function showAdmin(user){
    $("loginPanel").hidden=true;$("adminPanel").hidden=false;$("adminEmail").textContent=user.email; await adminTab("admissions");
  }
  $("logoutBtn").addEventListener("click",async()=>{await db.auth.signOut();$("adminPanel").hidden=true;$("loginPanel").hidden=false;});
  document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>adminTab(b.dataset.tab)));
  async function adminTab(tab){
    const box=$("adminContent"); box.innerHTML='<p class="muted">লোড হচ্ছে…</p>';
    if(tab==="admissions"){
      const {data,error}=await db.from("admissions").select("*").order("created_at",{ascending:false});
      if(error){box.textContent="তালিকা লোড করা যায়নি।";return;}
      box.innerHTML="<h3>ভর্তি আবেদন</h3>"+(data.length?data.map(a=>`<div class="admin-box"><b>${esc(a.student_name)}</b> — ${esc(a.class_name)}<p>অভিভাবক: ${esc(a.guardian_name)} | ফোন: ${esc(a.phone)}</p><p>জন্মতারিখ: ${esc(a.dob)} | ${esc(a.address)}</p><p>অবস্থা: ${esc(a.status)}</p><button class="admin-action" data-approve="${a.id}">অনুমোদন</button><button class="admin-action" data-reject="${a.id}">প্রত্যাখ্যান</button></div>`).join(""):'কোনো আবেদন নেই।');
      box.querySelectorAll("[data-approve]").forEach(b=>b.onclick=()=>updateAdmission(b.dataset.approve,"approved"));box.querySelectorAll("[data-reject]").forEach(b=>b.onclick=()=>updateAdmission(b.dataset.reject,"rejected"));
    } else if(tab==="resultsAdmin"){
      box.innerHTML=`<h3>নতুন রেজাল্ট প্রকাশ</h3><form id="resultAdd" class="admin-box form"><label>রোল নম্বর<input name="roll_no" required></label><label>শিক্ষার্থীর নাম<input name="student_name" required></label><label>জন্মতারিখ<input name="dob" type="date" required></label><label>শ্রেণি<input name="class_name" required></label><label>পরীক্ষার নাম<input name="exam_name" required></label><div class="form-row"><label>প্রাপ্ত নম্বর<input name="marks" type="number" required></label><label>পূর্ণমান<input name="total_marks" type="number" required></label></div><label>গ্রেড<input name="grade"></label><button class="btn primary">রেজাল্ট প্রকাশ করুন</button></form><div id="resultAdminMsg"></div>`;
      $("resultAdd").onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;const row={};["roll_no","student_name","dob","class_name","exam_name","grade"].forEach(k=>row[k]=val(f,k));row.marks=Number(val(f,"marks"));row.total_marks=Number(val(f,"total_marks"));const {error}=await db.from("results").insert(row);$("resultAdminMsg").textContent=error?error.message:"রেজাল্ট প্রকাশিত হয়েছে।";if(!error)f.reset();};
    } else if(tab==="resourcesAdmin"){
      box.innerHTML=`<h3>PDF আপলোড</h3><form id="pdfForm" class="admin-box form"><label>PDF-এর নাম<input name="title" required></label><label>PDF ফাইল<input name="file" type="file" accept="application/pdf" required></label><button class="btn primary">আপলোড ও প্রকাশ</button></form><div id="pdfMsg"></div>`;
      $("pdfForm").onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,file=f.elements.file.files[0];if(!file||file.type!=="application/pdf"){ $("pdfMsg").textContent="শুধু PDF ফাইল নির্বাচন করুন।";return;}const path=`${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;const up=await db.storage.from("study-pdfs").upload(path,file,{contentType:"application/pdf"});if(up.error){$("pdfMsg").textContent=up.error.message;return;}const pub=db.storage.from("study-pdfs").getPublicUrl(path).data.publicUrl;const ins=await db.from("resources").insert({title:val(f,"title"),file_url:pub,is_published:true});$("pdfMsg").textContent=ins.error?ins.error.message:"PDF আপলোড হয়েছে।";if(!ins.error){f.reset();loadPublic();}};
    } else if(tab==="noticesAdmin"){
      box.innerHTML=`<h3>নতুন নোটিশ প্রকাশ</h3><form id="noticeForm" class="admin-box form"><label>নোটিশের শিরোনাম<input name="title" required></label><label>বিস্তারিত<textarea name="body" rows="4" required></textarea></label><button class="btn primary">নোটিশ প্রকাশ করুন</button></form><div id="noticeMsg"></div>`;
      $("noticeForm").onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;const {error}=await db.from("notices").insert({title:val(f,"title"),body:val(f,"body"),is_published:true});$("noticeMsg").textContent=error?error.message:"নোটিশ প্রকাশিত হয়েছে।";if(!error){f.reset();loadPublic();}};
    }
  }
  async function updateAdmission(id,status){const {error}=await db.from("admissions").update({status}).eq("id",id);if(error)toast("পরিবর্তন করা যায়নি।");else{toast("আবেদনের অবস্থা পরিবর্তন হয়েছে।");adminTab("admissions");}}
  if(db){db.auth.getSession().then(({data})=>{if(data.session){$("adminDialog").showModal();showAdmin(data.session.user);}});}
})();
