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
    { id: 'santri', emoji: '👦', label: 'Santri' },
    { id: 'pelajar', emoji: '🧑‍🎓', label: 'Pelajar' },
    { id: 'ustadz', emoji: '👨‍🏫', label: 'Ustadz' },
    { id: 'penuntut', emoji: '🕌', label: 'Penuntut Ilmu' },
  ];

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
    avatar: 'santri',
    kelas: '',
    angkatan: '',
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

  const generateCertificate = (name, profile, progress) => {
    const completed = Object.keys(progress || {}).filter((d) => progress[d]?.completed).length;
    if (completed < CONFIG.TOTAL_DAYS) return null;
    const id = profile.certificateId || `ALFAL-${Date.now().toString(36).toUpperCase()}-${hashStr(name).slice(0, 6).toUpperCase()}`;
    return {
      id,
      name,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      xp: profile.xp,
      verifyUrl: `https://alfal.id/verify/${id}`,
    };
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
      return {
        type: t,
        word,
        options: [word.arti, ...distractors].sort(() => Math.random() - 0.5),
        matchPairs: shuffled.slice(0, 4).map((w) => ({ arab: w.arab, arti: w.arti })).sort(() => Math.random() - 0.5),
      };
    });
  };

  const syncProfileFirestore = async (db, appId, name, profile) => {
    if (!db) return;
    try {
      const safeName = name.replace(/[/.#$\[\]]/g, '_');
      await db.collection('artifacts').doc(appId).collection('public').doc('data')
        .collection('profiles').doc(safeName)
        .set({ name, ...profile, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    } catch (e) { console.warn('Profile sync failed', e); }
  };

  global.AlfalEngine = {
    CONFIG,
    LEVELS,
    AVATARS,
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
    generateQuizQuestions,
    syncProfileFirestore,
    validateProfile,
    computeIntegrityHash,
    hashStr,
    todayKey,
  };
})(typeof window !== 'undefined' ? window : global);
