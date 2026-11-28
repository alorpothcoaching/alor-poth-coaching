
(() => {
  const cfg = window.APP_CONFIG || {};
  const db = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  const $ = id => document.getElementById(id);
  const val = (form, name) => String(new FormData(form).get(name) || "").trim();
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
  const toast = msg => {
    const el = $("toast");
    if (el) {
      el.textContent = msg;
      el.classList.add("show");
      setTimeout(() => el.classList.remove("show"), 3500);
    }
  };

  $("year").textContent = new Date().getFullYear();
  $("menuBtn").addEventListener("click", () => $("navLinks").classList.toggle("open"));
  document.querySelectorAll(".navlinks a").forEach(a =>
    a.addEventListener("click", () => $("navLinks").classList.remove("open"))
  );

  if (!db) {
    $("resourceList").innerHTML = '<p class="muted">PDF নোটস প্রকাশিত হলে এখানে দেখা যাবে।</p>';
    $("noticeList").innerHTML = '<p class="muted">এখনও কোনো নোটিশ প্রকাশ করা হয়নি।</p>';
    $("admissionForm").addEventListener("submit", e => {
      e.preventDefault();
      $("admissionMsg").textContent = "প্রথমে Supabase সংযোগ সেটআপ করুন।";
    });
    $("resultForm").addEventListener("submit", e => {
      e.preventDefault();
      $("resultOutput").textContent = "ডেটাবেস সংযোগ প্রয়োজন।";
    });
    return;
  }

  
$("admissionForm").addEventListener("submit", async e => {
  e.preventDefault();

  const f = e.currentTarget;
  const msg = $("admissionMsg");

  msg.textContent = "আবেদন জমা হচ্ছে…";

  const { data, error } = await db.rpc("submit_admission", {
    p_student_name: val(f, "student_name"),
    p_guardian_name: val(f, "guardian_name"),
    p_dob: val(f, "dob"),
    p_class_name: val(f, "class_name"),
    p_phone: val(f, "phone"),
    p_address: val(f, "address")
  });

  if (error) {
    msg.textContent = "আবেদন জমা হয়নি: " + error.message;
  } else {
    msg.innerHTML =
      "আপনার আবেদন সফলভাবে জমা হয়েছে।<br>" +
      "আপনার Application ID: <strong>" + esc(data) + "</strong><br>" +
      "এই ID ভবিষ্যতের জন্য সংরক্ষণ করুন।";

    f.reset();
  }
});


  
$("admissionStatusForm").addEventListener("submit", async e => {
  e.preventDefault();

  const f = e.currentTarget;
  const out = $("admissionStatusOutput");

  out.textContent = "আবেদনের অবস্থা খোঁজা হচ্ছে…";

  const { data, error } = await db.rpc("check_admission_status", {
    p_application_id: val(f, "application_id").trim(),
    p_phone: val(f, "phone").trim()
  });

  if (error) {
    out.textContent = "যাচাই করা যায়নি। আবার চেষ্টা করুন।";
    return;
  }

  if (!data) {
    out.textContent = "Application ID অথবা মোবাইল নম্বর সঠিক নয়।";
    return;
  }

  const status = String(data).toLowerCase();

  const messages = {
    pending: "আপনার আবেদন বর্তমানে অপেক্ষমাণ (Pending)।",
    approved: "অভিনন্দন! আপনার ভর্তি আবেদন অনুমোদিত হয়েছে (Approved)।",
    rejected: "দুঃখিত, আপনার আবেদনটি অনুমোদিত হয়নি (Rejected)।"
  };

  out.textContent = messages[status] || "আবেদনের বর্তমান অবস্থা: " + data;
});

  $("resultForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.currentTarget, out = $("resultOutput");
    out.textContent = "ফলাফল খোঁজা হচ্ছে…";
    const { data, error } = await db.rpc("lookup_student_result", {
      p_roll_no: val(f,"roll_no"),
      p_student_name: val(f,"student_name"),
      p_dob: val(f,"dob"),
      p_class_name: val(f,"class_name")
    });
    if (error || !data || !data.length) {
      out.textContent = "প্রকাশিত ফলাফল পাওয়া যায়নি।";
      return;
    }
    const r = data[0];
    out.innerHTML = `<div class="result-card"><h4>পরীক্ষার ফলাফল</h4>
      <table>
      <tr><td>নাম</td><td>${esc(r.student_name)}</td></tr>
      <tr><td>রোল</td><td>${esc(r.roll_no)}</td></tr>
      <tr><td>শ্রেণি</td><td>${esc(r.class_name)}</td></tr>
      <tr><td>পরীক্ষা</td><td>${esc(r.exam_name)}</td></tr>
      <tr><td>প্রাপ্ত নম্বর</td><td>${esc(r.marks)}</td></tr>
      <tr><td>পূর্ণমান</td><td>${esc(r.total_marks)}</td></tr>
      <tr><td>গ্রেড</td><td>${esc(r.grade || "—")}</td></tr>
      </table></div>`;
  });

  async function loadPublic() {
    const [rs, ns] = await Promise.all([
      db.from("resources").select("id,title,file_url,created_at")
        .eq("is_published",true).order("created_at",{ascending:false}),
      db.from("notices").select("id,title,body,created_at")
        .eq("is_published",true).order("created_at",{ascending:false})
    ]);

    $("resourceList").innerHTML = rs.error
      ? '<p class="muted">নোটস লোড করা যায়নি।</p>'
      : (rs.data.length ? rs.data.map(x =>
        `<article class="resource"><span class="pdf">📄</span>
        <div><a href="${esc(x.file_url)}" target="_blank" rel="noopener">${esc(x.title)}</a>
        <div class="muted small">PDF / শিক্ষাসামগ্রী</div></div></article>`
      ).join("") : '<p class="muted">এখনও কোনো PDF প্রকাশ করা হয়নি।</p>');

    $("noticeList").innerHTML = ns.error
      ? '<p class="muted">নোটিশ লোড করা যায়নি।</p>'
      : (ns.data.length ? ns.data.map(x =>
        `<article class="notice-item"><b>${esc(x.title)}</b><div>${esc(x.body)}</div></article>`
      ).join("") : '<p class="muted">এখনও কোনো নোটিশ প্রকাশ করা হয়নি।</p>');
  }

  $("adminOpen").addEventListener("click", () => $("adminDialog").showModal());

  $("loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.currentTarget;
    const { data, error } = await db.auth.signInWithPassword({
      email: val(f,"email"),
      password: val(f,"password")
    });
    if (error) {
      $("loginMsg").textContent = "লগইন করা যায়নি। ইমেল ও পাসওয়ার্ড যাচাই করুন।";
      return;
    }
    await showAdmin(data.user);
  });

  async function showAdmin(user) {
    $("loginPanel").hidden = true;
    $("adminPanel").hidden = false;
    $("adminEmail").textContent = user.email;
    await adminTab("admissions");
  }

  $("logoutBtn").addEventListener("click", async () => {
    await db.auth.signOut();
    $("adminPanel").hidden = true;
    $("loginPanel").hidden = false;
  });

  document.querySelectorAll("[data-tab]").forEach(b =>
    b.addEventListener("click", () => adminTab(b.dataset.tab))
  );

  async function adminTab(tab) {
    const box = $("adminContent");
    box.innerHTML = '<p class="muted">লোড হচ্ছে…</p>';

    
if (tab === "admissions") {
  const { data, error } = await db.from("admissions").select("*")
    .order("created_at", { ascending: false });

  if (error) {
    box.textContent = "তালিকা লোড করা যায়নি: " + error.message;
    return;
  }

  box.innerHTML = "<h3>ভর্তি আবেদন</h3>" + (data.length ? data.map(a =>
    `<div class="admin-box">
      <b>${esc(a.student_name)}</b> — ${esc(a.class_name)}
      <p>অভিভাবক: ${esc(a.guardian_name)} | ফোন: ${esc(a.phone)}</p>
      <p>জন্মতারিখ: ${esc(a.dob)} | ${esc(a.address)}</p>
      <p>অবস্থা: ${esc(a.status)}</p>
      <button class="admin-action" data-approve="${a.id}">অনুমোদন</button>
      <button class="admin-action" data-reject="${a.id}">প্রত্যাখ্যান</button>
      <button class="admin-action" data-delete-admission="${a.id}">🗑️ আবেদন ডিলিট</button>
    </div>`
  ).join("") : "কোনো আবেদন নেই।");

  box.querySelectorAll("[data-approve]").forEach(b =>
    b.onclick = () => updateAdmission(b.dataset.approve, "approved"));

  box.querySelectorAll("[data-reject]").forEach(b =>
    b.onclick = () => updateAdmission(b.dataset.reject, "rejected"));

  box.querySelectorAll("[data-delete-admission]").forEach(b =>
    b.onclick = () => deleteAdmission(b.dataset.deleteAdmission));

} else if (tab === "resourcesAdmin") {

      box.innerHTML = `<h3>PDF আপলোড</h3>
      <form id="pdfForm" class="admin-box form">
      <label>PDF-এর নাম<input name="title" required></label>
      <label>PDF ফাইল<input name="file" type="file" accept="application/pdf" required></label>
      <button class="btn primary">আপলোড ও প্রকাশ</button></form>
      <div id="pdfMsg"></div><hr><h3>আপলোড করা PDF মুছুন</h3><div id="pdfAdminList">লোড হচ্ছে…</div>`;

      $("pdfForm").onsubmit = async e => {
        e.preventDefault();
        const f = e.currentTarget, file = f.elements.file.files[0];
        if (!file || file.type !== "application/pdf") {
          $("pdfMsg").textContent = "শুধু PDF ফাইল নির্বাচন করুন."; return;
        }
        const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
        const up = await db.storage.from("study-pdfs").upload(path,file,{contentType:"application/pdf"});
        if (up.error) { $("pdfMsg").textContent = up.error.message; return; }
        const pub = db.storage.from("study-pdfs").getPublicUrl(path).data.publicUrl;
        const ins = await db.from("resources").insert({
          title: val(f,"title"), file_url: pub, is_published: true
        });
        $("pdfMsg").textContent = ins.error ? ins.error.message : "PDF আপলোড হয়েছে।";
        if (!ins.error) { f.reset(); loadPublic(); adminTab("resourcesAdmin"); }
      };
      await loadPdfAdmin();

    } else if (tab === "resultsAdmin") {

  box.innerHTML = `
    <h3>ছাত্রছাত্রীদের রেজাল্ট প্রকাশ</h3>

    <form id="resultAdminForm" class="admin-box form">

      <label>রোল নম্বর
        <input name="roll_no" required>
      </label>

      <label>ছাত্রের নাম
        <input name="student_name" required>
      </label>

      <label>জন্মতারিখ
        <input name="dob" type="date" required>
      </label>

      <label>শ্রেণি
        <input name="class_name" required>
      </label>

      <label>পরীক্ষার নাম
        <input name="exam_name" required>
      </label>

      <label>প্রাপ্ত নম্বর
        <input name="marks" type="number" required>
      </label>

      <label>পূর্ণমান
        <input name="total_marks" type="number" required>
      </label>

      <label>গ্রেড
        <input name="grade">
      </label>

      <button class="btn primary">রেজাল্ট প্রকাশ করুন</button>
    </form>

    <div id="resultAdminMsg"></div>
  `;

  $("resultAdminForm").onsubmit = async e => {
    e.preventDefault();

    const f = e.currentTarget;

    const { error } = await db.from("results").insert({
      roll_no: val(f,"roll_no"),
      student_name: val(f,"student_name"),
      dob: val(f,"dob"),
      class_name: val(f,"class_name"),
      exam_name: val(f,"exam_name"),
      marks: Number(val(f,"marks")),
      total_marks: Number(val(f,"total_marks")),
      grade: val(f,"grade")
    });

    $("resultAdminMsg").textContent = error
      ? "রেজাল্ট প্রকাশ হয়নি: " + error.message
      : "রেজাল্ট সফলভাবে প্রকাশিত হয়েছে।";

    if (!error) f.reset();
  };

} else if (tab === "galleryAdmin") {

  box.innerHTML = `
    <h3>ফটো গ্যালারিতে ছবি আপলোড</h3>
    <form id="galleryForm" class="admin-box form">
      <label>ছবির নাম
        <input name="title" required maxlength="100">
      </label>
      <label>ছবি নির্বাচন করুন
        <input name="file" type="file" accept="image/*" required>
      </label>
      <button class="btn primary">ছবি আপলোড ও প্রকাশ</button>
    </form>
    <div id="galleryMsg"></div>
    <hr>
    <h3>আপলোড করা ছবি</h3>
    <div id="galleryAdminList">লোড হচ্ছে…</div>
  `;

  $("galleryForm").onsubmit = async e => {
    e.preventDefault();

    const f = e.currentTarget;
    const file = f.elements.file.files[0];
    const msg = $("galleryMsg");

    if (!file || !file.type.startsWith("image/")) {
      msg.textContent = "শুধু ছবির ফাইল নির্বাচন করুন।";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      msg.textContent = "ছবির সাইজ ৫ MB-এর কম হতে হবে।";
      return;
    }

    msg.textContent = "ছবি আপলোড হচ্ছে…";

    const path = Date.now() + "-" +
      file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

    const up = await db.storage
      .from("gallery-photos")
      .upload(path, file);

    if (up.error) {
      msg.textContent = up.error.message;
      return;
    }

    const url = db.storage
      .from("gallery-photos")
      .getPublicUrl(path).data.publicUrl;

    const ins = await db.from("gallery").insert({
      title: val(f, "title"),
      image_url: url,
      storage_path: path,
      is_published: true
    });

    if (ins.error) {
      await db.storage.from("gallery-photos").remove([path]);
      msg.textContent = ins.error.message;
      return;
    }

    msg.textContent = "ছবি সফলভাবে প্রকাশিত হয়েছে।";
    f.reset();
    adminTab("galleryAdmin");
    loadGalleryPublic();
  };

  const { data, error } = await db
    .from("gallery")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    $("galleryAdminList").textContent = error.message;
  } else if (!data.length) {
    $("galleryAdminList").textContent = "এখনও কোনো ছবি আপলোড করা হয়নি।";
  } else {
    $("galleryAdminList").innerHTML = data.map(item => `
      <div class="admin-box">
        <img src="${esc(item.image_url)}"
          alt="${esc(item.title)}"
          style="width:120px;border-radius:8px">
        <p>${esc(item.title)}</p>
        <button class="btn secondary"
          data-gallery-delete="${esc(item.id)}">
          ছবি মুছুন
        </button>
      </div>
    `).join("");

    $("galleryAdminList").querySelectorAll("[data-gallery-delete]")
      .forEach(button => {
        button.onclick = async () => {
          if (!confirm("ছবিটি মুছে ফেলবেন?")) return;

          const item = data.find(x => x.id === button.dataset.galleryDelete);
          if (!item) return;

          const removed = await db.storage
            .from("gallery-photos").remove([item.storage_path]);

          if (removed.error) {
            alert(removed.error.message);
            return;
          }

          const deleted = await db.from("gallery")
            .delete().eq("id", item.id);

          if (deleted.error) {
            alert(deleted.error.message);
            return;
          }

          adminTab("galleryAdmin");
          loadGalleryPublic();
        };
      });
  }

} else if (tab === "noticesAdmin") {
      box.innerHTML = `<h3>নতুন নোটিশ প্রকাশ</h3>
      <form id="noticeForm" class="admin-box form">
      <label>নোটিশের শিরোনাম<input name="title" required></label>
      <label>বিস্তারিত<textarea name="body" rows="4" required></textarea></label>
      <button class="btn primary">নোটিশ প্রকাশ করুন</button></form>
      <div id="noticeMsg"></div><hr><h3>প্রকাশিত নোটিশ মুছুন</h3><div id="noticeAdminList">লোড হচ্ছে…</div>`;

      $("noticeForm").onsubmit = async e => {
        e.preventDefault();
        const f = e.currentTarget;
        const { error } = await db.from("notices").insert({
          title: val(f,"title"), body: val(f,"body"), is_published: true
        });
        $("noticeMsg").textContent = error ? error.message : "নোটিশ প্রকাশিত হয়েছে।";
        if (!error) { f.reset(); loadPublic(); adminTab("noticesAdmin"); }
      };
      await loadNoticeAdmin();
    }
  }

  async function loadPdfAdmin() {
    const box = $("pdfAdminList");
    const { data, error } = await db.from("resources").select("id,title,file_url")
      .order("created_at",{ascending:false});
    if (error) { box.textContent = "PDF তালিকা লোড হয়নি: " + error.message; return; }
    box.innerHTML = data.length ? data.map(x =>
      `<div class="admin-box"><b>${esc(x.title)}</b>
      <button class="admin-action" data-delete-pdf="${x.id}">🗑️ PDF ডিলিট</button></div>`
    ).join("") : "কোনো PDF নেই।";

    box.querySelectorAll("[data-delete-pdf]").forEach(b => {
      b.onclick = () => deletePdf(b.dataset.deletePdf);
    });
  }

  async function deletePdf(id) {
    if (!confirm("আপনি কি নিশ্চিত এই PDF ডিলিট করতে চান?")) return;
    const { data, error } = await db.from("resources").select("file_url")
      .eq("id",id).single();
    if (error || !data) { toast("PDF-এর তথ্য পাওয়া যায়নি।"); return; }

    const marker = "/storage/v1/object/public/study-pdfs/";
    const url = data.file_url || "";
    const path = url.includes(marker) ? decodeURIComponent(url.split(marker)[1]) : null;
    if (path) {
      const removed = await db.storage.from("study-pdfs").remove([path]);
      if (removed.error) { toast("Storage থেকে PDF মুছতে সমস্যা: " + removed.error.message); return; }
    }

    const result = await db.from("resources").delete().eq("id",id);
    if (result.error) { toast("ডেটাবেস থেকে মুছতে সমস্যা: " + result.error.message); return; }
    toast("PDF ডিলিট হয়েছে।");
    loadPublic();
    adminTab("resourcesAdmin");
  }

  async function loadNoticeAdmin() {
    const box = $("noticeAdminList");
    const { data, error } = await db.from("notices").select("id,title")
      .order("created_at",{ascending:false});
    if (error) { box.textContent = "নোটিশ তালিকা লোড হয়নি: " + error.message; return; }
    box.innerHTML = data.length ? data.map(x =>
      `<div class="admin-box"><b>${esc(x.title)}</b>
      <button class="admin-action" data-delete-notice="${x.id}">🗑️ নোটিশ ডিলিট</button></div>`
    ).join("") : "কোনো নোটিশ নেই।";

    box.querySelectorAll("[data-delete-notice]").forEach(b => {
      b.onclick = () => deleteNotice(b.dataset.deleteNotice);
    });
  }

  async function deleteNotice(id) {
    if (!confirm("আপনি কি নিশ্চিত এই নোটিশ ডিলিট করতে চান?")) return;
    const { error } = await db.from("notices").delete().eq("id",id);
    if (error) { toast("নোটিশ ডিলিট হয়নি: " + error.message); return; }
    toast("নোটিশ ডিলিট হয়েছে।");
    loadPublic();
    adminTab("noticesAdmin");
  }

async function deleteAdmission(id) {
  if (!confirm("আপনি কি নিশ্চিত এই ভর্তি আবেদনটি ডিলিট করতে চান?")) {
    return;
  }

  const { error } = await db
    .from("admissions")
    .delete()
    .eq("id", id);

  if (error) {
    toast("আবেদন ডিলিট হয়নি: " + error.message);
    return;
  }

  toast("ভর্তি আবেদন সফলভাবে ডিলিট হয়েছে।");
  await adminTab("admissions");
}
  
  async function updateAdmission(id,status) {
    const { error } = await db.from("admissions").update({status}).eq("id",id);
    if (error) toast("পরিবর্তন করা যায়নি।");
    else { toast("আবেদনের অবস্থা পরিবর্তন হয়েছে।"); adminTab("admissions"); }
  }

  db.auth.getSession().then(({data}) => {
    if (data.session) {
      $("adminDialog").showModal();
      showAdmin(data.session.user);
    }
  });

  loadPublic();
})();
