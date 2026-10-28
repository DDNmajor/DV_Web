// Kiểm tra parser trên các file replay thật.
//   node server/selftest.js "<thư mục Archive>"
//   (mặc định: %USERPROFILE%\AppData\LocalLow\BestoGameStudios\Idol Showdown\Archive)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { summarize } from '../public/js/ayame-format.js';

const dir = process.argv[2]
  || path.join(os.homedir(), 'AppData', 'LocalLow', 'BestoGameStudios', 'Idol Showdown', 'Archive');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ayame'));

let ok = 0;
let scoreMismatch = 0;
const failures = [];
const started = Date.now();
for (const file of files) {
  try {
    const { meta, rounds } = summarize(new Uint8Array(fs.readFileSync(path.join(dir, file))));
    ok++;
    const w1 = rounds.filter((r) => r.winner === 1).length;
    const w2 = rounds.filter((r) => r.winner === 2).length;
    if (w1 !== meta.p1.wins || w2 !== meta.p2.wins) {
      scoreMismatch++;
      if (scoreMismatch <= 10) {
        console.log(`  tỉ số lệch: ${file} file=${meta.p1.wins}-${meta.p2.wins} tính=${w1}-${w2}`,
          rounds.map((r) => `${r.winner}:${r.hp1}/${r.hp2}`).join(' '));
      }
    }
  } catch (err) {
    failures.push(`${file}: ${err.message}`);
  }
}

console.log(`\n${files.length} file, đọc được ${ok}, lỗi ${failures.length}, tỉ số tính lệch ${scoreMismatch}`
  + ` (${((Date.now() - started) / 1000).toFixed(1)}s)`);
for (const f of failures.slice(0, 20)) console.log('  lỗi:', f);
process.exitCode = failures.length ? 1 : 0;
