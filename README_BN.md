# Alor Poth Coaching Centre — GitHub Website

এই প্রজেক্টটি GitHub Pages-এ প্রকাশযোগ্য একটি responsive coaching-centre website।
ভর্তি, রেজাল্ট, Admin Login, PDF ও নোটিশ চালাতে Supabase project configure করতে হবে।

## ফাইল
- `index.html` — ওয়েবসাইটের পৃষ্ঠা
- `style.css` — ডিজাইন
- `app.js` — ফর্ম, রেজাল্ট ও Admin Dashboard
- `config.js` — Supabase public project URL ও anon key
- `supabase_setup.sql` — ডেটাবেস ও নিরাপত্তা নীতির SQL

## ১) Supabase সেটআপ
1. Supabase-এ নতুন project তৈরি করুন।
2. Project Dashboard → SQL Editor → New query খুলুন।
3. `supabase_setup.sql`-এর সম্পূর্ণ SQL পেস্ট করে Run করুন।
4. Authentication → Users → Add user থেকে Admin email/password তৈরি করুন।
5. তৈরি হওয়া Admin user-এর UUID কপি করুন।
6. SQL Editor-এ নিচের কমান্ড চালান (UUID বদলে):
   `insert into public.admins(user_id) values ('YOUR-ADMIN-USER-UUID');`
7. Project Settings → API থেকে Project URL এবং `anon`/publishable key কপি করুন।
8. `config.js`-এ URL ও anon key বসান। `service_role` key কখনো frontend/GitHub-এ দেবেন না।

## ২) GitHub-এ আপলোড
1. GitHub-এ নতুন Public repository তৈরি করুন, যেমন `alor-poth-coaching`.
2. এই ZIP extract করে ভেতরের পাঁচটি ফাইল repository-র root-এ upload করুন।
3. `config.js`-এ Supabase URL ও anon key বসিয়ে commit করুন।
4. Repository → Settings → Pages খুলুন।
5. Build and deployment-এ `Deploy from a branch` নির্বাচন করুন।
6. Branch `main`, folder `/ (root)` নির্বাচন করে Save করুন।
7. কয়েক মিনিট পর GitHub Pages URL তৈরি হবে।

## ৩) গুরুত্বপূর্ণ
- Public anon key frontend-এ রাখা স্বাভাবিক; নিরাপত্তা RLS policy দিয়ে নিয়ন্ত্রিত।
- Supabase `service_role` key, database password বা Admin password কখনো GitHub-এ রাখবেন না।
- রেজাল্ট খোঁজার জন্য রোল + নাম + জন্মতারিখ + শ্রেণি exact match লাগে।
- PDF bucket public read; PDF link যার কাছে থাকবে সে PDF দেখতে পারবে।
- প্রথমে test data দিয়ে সব ফিচার পরীক্ষা করুন। বাস্তব শিক্ষার্থীর ব্যক্তিগত তথ্য ব্যবহারের আগে access policies যাচাই করুন।
- GitHub Pages static hosting; database/backend Supabase-এ চলে।
