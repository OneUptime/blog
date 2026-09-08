# How to Tune RocksDB Compaction, Write Stalls, and Space Use

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RocksDB, Compaction, Performance, Storage, Observability

Description: Diagnose RocksDB compaction debt and tune capacity, buffers, and compaction style without disabling protective stalls.

---

RocksDB slows or stops writes when flush and compaction cannot keep up. Those stalls protect the database from unbounded level-zero files, read amplification, and disk exhaustion. Raising every trigger may postpone the symptom while allowing more compaction debt and space amplification to accumulate.

Tune from the cause reported in the RocksDB LOG and statistics, then verify under a sustained production-shaped workload.

## Classify the stall

RocksDB documents three principal stall paths:

- too many immutable memtables waiting to flush;
- too many level-zero SST files;
- estimated pending compaction bytes above soft or hard limits.

Enable a `Statistics` object and collect `rocksdb.stats`, per-level file counts and bytes, flush and compaction throughput, pending compaction bytes, stall count and time, write rate, and disk latency. Preserve the LOG messages that name the exact trigger.

One column family can stall the whole database. Break metrics down by column family so a low-value or badly configured family does not hide behind fleet totals.

## Compare incoming work with compaction capacity

The stable requirement is:

```text
sustainable compaction output capacity > compaction work created by writes
```

Account for write amplification, compression CPU, reads competing for the same device, and temporary bursts. Run long enough for every level to become representative. A short empty-database benchmark avoids the lower-level rewrites that dominate steady state.

If flush is behind, inspect device latency, memtable size, and background jobs. If L0 or pending bytes grow, compaction needs more I/O or CPU capacity, a lower-amplification design, or a lower admitted write rate.

## Choose compaction style deliberately

Leveled compaction is a common default for mixed and read-sensitive workloads. It limits overlap in nonzero levels and offers predictable read and space amplification at the cost of rewriting data through levels. Current RocksDB documentation recommends dynamic level bytes, which adapts level targets and provides a stable level structure.

Universal compaction merges sorted runs and targets lower write amplification, trading higher read and space amplification. Its space-amplification trigger can schedule a large merge, so reserve room for input and output files to coexist. Test it for write-heavy or bulk-loaded workloads instead of enabling it as a generic stall fix.

FIFO compaction removes whole old files according to its policy and fits special time-window or cache-like data. It is not a replacement for normal key-level deletion semantics.

## Give background work real resources

Start with a measured adjustment to shared background capacity:

```cpp
rocksdb::Options options;
options.max_background_jobs = 8;
options.level_compaction_dynamic_level_bytes = true;
```

More jobs help only when CPU and storage have spare parallel capacity. On a saturated device, they can increase tail latency for reads and WAL syncs. Use a rate limiter when compaction must share predictable I/O with foreground traffic, and evaluate subcompactions for large compaction jobs on capable storage.

Track actual background-job utilization. A thread-count change that leaves compaction throughput unchanged is not a solution.

## Tune memtables as a connected system

Larger `write_buffer_size` values create fewer, larger flushes and may reduce write amplification. They also use more memory, enlarge flush bursts, can increase recovery work through retained WAL, and require matching level capacity.

`max_write_buffer_number` supplies burst absorption while flush catches up. It should not become an unbounded reservoir. `min_write_buffer_number_to_merge` can merge memtables before flush to reduce files and amplification, at the cost of potentially higher read latency from searching more immutable memtables and longer memory residence.

Change write-buffer and base-level sizes together and recalculate the worst-case memory budget across every column family. Test a process restart with the resulting WAL and memtable configuration.

## Keep level zero controlled

Leveled compaction begins moving L0 files when `level0_file_num_compaction_trigger` is reached. Slowdown and stop thresholds provide later guardrails. Raising them increases the number of overlapping files that reads may examine and consumes disk headroom.

Prefer making flush and L0-to-base-level compaction faster (the base level can be below L1 when dynamic level bytes is enabled). If bursts are valid, add a modest buffer between the compaction, slowdown, and stop thresholds and prove that the system drains back to baseline. Alert on L0 file count and its slope, not only on the final stop event.

## Budget space for live data and compaction

Monitor total SST bytes, estimated live data size, pending compaction bytes, obsolete but not yet deleted files, WAL, logs, and filesystem free space. Snapshots preserve older key versions through compaction, while iterators can pin SST files and delay obsolete-file deletion. Tombstones remove logical keys, but disk space is reclaimed only after relevant compactions process them and old files can be deleted.

Set an operational minimum-free-space threshold high enough for concurrent compaction outputs plus ongoing flush and WAL growth. An emergency manual compaction on a nearly full disk can make the incident worse.

## Use manual compaction sparingly

`CompactRange` and `CompactFiles` are advanced controls. `CompactRange` runs compaction on background threads and, with `allow_write_stall=false` (the default), can wait to avoid causing write stalls. `CompactFiles` performs the compaction job on the calling thread. Both compete for CPU and I/O with other work. Use it for a defined goal such as draining data after bulk ingest or applying a compaction filter, not as a periodic cure for insufficient steady-state capacity.

Test cancellation, shutdown, and disk-space behavior before automating it.

## Validate each change

Change one connected set of options at a time and save the exact option file. Replay real key distribution, overwrite and delete ratio, compression, column families, snapshots, and bursts. Compare:

1. foreground write and read latency;
2. stall count and duration by cause;
3. flush and compaction throughput;
4. L0 files and pending bytes after a burst;
5. write, read, and space amplification;
6. CPU, memory, disk headroom, and recovery time.

A valid configuration returns to baseline after peak load without breaching latency or disk objectives.

## Conclusion

Treat RocksDB stalls as protective evidence that flush or compaction is behind. Identify the exact trigger, ensure sustained compaction capacity exceeds generated work, and tune style, background jobs, memtables, levels, and admission as a connected system. Preserve stop thresholds and enough disk space for compaction to finish safely.

## Official Documentation

- [RocksDB write stalls](https://github.com/facebook/rocksdb/wiki/Write-Stalls)
- [RocksDB leveled compaction](https://github.com/facebook/rocksdb/wiki/Leveled-Compaction)
- [RocksDB universal compaction](https://github.com/facebook/rocksdb/wiki/Universal-Compaction)
- [RocksDB compaction statistics](https://github.com/facebook/rocksdb/wiki/Compaction-Stats-and-DB-Status)
