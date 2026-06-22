/**
 * Alfal.id Platform Engine v2
 * Modular gamification, XP, achievements, SRS, security
 */
(function (global) {
  'use strict';

  const CONFIG = {
    XP_WORD: 5,
    XP_DAY: 50,
    XP_QUIZ: 100,
    XP_CHALLENGE: 150,
    TOTAL_DAYS: 30,
    SRS_INTERVALS: [1, 3, 7, 14, 30],
    ADMIN_TOKEN: 'MUSYRIF',
    STUDENT_TOKEN: '09876',
  };

  const LEVELS = [
    { level: 1, minXp: 0, title: 'Santri Baru' },
    { level: 2, minXp: 200, title: 'Muhibbul Arabiyah' },
    { level: 3, minXp: 500, title: 'Thalib Mujtahid' },
    { level: 4, minXp: 1000, title: 'Mutafawwiq' },
    { level: 5, minXp: 2000, title: 'Ahli Mufrodat' },
    { level: 6, minXp: 4000, title: 'Mutarjim' },
    { level: 7, minXp: 8000, title: 'Ahli Bahasa Arab' },
  ];

  const AVATARS = [
    { id: 'santri_baru', emoji: '👦', label: 'Santri Baru', gender: 'laki-laki' },
    { id: 'santri_belajar', emoji: '🧑‍🎓', label: 'Santri Belajar', gender: 'laki-laki' },
    { id: 'santri_peci_hitam', emoji: '👨‍🎓', label: 'Santri Berpeci Hitam', gender: 'laki-laki' },
    { id: 'santri_peci_putih', emoji: '🕌', label: 'Santri Berpeci Putih', gender: 'laki-laki' },
    { id: 'ustadz', emoji: '👨‍🏫', label: 'Ustadz', gender: 'laki-laki' },
    { id: 'santriwati_baru', emoji: '👧', label: 'Santriwati Baru', gender: 'perempuan' },
    { id: 'santriwati_hijau', emoji: '🧕', label: 'Santriwati Berjilbab Hijau', gender: 'perempuan' },
    { id: 'santriwati_biru', emoji: '🧕', label: 'Santriwati Berjilbab Biru', gender: 'perempuan' },
    { id: 'santriwati_hitam', emoji: '🧕', label: 'Santriwati Berjilbab Hitam', gender: 'perempuan' },
    { id: 'ustadzah', emoji: '👩‍🏫', label: 'Ustadzah', gender: 'perempuan' },
  ];

  const AVATAR_LEGACY_MAP = {
    santri: 'santri_baru',
    pelajar: 'santri_belajar',
    penuntut: 'santri_peci_putih',
  };

  const resolveAvatarId = (id) => AVATAR_LEGACY_MAP[id] || id || 'santri_baru';

  const getAvatarById = (id) => AVATARS.find((a) => a.id === resolveAvatarId(id)) || AVATARS[0];

  const getAvatarsByGender = (gender) => {
    if (!gender) return AVATARS;
    return AVATARS.filter((a) => a.gender === gender);
  };

  const getProfileDisplay = (profile) => {
    const photo = profile?.profilePhoto || profile?.profilePhotoUrl || null;
    if (photo) return { type: 'photo', src: photo, label: 'Foto Saya' };
    const av = getAvatarById(profile?.avatar);
    return { type: 'emoji', emoji: av.emoji, label: av.label };
  };

  const ACHIEVEMENTS = [
    { id: 'words_50', emoji: '🥇', title: 'Hafal 50 Kata', desc: 'Pelajari 50 kosakata', check: (s) => s.totalWords >= 50 },
    { id: 'words_100', emoji: '🥈', title: 'Hafal 100 Kata', desc: 'Pelajari 100 kosakata', check: (s) => s.totalWords >= 100 },
    { id: 'words_300', emoji: '🥉', title: 'Hafal 300 Kata', desc: 'Pelajari 300 kosakata', check: (s) => s.totalWords >= 300 },
    { id: 'day_5', emoji: '📚', title: 'Selesaikan Hari 5', desc: 'Tuntaskan 5 hari belajar', check: (s) => s.completedDays >= 5 },
    { id: 'day_10', emoji: '📚', title: 'Selesaikan Hari 10', desc: 'Tuntaskan 10 hari belajar', check: (s) => s.completedDays >= 10 },
    { id: 'day_30', emoji: '📚', title: 'Selesaikan Hari 30', desc: 'Tuntaskan seluruh perjalanan', check: (s) => s.completedDays >= 30 },
    { id: 'streak_7', emoji: '🔥', title: 'Streak 7 Hari', desc: 'Belajar 7 hari berturut', check: (s) => s.dailyStreak >= 7 },
    { id: 'streak_30', emoji: '🔥', title: 'Streak 30 Hari', desc: 'Belajar 30 hari berturut', check: (s) => s.dailyStreak >= 30 },
    { id: 'quiz_perfect', emoji: '🏆', title: 'Quiz Sempurna', desc: 'Lulus quiz tanpa kesalahan', check: (s) => s.perfectQuizzes >= 1 },
  ];

  const hashStr = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    return Math.abs(h).toString(36);
  };

  const todayKey = () => new Date().toISOString().slice(0, 10);

  const getProfileKey = (name) => `alfal_profile_${name}`;
  const getLeaderboardKey = () => 'alfal_leaderboard_v2';

  const createEmptyProfile = () => ({
    xp: 0,
    xpLog: [],
    avatar: 'santri_baru',
    profilePhoto: null,
    profilePhotoUrl: null,
    gender: '',
    kelas: '',
    angkatan: '',
    className: '',
    batchYear: '',
    role: 'santri',
    dailyStreak: 0,
    lastStudyDate: null,
    streakBrokenNotified: false,
    achievements: [],
    dailyChallenge: { date: null, words: 0, quiz: false, minutes: 0, completed: false, claimed: false },
    srs: {},
    quizStats: { perfect: 0, total: 0 },
    studyMinutesToday: 0,
    studySessionStart: null,
    certificateId: null,
    integrityHash: '',
    updatedAt: Date.now(),
  });

  const normalizeProfile = (raw) => {
    const base = { ...createEmptyProfile(), ...(raw && typeof raw === 'object' ? raw : {}) };
    base.achievements = Array.isArray(base.achievements) ? base.achievements : [];
    base.srs = base.srs && typeof base.srs === 'object' ? base.srs : {};
    base.dailyChallenge = base.dailyChallenge && typeof base.dailyChallenge === 'object'
      ? base.dailyChallenge
      : createEmptyProfile().dailyChallenge;
    base.quizStats = base.quizStats && typeof base.quizStats === 'object'
      ? { ...createEmptyProfile().quizStats, ...base.quizStats }
      : createEmptyProfile().quizStats;
    base.xp = Number(base.xp) || 0;
    base.dailyStreak = Number(base.dailyStreak) || 0;
    base.avatar = resolveAvatarId(base.avatar);
    base.gender = base.gender || '';
    base.profilePhoto = base.profilePhoto || null;
    base.profilePhotoUrl = base.profilePhotoUrl || null;
    if (base.className && !base.kelas) base.kelas = base.className;
    if (base.batchYear && !base.angkatan) base.angkatan = base.batchYear;
    base.className = base.kelas || base.className || '';
    base.batchYear = base.angkatan || base.batchYear || '';
    const av = getAvatarById(base.avatar);
    if (base.gender && av.gender !== base.gender) {
      const fallback = getAvatarsByGender(base.gender)[0];
      if (fallback) base.avatar = fallback.id;
    }
    return base;
  };

  const loadProfile = (name) => {
    try {
      const raw = localStorage.getItem(getProfileKey(name));
      return normalizeProfile(raw ? JSON.parse(raw) : {});
    } catch (e) {
      console.error('[AlfalEngine] loadProfile gagal:', e);
      return createEmptyProfile();
    }
  };

  const computeIntegrityHash = (name, profile, progress) => {
    const achievements = Array.isArray(profile?.achievements) ? [...profile.achievements].sort() : [];
    const payload = JSON.stringify({
      name,
      xp: profile?.xp || 0,
      achievements,
      completed: Object.keys(progress || {}).filter((d) => progress[d]?.completed).sort(),
    });
    return hashStr(payload + name);
  };

  const validateProfile = (name, profile, progress) => {
    if (!profile.integrityHash) return true;
    return profile.integrityHash === computeIntegrityHash(name, profile, progress);
  };

  const saveProfile = (name, profile, progress) => {
    profile.integrityHash = computeIntegrityHash(name, profile, progress);
    profile.updatedAt = Date.now();
    localStorage.setItem(getProfileKey(name), JSON.stringify(profile));
    updateLeaderboard(name, profile, progress);
    return profile;
  };

  const getLevelInfo = (xp) => {
    let current = LEVELS[0];
    let next = LEVELS[1];
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].minXp) {
        current = LEVELS[i];
        next = LEVELS[i + 1] || null;
        break;
      }
    }
    const progress = next
      ? Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100)
      : 100;
    return { ...current, next, progress: Math.min(100, Math.max(0, progress)), xp };
  };

  const addXP = (profile, amount, reason) => {
    if (amount <= 0 || amount > 500) return profile;
    profile.xp = (profile.xp || 0) + amount;
    profile.xpLog = [{ amount, reason, at: Date.now() }, ...(profile.xpLog || [])].slice(0, 50);
    return profile;
  };

  const updateDailyStreak = (profile) => {
    const today = todayKey();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (profile.lastStudyDate === today) return { profile, broken: false };
    if (profile.lastStudyDate === yesterday) {
      profile.dailyStreak = (profile.dailyStreak || 0) + 1;
    } else if (profile.lastStudyDate && profile.lastStudyDate !== today) {
      if ((profile.dailyStreak || 0) > 0) profile.streakBrokenNotified = false;
      profile.dailyStreak = 1;
      return { profile, broken: profile.lastStudyDate !== yesterday && profile.lastStudyDate !== today };
    } else {
      profile.dailyStreak = 1;
    }
    profile.lastStudyDate = today;
    profile.streakBrokenNotified = false;
    return { profile, broken: false };
  };

  const getStreakDisplay = (streak) => {
    if (streak >= 30) return '🔥'.repeat(7) + ' 30 Hari';
    if (streak >= 7) return '🔥'.repeat(5) + ' 7 Hari';
    if (streak >= 3) return '🔥🔥🔥 3 Hari';
    if (streak >= 1) return '🔥 1 Hari';
    return 'Mulai streak hari ini!';
  };

  const getStats = (progress, profile, myScores) => {
    let totalWords = 0;
    let completedDays = 0;
    Object.keys(progress || {}).forEach((d) => {
      totalWords += (progress[d]?.wordsLearned?.length || 0);
      if (progress[d]?.completed) completedDays++;
    });
    const perfectQuizzes = (myScores || []).filter((s) => s.score === 100).length;
    return {
      totalWords,
      completedDays,
      dailyStreak: profile?.dailyStreak || 0,
      perfectQuizzes: Math.max(profile?.quizStats?.perfect || 0, perfectQuizzes),
      quizzesPassed: (myScores || []).filter((s) => s.score >= 80).length,
      xp: profile?.xp || 0,
    };
  };

  const checkAchievements = (profile, stats) => {
    const unlocked = [...(profile.achievements || [])];
    let changed = false;
    ACHIEVEMENTS.forEach((a) => {
      if (!unlocked.includes(a.id) && a.check(stats)) {
        unlocked.push(a.id);
        changed = true;
      }
    });
    if (changed) profile.achievements = unlocked;
    return profile;
  };

  const buildJourneyNodes = (totalDays) => {
    const nodes = [{ id: 'start', type: 'start', label: 'Start', emoji: '🏁' }];
    for (let d = 1; d <= totalDays; d++) {
      nodes.push({ id: `day-${d}`, type: 'day', day: d, label: `Hari ${d}`, emoji: '📚' });
      if (d % 2 === 0 && d < totalDays) {
        nodes.push({ id: `quiz-${d}`, type: 'quiz', day: d, label: `Quiz ${d / 2}`, emoji: '🏆' });
      }
    }
    nodes.push({ id: 'finish', type: 'finish', label: 'Selesai', emoji: '🎓' });
    return nodes;
  };

  const getNodeStatus = (node, progress, selectedDay) => {
    if (!node) return 'locked';
    progress = progress || {};
    if (node.type === 'start') return 'completed';
    if (node.type === 'finish') {
      const allDone = Array.from({ length: totalDaysFromProgress(progress) }, (_, i) => i + 1)
        .every((d) => progress[d]?.completed);
      return allDone ? 'completed' : 'locked';
    }
    const day = node.day;
    if (!day) return 'locked';
    if (node.type === 'quiz') {
      if (!isDayUnlocked(day, progress)) return 'locked';
      if (progress[day]?.quizScore >= 80) return 'completed';
      if (day === selectedDay) return 'active';
      return isDayUnlocked(day, progress) ? 'active' : 'locked';
    }
    if (progress[day]?.completed) return 'completed';
    if (!isDayUnlocked(day, progress)) return 'locked';
    const firstActive = Array.from({ length: 30 }, (_, i) => i + 1).find(
      (d) => isDayUnlocked(d, progress) && !progress[d]?.completed
    );
    if (day === firstActive || day === selectedDay) return 'active';
    return 'active';
  };

  const totalDaysFromProgress = (progress) => {
    return Math.max(...Object.keys(progress || {}).map(Number), 30);
  };

  const isDayUnlocked = (day, progress) => {
    if (day === 1) return true;
    return progress[day - 1]?.completed === true;
  };

  const recordSRS = (profile, day, wordId, correct) => {
    if (!profile || typeof profile !== 'object') return createEmptyProfile();
    if (!profile.srs || typeof profile.srs !== 'object') profile.srs = {};
    const key = `${day}-${wordId}`;
    const entry = profile.srs[key] || { fails: 0, level: 0, nextReview: Date.now() };
    if (correct) {
      entry.level = Math.min((entry.level || 0) + 1, CONFIG.SRS_INTERVALS.length - 1);
      entry.fails = 0;
    } else {
      entry.fails = (entry.fails || 0) + 1;
      entry.level = 0;
    }
    const days = CONFIG.SRS_INTERVALS[entry.level] || 1;
    entry.nextReview = Date.now() + days * 86400000;
    profile.srs[key] = entry;
    return profile;
  };

  const getReviewList = (profile, mufrodatDb) => {
    profile = profile && typeof profile === 'object' ? profile : createEmptyProfile();
    mufrodatDb = mufrodatDb && typeof mufrodatDb === 'object' ? mufrodatDb : {};
    const now = Date.now();
    const due = [];
    const failed = [];
    const never = [];
    Object.entries(profile.srs || {}).forEach(([key, entry]) => {
      if (!entry || typeof entry !== 'object') return;
      const [day, wordId] = key.split('-').map(Number);
      const word = mufrodatDb[day]?.data?.find((w) => w.id === wordId);
      if (!word) return;
      const item = { ...word, day, key, entry };
      if ((entry.fails || 0) >= 2) failed.push(item);
      else if ((entry.nextReview || 0) <= now) due.push(item);
    });
    Object.keys(mufrodatDb).forEach((day) => {
      const dayData = mufrodatDb[day]?.data;
      if (!Array.isArray(dayData)) return;
      dayData.forEach((word) => {
        if (!word) return;
        const key = `${day}-${word.id}`;
        if (!profile.srs?.[key]) never.push({ ...word, day, key });
      });
    });
    return {
      due: due.sort((a, b) => (a.entry?.nextReview || 0) - (b.entry?.nextReview || 0)),
      failed: failed.sort((a, b) => (b.entry?.fails || 0) - (a.entry?.fails || 0)),
      never: never.slice(0, 20),
      smart: [...failed, ...due, ...never].slice(0, 15),
    };
  };

  const resetDailyChallenge = (profile) => {
    const today = todayKey();
    if (profile.dailyChallenge?.date !== today) {
      profile.dailyChallenge = { date: today, words: 0, quiz: false, minutes: 0, completed: false, claimed: false };
      profile.studyMinutesToday = 0;
    }
    return profile;
  };

  const updateDailyChallenge = (profile, field, value) => {
    profile = resetDailyChallenge(profile);
    if (field === 'word') profile.dailyChallenge.words = Math.min(10, (profile.dailyChallenge.words || 0) + 1);
    if (field === 'quiz') profile.dailyChallenge.quiz = true;
    if (field === 'minute') profile.dailyChallenge.minutes = (profile.dailyChallenge.minutes || 0) + value;
    const c = profile.dailyChallenge;
    c.completed = c.words >= 10 && c.quiz && c.minutes >= 15;
    return profile;
  };

  const updateLeaderboard = (name, profile, progress) => {
    try {
      const lb = JSON.parse(localStorage.getItem(getLeaderboardKey()) || '{}');
      let completedDays = 0;
      Object.keys(progress || {}).forEach((d) => { if (progress[d]?.completed) completedDays++; });
      lb[name] = {
        name,
        xp: profile.xp || 0,
        streak: profile.dailyStreak || 0,
        completedDays,
        bestQuiz: profile.quizStats?.best || 0,
        kelas: profile.kelas || 'Umum',
        angkatan: profile.angkatan || '-',
        updatedAt: Date.now(),
      };
      localStorage.setItem(getLeaderboardKey(), JSON.stringify(lb));
    } catch (e) { /* ignore */ }
  };

  const getLeaderboard = (filter = 'all', value = '') => {
    try {
      const lb = Object.values(JSON.parse(localStorage.getItem(getLeaderboardKey()) || '{}'));
      let list = lb;
      if (filter === 'kelas' && value) list = lb.filter((e) => e.kelas === value);
      if (filter === 'angkatan' && value) list = lb.filter((e) => e.angkatan === value);
      return list.sort((a, b) => b.xp - a.xp);
    } catch {
      return [];
    }
  };

  const generateQrSvg = (data, size = 96) => {
    const text = String(data || 'ALFAL');
    try {
      const qrFactory = typeof qrcode !== 'undefined' ? qrcode : (typeof global !== 'undefined' && global.qrcode);
      if (qrFactory) {
        const qr = qrFactory(0, 'M');
        qr.addData(text);
        qr.make();
        const count = qr.getModuleCount();
        const margin = 2;
        const cell = Math.max(2, Math.floor((size - margin * 2) / count));
        const svg = qr.createSvgTag(cell, margin);
        return svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
      }
    } catch (e) {
      console.warn('[Alfal] generateQrSvg gagal:', e);
    }
    return generateBarcodeSvg(text);
  };

  const generateBarcodeSvg = (data, barWidth = 2, height = 56) => {
    const raw = String(data || 'ALFAL');
    const bits = [];
    for (let i = 0; i < raw.length; i++) {
      const c = raw.charCodeAt(i);
      for (let b = 0; b < 8; b++) bits.push((c >> (7 - b)) & 1);
    }
    while (bits.length < 96) bits.push(((bits.length * 7 + raw.length) % 3) > 0 ? 1 : 0);
    let x = 10;
    let rects = '';
    bits.forEach((bit, i) => {
      if (bit) rects += `<rect x="${x}" y="4" width="${barWidth}" height="${height - 8}" fill="#0f172a"/>`;
      x += barWidth + (bit && bits[i + 1] ? 1 : 2);
    });
    const w = x + 10;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}" role="img" aria-label="Barcode sertifikat">${rects}</svg>`;
  };

  const getCertRegistryKey = () => 'alfal_cert_registry';

  const loadCertRegistry = () => {
    try {
      const raw = localStorage.getItem(getCertRegistryKey());
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  };

  const registerCertificate = (cert) => {
    if (!cert?.id) return cert;
    const registry = loadCertRegistry();
    registry[cert.id] = { ...cert, registeredAt: cert.issuedAt || Date.now() };
    try {
      localStorage.setItem(getCertRegistryKey(), JSON.stringify(registry));
    } catch (e) {
      console.warn('[Alfal] registerCertificate gagal:', e);
    }
    return registry[cert.id];
  };

  const verifyCertificate = (certId) => {
    if (!certId) return { valid: false, reason: 'ID kosong' };
    const registry = loadCertRegistry();
    const record = registry[certId];
    if (!record) return { valid: false, reason: 'Sertifikat tidak ditemukan di registry lokal' };
    const expected = hashStr(`${record.id}|${record.name}|${record.xp}|${record.verifyHash}`);
    if (record.sealHash && record.sealHash !== expected) {
      return { valid: false, reason: 'Integritas sertifikat tidak valid', record };
    }
    return { valid: true, record };
  };

  const syncCertificateFirestore = async (db, appId, cert) => {
    if (!db || !cert?.id) return;
    try {
      const ts = (typeof firebase !== 'undefined' && firebase.firestore?.FieldValue)
        ? firebase.firestore.FieldValue.serverTimestamp()
        : Date.now();
      await db.collection('artifacts').doc(appId).collection('public').doc('data')
        .collection('certificates').doc(cert.id)
        .set({ ...cert, updatedAt: ts }, { merge: true });
    } catch (e) {
      console.warn('[Alfal] syncCertificateFirestore gagal:', e);
    }
  };

  const generateCertificate = (name, profile, progress) => {
    const completed = Object.keys(progress || {}).filter((d) => progress[d]?.completed).length;
    if (completed < CONFIG.TOTAL_DAYS) return null;
    const id = profile?.certificateId || `ALFAL-${Date.now().toString(36).toUpperCase()}-${hashStr(name).slice(0, 6).toUpperCase()}`;
    const verifyHash = hashStr(`${id}|${name}|${profile?.xp || 0}|${completed}`).toUpperCase().slice(0, 12);
    const sealHash = hashStr(`${id}|${name}|${profile?.xp || 0}|${verifyHash}`);
    const issuedAt = profile?.certificateIssuedAt || Date.now();
    const verifyUrl = `https://alfal.id/verify/${id}`;
    const cert = {
      id,
      name,
      kelas: profile?.kelas || profile?.className || '—',
      angkatan: profile?.angkatan || profile?.batchYear || '—',
      date: new Date(issuedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      xp: profile?.xp || 0,
      completedDays: completed,
      program: 'Program Mufrodat Bahasa Arab 30 Hari',
      level: getLevelInfo(profile?.xp || 0).title,
      verifyHash,
      sealHash,
      verifyUrl,
      barcodeData: id,
      qrSvg: generateQrSvg(verifyUrl, 96),
      qrSvgMusyrif: generateQrSvg(`${verifyUrl}?ref=musyrif`, 72),
      qrSvgKepala: generateQrSvg(`${verifyUrl}?ref=kepala`, 72),
      barcodeSvg: generateQrSvg(verifyUrl, 96),
      issuedAt,
    };
    registerCertificate(cert);
    return cert;
  };

  const generateQuizQuestions = (dayData, type, count = 10) => {
    const words = Array.isArray(dayData) ? [...dayData] : [];
    if (!words.length) return [];
    const shuffled = words.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, words.length));
    const types = ['mc', 'match', 'typing', 'listening'];
    return selected.map((word, i) => {
      const t = type || types[i % 4];
      const distractors = shuffled.filter((w) => w.id !== word.id).slice(0, 3).map((w) => w.arti);
      const matchWords = shuffled.slice(0, Math.min(4, words.length));
      return {
        type: t,
        word,
        options: [word.arti, ...distractors].sort(() => Math.random() - 0.5),
        matchPairs: matchWords.map((w) => ({ id: w.id, arab: w.arab, arti: w.arti })),
      };
    });
  };

  const syncProfileFirestore = async (db, appId, name, profile) => {
    if (!db) return;
    try {
      const safeName = name.replace(/[/.#$\[\]]/g, '_');
      const { profilePhoto, ...rest } = profile || {};
      await db.collection('artifacts').doc(appId).collection('public').doc('data')
        .collection('profiles').doc(safeName)
        .set({
          name,
          ...rest,
          selectedAvatar: rest.avatar,
          className: rest.kelas || rest.className || '',
          batchYear: rest.angkatan || rest.batchYear || '',
          profilePhotoUrl: rest.profilePhotoUrl || null,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    } catch (e) { console.warn('Profile sync failed', e); }
  };

  const uploadProfilePhoto = async (storage, name, blob) => {
    if (!storage || !blob) return null;
    try {
      const safeName = name.replace(/[/.#$\[\]]/g, '_');
      const ref = storage.ref().child(`profiles/${safeName}/avatar.jpg`);
      await ref.put(blob, { contentType: 'image/jpeg' });
      return await ref.getDownloadURL();
    } catch (e) {
      console.warn('[AlfalEngine] uploadProfilePhoto gagal:', e);
      return null;
    }
  };

  const HARAKAT_RE = /[\u064B-\u065F\u0670\u0640]/g;

  const stripHarakat = (text) => (text || '').replace(HARAKAT_RE, '');

  const normalizeArabicSpeech = (text) => {
    if (!text) return '';
    return stripHarakat(text)
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/\s+/g, '')
      .trim();
  };

  const segmentArabicLetters = (text) => {
    if (!text) return [];
    const m = text.match(/\p{L}[\p{M}\u0640]*/gu);
    return m || [];
  };

  const levenshteinDistance = (a, b) => {
    const m = a.length;
    const n = b.length;
    if (!m) return n;
    if (!n) return m;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n];
  };

  const getHafalanGrade = (score) => {
    if (score >= 95) return 'Mumtaz';
    if (score >= 85) return 'Jayyid Jiddan';
    if (score >= 70) return 'Jayyid';
    return 'Ulangi';
  };

  const getPronunciationStatus = (score) => getHafalanGrade(score);

  const formatTransliteration = (latin) => {
    if (!latin) return '';
    return `(${latin.charAt(0).toLowerCase()}${latin.slice(1)})`;
  };

  const evaluatePronunciation = (targetArab, heard) => {
    const segments = segmentArabicLetters(targetArab);
    const targetNorm = normalizeArabicSpeech(targetArab);
    const heardNorm = normalizeArabicSpeech(heard);
    const maxLen = Math.max(targetNorm.length, heardNorm.length, 1);
    const dist = levenshteinDistance(targetNorm, heardNorm);
    const score = Math.max(0, Math.min(100, Math.round((1 - dist / maxLen) * 100)));

    const letterAnalysis = segments.map((seg, i) => {
      const expectedChar = normalizeArabicSpeech(seg);
      const heardChar = heardNorm[i] || '';
      return {
        segment: seg,
        correct: expectedChar === heardChar && heardChar !== '',
        expectedChar,
        heardChar: heardChar || null,
      };
    });

    const wrongLetters = letterAnalysis.filter((l) => !l.correct);

    return {
      score,
      status: getPronunciationStatus(score),
      targetDisplay: targetArab,
      heardDisplay: heard || '—',
      letterAnalysis,
      wrongLetters,
      isAcceptable: score >= 70,
      targetNorm,
      heardNorm,
    };
  };

  const getDeviceIdKey = () => 'alfal_device_id';

  const getDeviceId = () => {
    try {
      let id = localStorage.getItem(getDeviceIdKey());
      if (!id) {
        id = `DEV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        localStorage.setItem(getDeviceIdKey(), id);
      }
      return id;
    } catch (e) {
      return `DEV-${Date.now().toString(36).toUpperCase()}`;
    }
  };

  const parseDeviceMeta = (ua) => {
    const agent = ua || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
    let os = 'Unknown';
    if (/Windows/i.test(agent)) os = 'Windows';
    else if (/Android/i.test(agent)) os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(agent)) os = 'iOS';
    else if (/Mac/i.test(agent)) os = 'macOS';
    else if (/Linux/i.test(agent)) os = 'Linux';

    let browser = 'Unknown';
    if (/Edg\//i.test(agent)) browser = 'Edge';
    else if (/Chrome/i.test(agent)) browser = 'Chrome';
    else if (/Firefox/i.test(agent)) browser = 'Firefox';
    else if (/Safari/i.test(agent)) browser = 'Safari';

    let deviceType = 'Desktop';
    if (/iPad|Tablet/i.test(agent)) deviceType = 'Tablet';
    else if (/Mobile|Android|iPhone/i.test(agent)) deviceType = 'Mobile';

    return { os, browser, deviceType };
  };

  const getDeviceInfo = (userName, role) => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const meta = parseDeviceMeta(ua);
    const isPWA = typeof window !== 'undefined' && (
      window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator?.standalone === true
    );
    return {
      deviceId: getDeviceId(),
      userName: userName || null,
      role: role || 'santri',
      platform: typeof navigator !== 'undefined' ? navigator.platform : '',
      os: meta.os,
      browser: meta.browser,
      deviceType: meta.deviceType,
      screen: typeof window !== 'undefined' ? `${window.screen?.width || 0}x${window.screen?.height || 0}` : '',
      language: typeof navigator !== 'undefined' ? navigator.language : '',
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isPWA: !!isPWA,
      userAgentShort: ua.slice(0, 120),
      lastSeen: Date.now(),
    };
  };

  const syncDeviceFirestore = async (db, appId, userName, role) => {
    if (!db || typeof window === 'undefined') return null;
    const info = getDeviceInfo(userName, role);
    try {
      const ts = (typeof firebase !== 'undefined' && firebase.firestore?.FieldValue)
        ? firebase.firestore.FieldValue.serverTimestamp()
        : Date.now();
      await db.collection('artifacts').doc(appId).collection('public').doc('data')
        .collection('devices').doc(info.deviceId)
        .set({ ...info, lastSeen: ts, updatedAt: ts }, { merge: true });
      return info;
    } catch (e) {
      console.warn('[Alfal] syncDeviceFirestore gagal:', e);
      return info;
    }
  };

  global.AlfalEngine = {
    CONFIG,
    LEVELS,
    AVATARS,
    AVATAR_LEGACY_MAP,
    resolveAvatarId,
    getAvatarById,
    getAvatarsByGender,
    getProfileDisplay,
    ACHIEVEMENTS,
    getProfileKey,
    loadProfile,
    saveProfile,
    createEmptyProfile,
    addXP,
    getLevelInfo,
    updateDailyStreak,
    getStreakDisplay,
    getStats,
    checkAchievements,
    buildJourneyNodes,
    getNodeStatus,
    isDayUnlocked,
    recordSRS,
    getReviewList,
    resetDailyChallenge,
    updateDailyChallenge,
    getLeaderboard,
    updateLeaderboard,
    generateCertificate,
    generateBarcodeSvg,
    generateQrSvg,
    registerCertificate,
    verifyCertificate,
    syncCertificateFirestore,
    loadCertRegistry,
    generateQuizQuestions,
    syncProfileFirestore,
    uploadProfilePhoto,
    getDeviceId,
    getDeviceInfo,
    syncDeviceFirestore,
    parseDeviceMeta,
    stripHarakat,
    normalizeArabicSpeech,
    segmentArabicLetters,
    evaluatePronunciation,
    formatTransliteration,
    getPronunciationStatus,
    getHafalanGrade,
    validateProfile,
    computeIntegrityHash,
    hashStr,
    todayKey,
  };
})(typeof window !== 'undefined' ? window : global);
