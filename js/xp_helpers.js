// xp_helpers.js - pure helper functions for XP calculations and level handling
// UMD-style so it works in both Node tests and in-browser usage
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.XPHelpers = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function calculateBaseXP(minutes) {
    return Math.round(minutes * 1.6);
  }

  // Apply coreXP to attr object { xp, level, sub }
  // Mutates attr and returns { oldLevel, newLevel, levelsGained }
  function applyXP(attr, addXP) {
    if (!attr) return { oldLevel: 0, newLevel: 0, levelsGained: 0 };
    const oldLevel = attr.level || 1;
    attr.xp = (attr.xp || 0) + addXP;
    // allow multiple level ups
    while (true) {
      const threshold = (attr.level || 1) * 200;
      if (attr.xp >= threshold) {
        attr.xp -= threshold;
        attr.level = (attr.level || 1) + 1;
      } else break;
    }
    const newLevel = attr.level || 1;
    return { oldLevel, newLevel, levelsGained: Math.max(0, newLevel - oldLevel) };
  }

  // Distribute coreXP into sub-attributes according to subWeights (object)
  // If subWeights is falsy, evenly distribute among existing keys in attr.sub
  // Mutates attr.sub and returns map of sub allocations
  function distributeSubXP(attr, coreXP, subWeights) {
    attr.sub = attr.sub || {};
    const allocations = {};
    if (subWeights) {
      for (const [k, w] of Object.entries(subWeights)) {
        const subXP = Math.round(coreXP * w);
        attr.sub[k] = (attr.sub[k] || 0) + subXP;
        allocations[k] = subXP;
      }
    } else {
      const keys = Object.keys(attr.sub);
      if (keys.length === 0) return allocations;
      const even = Math.round(coreXP / keys.length);
      keys.forEach(k => {
        attr.sub[k] = (attr.sub[k] || 0) + even;
        allocations[k] = even;
      });
    }
    return allocations;
  }

  return { calculateBaseXP, applyXP, distributeSubXP };
});
