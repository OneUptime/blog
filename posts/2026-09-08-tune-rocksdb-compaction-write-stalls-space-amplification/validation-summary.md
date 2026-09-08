# Validation Summary: How to Tune RocksDB Compaction, Write Stalls, and Space Use

## Status
validated

## Post Type
Technical tuning and troubleshooting guide, including a C++ configuration example.

## Technologies Covered
- RocksDB and its C++ Options API
- Leveled, universal, and FIFO compaction
- Memtables, SST files, WAL, snapshots, and iterators
- Write stalls, compaction statistics, resource capacity, and space amplification

## Sources Consulted
- Write Stalls: https://github.com/facebook/rocksdb/wiki/Write-Stalls
- Leveled Compaction: https://github.com/facebook/rocksdb/wiki/Leveled-Compaction
- Universal Compaction: https://github.com/facebook/rocksdb/wiki/Universal-Compaction
- Compaction Stats and DB Status: https://github.com/facebook/rocksdb/wiki/Compaction-Stats-and-DB-Status
- RocksDB Tuning Guide: https://github.com/facebook/rocksdb/wiki/RocksDB-Tuning-Guide
- FIFO Compaction Style: https://github.com/facebook/rocksdb/wiki/FIFO-compaction-style
- Snapshot: https://github.com/facebook/rocksdb/wiki/Snapshot
- Iterator: https://github.com/facebook/rocksdb/wiki/Iterator
- Manual Compaction: https://github.com/facebook/rocksdb/wiki/Manual-Compaction
- Rate Limiter: https://github.com/facebook/rocksdb/wiki/Rate-Limiter
- Subcompaction: https://github.com/facebook/rocksdb/wiki/Subcompaction
- Current C++ option declarations: https://raw.githubusercontent.com/facebook/rocksdb/main/include/rocksdb/options.h
- Current advanced option declarations: https://raw.githubusercontent.com/facebook/rocksdb/main/include/rocksdb/advanced_options.h
- Current DB API declarations: https://raw.githubusercontent.com/facebook/rocksdb/main/include/rocksdb/db.h

## Issues Found
1. **Memtable merging tradeoff:** The post attributed the cost of `min_write_buffer_number_to_merge` to write latency. Replaced this with potentially higher read latency from searching more immutable memtables and longer memory residence, matching the tuning guide's explanation.
2. **L0 compaction destination:** The recommendation referred specifically to L0-to-L1 compaction despite enabling dynamic level bytes. Changed it to L0-to-base-level compaction and explained that the base level can be below L1; dynamic leveling skips levels whose targets are too small.
3. **Snapshot versus iterator retention:** The post said both delay obsolete-file deletion. Clarified that snapshots preserve visible key versions through compaction, while iterators can pin SST files and prevent their deletion.
4. **Manual-compaction execution:** The post generalized background execution and stall avoidance across both APIs. Clarified that `CompactRange` uses background threads and offers `allow_write_stall`, whereas `CompactFiles` performs the job on the calling thread. Both consume shared CPU and I/O capacity.
5. **Free-space reserve:** Sizing headroom for only the largest individual compaction output can underestimate peak space when jobs run concurrently. Updated the requirement to account for concurrent outputs and ongoing flush and WAL growth.

## Review Notes
- Checked the remaining claims about stall causes, database-wide effects of a column-family stall, sustained capacity, amplification tradeoffs, memtable/WAL recovery costs, monitoring, and workload-based validation against official documentation.
- The C++ fragment uses valid, non-deprecated `rocksdb::Options` members. `max_background_jobs = 8` is an illustrative tuning value, not a universal recommendation. As a fragment, it assumes the RocksDB options header and enclosing application context; no standalone compilation or performance benchmark was performed.
- Dynamic level bytes is recommended and has been the default since RocksDB 8.4. Older releases have different migration requirements; the post specifies no historical target version.
- Current public headers were used to resolve API details because portions of the wiki contain older defaults or descriptions.
- `rocksdb.stats` properties and Statistics counters are complementary; operating-system disk latency and free-space monitoring are also needed. The post does not claim that a Statistics object supplies every listed metric.
- The three listed stall paths are principal causes, not an exhaustive list; WriteBufferManager can also impose memory-related stalls when configured to do so.
- All four documentation links in the post resolved to the intended official resources. The author profile link also resolved successfully.
- There are no terminal commands to validate. The capacity inequality is conceptual rather than executable code. Validation is based on documentation and source review, not a production workload test.
