const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const testsDir = __dirname;
const suites = fs.readdirSync(testsDir)
  .filter(name => /^test_.*\.js$/i.test(name))
  .sort();

if (suites.length === 0) {
  console.error('Aucune suite de tests trouvée dans tests/.');
  process.exit(1);
}

let passed = 0;
let failed = 0;

console.log(`NutriFlow — ${suites.length} suite(s) de non-régression\n`);

for (const suite of suites) {
  console.log(`\n=== ${suite} ===`);
  const result = spawnSync(process.execPath, [path.join(testsDir, suite)], {
    cwd: path.join(testsDir, '..'),
    stdio: 'inherit'
  });

  if (result.status === 0) {
    passed += 1;
  } else {
    failed += 1;
  }
}

console.log('\n========================================');
console.log(`Suites réussies : ${passed}/${suites.length}`);
console.log(`Suites en échec : ${failed}`);
console.log('========================================');

process.exit(failed === 0 ? 0 : 1);
