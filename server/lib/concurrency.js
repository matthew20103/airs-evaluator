// Bounded worker pool: up to `maxConcurrency` items run at once, and the instant one finishes
// the next queued item starts — no pacing/timer involved, just a hard cap on how many items
// are in flight simultaneously ("N items in parallel, max"). Shared by the scan orchestrator and
// the evaluation orchestrator.
export function runConcurrent(work, maxConcurrency, handler) {
  if (work.length === 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let index = 0;
    let active = 0;
    let finished = 0;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    const launchNext = () => {
      if (settled || index >= work.length || active >= maxConcurrency) return;
      const item = work[index++];
      active++;
      handler(item)
        .catch(fail)
        .finally(() => {
          active--;
          finished++;
          if (finished === work.length) finish();
          else launchNext();
        });
    };

    for (let i = 0; i < Math.min(maxConcurrency, work.length); i++) launchNext();
  });
}
