const XP = require('./xp_helpers');

function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }

// test base xp
assert(XP.calculateBaseXP(15) === 24, '15 min -> 24 XP');
assert(XP.calculateBaseXP(5) === 8, '5 min -> 8 XP');

// test applyXP multi-level up (threshold linear: level*200)
let attr = { xp: 195, level: 1, sub: { a: 0 } };
const res = XP.applyXP(attr, 10); // add 10 -> xp 205 -> should level up to 2, xp leftover 5
assert(res.oldLevel === 1 && res.newLevel === 2 && res.levelsGained === 1, 'single level up');
assert(attr.level === 2 && attr.xp === 5, 'xp leftover');

// test multi-level
attr = { xp: 0, level: 1, sub: { a:0 } };
const res2 = XP.applyXP(attr, 2000); // big XP -> multiple levels
assert(res2.levelsGained >= 1, 'multi level gain');

// distribute subs
attr = { xp:0, level:1, sub: { s1:0, s2:0 } };
const alloc = XP.distributeSubXP(attr, 10, null);
assert(alloc.s1 === 5 && alloc.s2 === 5, 'even distribution');

console.log('All xp_helpers tests passed');
