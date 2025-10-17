// storage.js — handles saving, loading, and XP logic

const Storage = {
  KEY: "levelup_user_data",

n  // Load or initialize user data
  load() {
    const saved = localStorage.getItem(this.KEY);
    if (saved) {
      const user = JSON.parse(saved);
      // backfill any missing fields
      if (!user.customActivities) user.customActivities = [];
      return user;
    }

    const defaultUser = {
      name: "Zack",
      level: 1,
      totalXP: 0,
      streak: 1,
      customActivities: [],
      attributes: {
        fitness: {
          xp: 0,
          level: 1,
          sub: { strength: 0, stamina: 0, flexibility: 0 }
        },
        knowledge: {
          xp: 0,
          level: 1,
          sub: { learning: 0, research: 0, application: 0 }
        },
        wisdom: {
          xp: 0,
          level: 1,
          sub: { reflection: 0, integration: 0, teaching: 0 }
        },
        discipline: {
          xp: 0,
          level: 1,
          sub: { consistency: 0, organization: 0, resilience: 0 }
        },
        mindfulness: {
          xp: 0,
          level: 1,
          sub: { focus: 0, awareness: 0, calm: 0 }
        }
      }
    };
    this.save(defaultUser);
    return defaultUser;
  },

  save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  reset() {
    localStorage.removeItem(this.KEY);
    location.reload();
  },

  addXP(attribute, amount) {
    const user = this.load();
    const attr = user.attributes[attribute];
    if (!attr) return;

    attr.xp += amount;
    user.totalXP += amount;

    const levelUpThreshold = attr.level * 200;
    if (attr.xp >= levelUpThreshold) {
      attr.level++;
      attr.xp -= levelUpThreshold;
    }

    this.save(user);
  },

  addWeightedXP(activityData, minutes) {
    const user = this.load();
    const baseXP = Math.round(minutes * 1.6);

    for (const [attrKey, attrValue] of Object.entries(activityData.attributes)) {
      const coreXP = Math.round(baseXP * attrValue.weight);
      const attr = user.attributes[attrKey];
      if (!attr) continue;

      attr.xp += coreXP;
      user.totalXP += coreXP;

      const threshold = attr.level * 200;
      if (attr.xp >= threshold) {
        attr.level++;
        attr.xp -= threshold;
      }

      attr.sub = attr.sub || {};
      if (attrValue.sub) {
        for (const [subKey, subWeight] of Object.entries(attrValue.sub)) {
          const subXP = Math.round(coreXP * subWeight);
          attr.sub[subKey] = (attr.sub[subKey] || 0) + subXP;
        }
      } else {
        const subKeys = Object.keys(attr.sub);
        if (subKeys.length > 0) {
          const evenShare = Math.round(coreXP / subKeys.length);
          subKeys.forEach((k) => {
            attr.sub[k] = (attr.sub[k] || 0) + evenShare;
          });
        }
      }
    }

    this.save(user);
    return { totalXP: baseXP };
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

window.Storage = Storage;