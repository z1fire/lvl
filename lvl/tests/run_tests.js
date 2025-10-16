// run_tests.js - minimal test harness for storage functions
// Usage: node lvl/tests/run_tests.js

// minimal localStorage polyfill
const storage = {};
global.localStorage = {
  getItem: (k) => (k in storage) ? storage[k] : null,
  setItem: (k,v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};

// minimal window object
global.window = {};

// Load the storage module file as a script
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname,'..','js','storage.js'),'utf8');
// Evaluate in this context
try{
  eval(src);
}catch(e){ console.error('Failed to load storage.js', e); process.exit(2); }

// storage.js registers Storage on window or global; pick it up here
const Storage = (global.window && global.window.Storage) || global.Storage || null;
if(!Storage){ console.error('Storage not found after loading storage.js'); process.exit(2); }

const assert = (cond, msg) => { if(!cond){ console.error('ASSERT FAIL:', msg); process.exit(3); } };

console.log('Running tests...');

// Test 1: applyDecay scales totals linearly
(function(){
  // set up a user with known attribute numbers
  const user = {
    name: 'T', level:1, totalXP:0, streak:0,
    attributes: {
      fitness: { level: 3, xp: 50, sub: { strength: 20, stamina: 30 } },
      knowledge: { level: 2, xp: 10, sub: { learning: 5, research: 5 } }
    }
  };
  localStorage.setItem(Storage.KEY, JSON.stringify(user));
  const before = Storage.load();
  const beforeTotal = Object.values(before.attributes).reduce((s,a)=>{
    const subs = Object.values(a.sub||{}).reduce((x,y)=>x+y,0);
    const thresholds = (level=>200*((level-1)*level/2))(a.level);
    return s + thresholds + (a.xp||0) + subs;
  },0);
  // persist totalXP so applyDecay reads a realistic baseline
  before.totalXP = beforeTotal;
  Storage.save(before);
  // apply 1 day at 10% per day
  const res = Storage.applyDecay(1, 10);
  console.log('applyDecay result:', res);
  assert(res.percentApplied === 10, 'percentApplied should be 10');
  assert(res.totalAfter <= res.totalBefore, `totalAfter (${res.totalAfter}) should be <= totalBefore (${res.totalBefore})`);
})();

// Test 2: advanceDays + checkForDecay
(function(){
  // reset storage
  storage['levelup_user_data'] = JSON.stringify({ name:'A', level:1, totalXP:0, streak:2, attributes: { fitness:{level:1,xp:0, sub:{a:0}} } });
  delete storage['lvl_sim_clock_v1'];
  // set baseline to 3 days ago so checkForDecay will detect missed days
  Storage.setClockBaselineDays(3);
  const chk = Storage.checkForDecay(5);
  console.log('checkForDecay result:', chk);
  assert(chk.missedDays >= 3, 'missedDays should be at least 3');
  assert(chk.applied === true, 'decay should be applied');
})();

console.log('All tests passed');
