// storage.js — handles saving, loading, and XP logic

const Storage = {
  KEY: "levelup_user_data",

  _defaultUser() {
    return {
  name: "",
      level: 1,
      totalXP: 0,
      streak: 1,
      customActivities: [],
      attributes: {
        fitness: { xp: 0, level: 1, sub: { strength: 0, stamina: 0, flexibility: 0 } },
        knowledge: { xp: 0, level: 1, sub: { learning: 0, research: 0, application: 0 } },
        wisdom: { xp: 0, level: 1, sub: { reflection: 0, integration: 0, teaching: 0 } },
        discipline: { xp: 0, level: 1, sub: { consistency: 0, organization: 0, resilience: 0 } },
        mindfulness: { xp: 0, level: 1, sub: { focus: 0, awareness: 0, calm: 0 } }
      }
    };
  },

  // Load or initialize user data
  load() {
    const saved = localStorage.getItem(this.KEY);
    const defaults = this._defaultUser();
    if (saved) {
      let user;
      try {
        user = JSON.parse(saved);
      } catch (e) {
        // corrupted storage, reset
        this.save(defaults);
        return defaults;
      }

      // ensure top-level defaults
      if (user.name === undefined) user.name = defaults.name;
      if (user.level === undefined) user.level = defaults.level;
      if (user.totalXP === undefined) user.totalXP = defaults.totalXP;
      if (user.streak === undefined) user.streak = defaults.streak;
      if (!Array.isArray(user.customActivities)) user.customActivities = [];

      // ensure attributes exist and backfill sub-keys
      user.attributes = user.attributes || {};
      for (const [attrKey, defAttr] of Object.entries(defaults.attributes)) {
        if (!user.attributes[attrKey]) user.attributes[attrKey] = { xp: 0, level: 1, sub: {} };
        const attr = user.attributes[attrKey];
        if (attr.xp === undefined) attr.xp = 0;
        if (attr.level === undefined) attr.level = 1;
        attr.sub = attr.sub || {};
        // ensure sub-keys present
        for (const subKey of Object.keys(defAttr.sub)) {
          if (attr.sub[subKey] === undefined) attr.sub[subKey] = 0;
        }
      }

      return user;
    }

    // no saved user
    this.save(defaults);
    return defaults;
  },

  save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  reset() {
    // clear stored user data and any persisted last-seen levels
    localStorage.removeItem(this.KEY);
    try { localStorage.removeItem('lvl_last_seen_levels'); } catch (e) { /* ignore */ }
    location.reload();
  },

  addXP(attribute, amount) {
    const user = this.load();
    const attr = user.attributes && user.attributes[attribute];
    if (!attr) return;

    attr.xp += amount;
    user.totalXP += amount;

    // allow multiple level-ups if xp is large
    while (true) {
      const threshold = attr.level * 200;
      if (attr.xp >= threshold) {
        attr.xp -= threshold;
        attr.level++;
      } else break;
    }

    this.save(user);
  },

  addWeightedXP(activityData, minutes) {
    const user = this.load();
    const baseXP = (typeof XPHelpers !== 'undefined' && XPHelpers.calculateBaseXP)
      ? XPHelpers.calculateBaseXP(minutes)
      : Math.round(minutes * 1.6);

    let actualAdded = 0;
    const details = { baseXP, attributes: {} };

    for (const [attrKey, attrValue] of Object.entries(activityData.attributes)) {
      const coreXP = Math.round(baseXP * attrValue.weight);
      const attr = user.attributes[attrKey];
      if (!attr) continue;

      // apply core xp and capture level changes
      let changeSummary;
      if (typeof XPHelpers !== 'undefined' && XPHelpers.applyXP) {
        changeSummary = XPHelpers.applyXP(attr, coreXP);
      } else {
        const oldLevel = attr.level || 1;
        attr.xp = (attr.xp || 0) + coreXP;
        while (true) {
          const threshold = (attr.level || 1) * 200;
          if (attr.xp >= threshold) { attr.xp -= threshold; attr.level = (attr.level || 1) + 1; }
          else break;
        }
        changeSummary = { oldLevel, newLevel: attr.level || 1, levelsGained: Math.max(0, (attr.level || 1) - oldLevel) };
      }

      user.totalXP += coreXP;
      actualAdded += coreXP;

      // distribute into subs and record allocations
      let subAlloc = {};
      if (typeof XPHelpers !== 'undefined' && XPHelpers.distributeSubXP) {
        subAlloc = XPHelpers.distributeSubXP(attr, coreXP, attrValue.sub);
      } else {
        attr.sub = attr.sub || {};
        if (attrValue.sub) {
          for (const [subKey, subWeight] of Object.entries(attrValue.sub)) {
            const subXP = Math.round(coreXP * subWeight);
            attr.sub[subKey] = (attr.sub[subKey] || 0) + subXP;
            subAlloc[subKey] = subXP;
          }
        } else {
          const subKeys = Object.keys(attr.sub);
          if (subKeys.length > 0) {
            const evenShare = Math.round(coreXP / subKeys.length);
            subKeys.forEach(k => { attr.sub[k] = (attr.sub[k] || 0) + evenShare; subAlloc[k] = evenShare; });
          }
        }
      }

      details.attributes[attrKey] = { coreXP, ...changeSummary, subs: subAlloc };
    }

    // create notifications for attribute level-ups
    try {
      if (window.Notifs && typeof window.Notifs.add === 'function') {
        for (const [attrKey, d] of Object.entries(details.attributes)) {
          if (d.levelsGained && d.levelsGained > 0) {
            const msg = `${capitalize(attrKey)} leveled up to Lv ${d.newLevel}!`;
            window.Notifs.add('levelup', msg, { attr: attrKey, levelsGained: d.levelsGained });
          }
        }
      }
    } catch (e) { /* ignore */ }

    this.save(user);
    return { totalXP: actualAdded, details };
  },

  // Favorites handling
  addCustomActivity(id) {
    const user = this.load();
    if (!user.customActivities.includes(id)) {
      user.customActivities.push(id);
      this.save(user);
    }
  },

  removeCustomActivity(id) {
    const user = this.load();
    user.customActivities = user.customActivities.filter(a => a !== id);
    this.save(user);
  },

  getCustomActivities() {
    const user = this.load();
    return user.customActivities || [];
  }
};

// Persisted simulated clock and decay helpers
// We'll store a lastActiveDate (ms since epoch) to represent the last day the user was active.
Storage.CLOCK_KEY = 'lvl_sim_clock_v1';
// Ensure there's a sensible default: start-of-today
Storage._getClock = function(){
  try{ const v = JSON.parse(localStorage.getItem(this.CLOCK_KEY) || 'null'); return v; }catch(e){ return null; }
};
Storage._setClock = function(obj){ try{ localStorage.setItem(this.CLOCK_KEY, JSON.stringify(obj)); }catch(e){} };

// Advance simulated clock by given number of days (integer). Returns new clock object.
Storage.advanceDays = function(days = 1, percentPerDay = 5){
  const now = Date.now();
  const clk = this._getClock() || { lastActive: now, simulatedNow: now };
  clk.simulatedNow = (clk.simulatedNow || now) + Math.round(days) * 24 * 60 * 60 * 1000;
  // persist and then evaluate whether a decay should be applied
  this._setClock(clk);
  // run check immediately and return its result
  try { return this.checkForDecay(percentPerDay); } catch(e) { return { applied: false, missedDays: 0 }; }
};

// checkForDecay: compares lastActive to simulatedNow, computes full days missed (floor) since lastActive
// If missedDays >= 1, we'll decrement streak and apply decay percentPerDay per day (default 5%)
Storage.checkForDecay = function(percentPerDay = 5){
  const clk = this._getClock() || { lastActive: Date.now(), simulatedNow: Date.now() };
  const last = clk.lastActive || clk.simulatedNow;
  const now = clk.simulatedNow || Date.now();
  // compute full days elapsed since lastActive; use UTC days boundary to be consistent
  const msPerDay = 24 * 60 * 60 * 1000;
  const elapsed = Math.floor((now - last) / msPerDay);
  if (elapsed <= 0) return { applied: false, missedDays: 0 };

  // apply decay for elapsed days
  const result = this.applyDecay(elapsed, percentPerDay);

  // decrement streak (consider it ended)
  const user = this.load();
  const oldStreak = user.streak || 0;
  user.streak = Math.max(0, oldStreak - 1);
  this.save(user);

  // update clock lastActive to now (so further advances are computed from here)
  clk.lastActive = now;
  this._setClock(clk);

  return { applied: true, missedDays: elapsed, decayResult: result, oldStreak, newStreak: user.streak };
};

// Set clock baseline: set lastActive to N days ago (integer) relative to simulatedNow (or now)
Storage.setClockBaselineDays = function(daysAgo = 0){
  const now = Date.now();
  const clk = this._getClock() || { lastActive: now, simulatedNow: now };
  const msPerDay = 24 * 60 * 60 * 1000;
  clk.simulatedNow = clk.simulatedNow || now;
  clk.lastActive = clk.simulatedNow - Math.round(daysAgo) * msPerDay;
  this._setClock(clk);
  return clk;
};

// Helper to add arbitrary notifications from other parts of the app
Storage.addNotification = function(type, message, meta){ try { if (window.Notifs && window.Notifs.add) window.Notifs.add(type, message, meta); } catch(e){} };

function capitalize(s){ return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1); }

// Apply XP decay across attributes. percentPerDay is percentage (e.g., 5 for 5%), missedDays is number of days missed.
Storage.applyDecay = function(missedDays = 1, percentPerDay = 5) {
  const user = this.load();
  const percent = Math.min(100, percentPerDay * missedDays);
  const ratio = Math.max(0, (100 - percent) / 100);
  const summary = { percentApplied: percent, perAttribute: {}, totalBefore: 0, totalAfter: 0 };

  // helper: total XP accounted for by completed level thresholds up to (level-1)
  function totalThresholds(level){
    // Sum of thresholds for levels < level: 200 * sum_{k=1}^{level-1} k = 200 * (level-1)*level/2
    return 200 * ((level - 1) * (level) / 2);
  }

  let newTotal = 0;
  for (const [attrKey, attr] of Object.entries(user.attributes)) {
    const subs = attr.sub || {};
    const subsTotal = Object.values(subs).reduce((s, v) => s + (v || 0), 0);
    const oldLevel = attr.level || 1;
    const thresholds = totalThresholds(oldLevel);
    const oldTotalAttrXP = thresholds + (attr.xp || 0) + subsTotal;

    // accumulate accurate totalBefore from per-attribute totals (avoid using possibly-stale user.totalXP)
    summary.totalBefore += oldTotalAttrXP;

    const newTotalAttrXP = Math.max(0, Math.round(oldTotalAttrXP * ratio));

    // find new level L such that totalThresholds(L) <= newTotalAttrXP < totalThresholds(L+1)
    let L = 1;
    while (totalThresholds(L + 1) <= newTotalAttrXP) {
      L++;
    }

    const newThresholds = totalThresholds(L);
    let remaining = newTotalAttrXP - newThresholds;
    if (remaining < 0) remaining = 0;

    // distribute remaining between core xp and subs proportionally to previous core/sub split
    const oldCore = attr.xp || 0;
    const oldSubsTotal = subsTotal;
    const denom = (oldCore + oldSubsTotal) || 1;
    const newCore = Math.round(remaining * (oldCore / denom));
    const newSubs = {};
    let assignedSubs = 0;
    for (const [k, v] of Object.entries(subs)) {
      const val = Math.round(remaining * ((v || 0) / denom));
      newSubs[k] = val;
      assignedSubs += val;
    }
    const finalCore = Math.max(0, newCore + (remaining - (newCore + assignedSubs)));

    // save back
    attr.level = L;
    attr.xp = finalCore;
    attr.sub = newSubs;

    summary.perAttribute[attrKey] = {
      before: oldTotalAttrXP,
      after: newTotalAttrXP,
      levelsBefore: oldLevel,
      levelsAfter: L,
      levelsLost: Math.max(0, oldLevel - L)
    };

    newTotal += newTotalAttrXP;
  }

  user.totalXP = newTotal;
  this.save(user);

  summary.totalAfter = user.totalXP;
  summary.delta = summary.totalBefore - summary.totalAfter;
  return summary;
};

window.Storage = Storage;

// Compute overall level from totalXP. Uses cumulative thresholds where level n requires 200*n XP to reach next level.
Storage.getOverallLevel = function(totalXP){
  const xp = Number(totalXP || 0);
  if (xp <= 0) return 1;
  // total thresholds up to level L: 200 * sum_{k=1}^{L-1} k = 200 * (L-1)*L/2
  // We need to find largest L such that totalThresholds(L) <= xp
  function totalThresholds(level){ return 200 * ((level - 1) * level / 2); }
  let L = 1;
  while (totalThresholds(L + 1) <= xp) L++;
  return L;
};

// Reflections persistence (simple localStorage-backed list)
Storage.REF_KEY = 'lvl_reflections_v1';
Storage._readReflections = function(){
  try{ return JSON.parse(localStorage.getItem(this.REF_KEY) || '[]'); }catch(e){ return []; }
};
Storage._writeReflections = function(list){ try{ localStorage.setItem(this.REF_KEY, JSON.stringify(list)); }catch(e){} };

Storage.getReflections = function(){
  const list = this._readReflections() || [];
  // return sorted by ts desc
  return list.slice().sort((a,b)=> (b.ts||0) - (a.ts||0));
};

Storage.addReflection = function(text, tags){
  const list = this._readReflections();
  const item = { id: 'r_' + Date.now() + '_' + Math.floor(Math.random()*1000), text: String(text||''), tags: Array.isArray(tags)? tags : [], ts: Date.now() };
  list.push(item);
  this._writeReflections(list);
  return item;
};

Storage.removeReflection = function(id){
  const list = this._readReflections();
  const filtered = list.filter(i => i.id !== id);
  this._writeReflections(filtered);
  return true;
};
