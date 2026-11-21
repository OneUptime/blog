'use strict';
const retained = [];
let sequence = 0;
setInterval(() => {
  retained.push({
    marker: `snapshot-lab-${sequence++}`,
    values: new Array(50_000).fill(sequence),
  });
  if (sequence % 20 === 0) {
    console.log(JSON.stringify({ sequence, ...process.memoryUsage() }));
  }
}, 5);
