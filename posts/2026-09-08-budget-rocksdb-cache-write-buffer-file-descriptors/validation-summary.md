# Validation Summary: How to Budget RocksDB Cache, Write Buffers, and File Descriptors

## Status
validated

## Post Type
Technical resource-budgeting guide with C++ configuration examples and Linux diagnostic commands.

## Technologies Covered
- RocksDB block cache, metadata caching, memtables, and WriteBufferManager
- C++ options APIs and shared ownership
- LSM-tree flushes, compaction, iterators, and snapshots
- Linux page cache, cgroup memory accounting, and file descriptors
- Shell diagnostics using pgrep, lsof, cat, grep, and wc

## Sources Consulted
- RocksDB memory usage: https://github.com/facebook/rocksdb/wiki/Memory-usage-in-RocksDB
- RocksDB block cache: https://github.com/facebook/rocksdb/wiki/Block-Cache
- RocksDB cache API, including deprecated wrappers and capacity behavior: https://github.com/facebook/rocksdb/blob/main/include/rocksdb/cache.h
- RocksDB table options and metadata pinning API: https://github.com/facebook/rocksdb/blob/main/include/rocksdb/table.h
- RocksDB write buffer manager: https://github.com/facebook/rocksdb/wiki/Write-Buffer-Manager
- WriteBufferManager constructor and threshold logic: https://github.com/facebook/rocksdb/blob/main/include/rocksdb/write_buffer_manager.h
- RocksDB options API: https://github.com/facebook/rocksdb/blob/main/include/rocksdb/options.h
- RocksDB property definitions: https://github.com/facebook/rocksdb/blob/main/include/rocksdb/db.h
- RocksDB iterator lifetime and resource retention: https://github.com/facebook/rocksdb/wiki/Iterator
- RocksDB snapshot implementation: https://github.com/facebook/rocksdb/wiki/Snapshot
- RocksDB direct I/O: https://github.com/facebook/rocksdb/wiki/Direct-IO
- Linux cgroup v2 memory accounting: https://docs.kernel.org/admin-guide/cgroup-v2.html
- procps pgrep manual: https://man7.org/linux/man-pages/man1/pgrep.1.html
- lsof manual: https://man7.org/linux/man-pages/man8/lsof.8.html
- Linux process limits: https://man7.org/linux/man-pages/man5/proc_pid_limits.5.html
- Linux descriptor directory: https://man7.org/linux/man-pages/man5/proc_pid_fd.5.html

## Issues Found
1. **Deprecated cache factory.** Current upstream headers mark NewLRUCache wrappers deprecated. Replaced the call with LRUCacheOptions and MakeSharedCache(), retaining the 5 GiB capacity.
2. **Deprecated metadata-pinning flag.** Replaced pin_l0_filter_and_index_blocks_in_cache with the documented partition_pinning and unpartitioned_pinning fields. Explained that kFlushedAndSimilar selects L0 tables smaller than 1.5 times write_buffer_size, rather than every L0 table.
3. **Overlapping memory accounting.** The original division could double-count pinned cache entries and cache-charged memtables. Clarified their overlap, changed the budget input to the container limit or host allocation, and distinguished buffered page cache from process RSS.
4. **Cache capacity presented without its enforcement limitation.** Added that the default non-strict cache can exceed capacity because of pinned entries. Its capacity does not enforce a process memory limit.
5. **WriteBufferManager described as enforcing a budget.** The two-argument constructor defaults to allow_stall=false. Corrected the description to a shared soft budget that triggers flushes; explained the third argument for write stalls and the need for overshoot headroom. Adjusted the conclusion consistently.
6. **Snapshots described as retaining files.** Explicit snapshots preserve historical key versions through compaction; iterators retain original SST files and memtables. Corrected this distinction.
7. **Descriptor limit scope omitted.** Clarified that max_open_files is per DB, with combined process demand and additional handles requiring reserves. Active readers can retain handles after cache eviction. Identified the /proc diagnostic example as Linux-specific.

## Review Notes
- Reviewed against current upstream RocksDB headers and official documentation on 2026-09-08. No RocksDB release was specified; older releases may require their historical cache and metadata-pinning APIs.
- Verified the option names, constructor argument order, table factory assignment, default max_open_files=-1, shared-cache ownership, and referenced property names against upstream declarations. The C++ blocks are configuration fragments requiring the appropriate RocksDB headers and surrounding DB-opening code; they were not compiled or run against an installed RocksDB build.
- The memtable multiplication remains an estimate. cur-size-all-mem-tables measures active and unflushed immutable memtables, not all possible memory retained by iterators. Component metrics should be collected across column families without summing the same shared-cache usage repeatedly.
- The Linux commands use valid options: pgrep -n chooses the newest matching process, lsof -p selects a PID, and wc -l counts output lines. The existing warning about lsof rows being an imperfect descriptor count is correct. The service name is a placeholder, and a matching running process is required. Shell syntax was checked; no production service was inspected.
- The four documentation links in the post resolve to the intended official RocksDB resources. Raw upstream documents were also consulted where GitHub page rendering omitted content.
- Shared caching, buffered-I/O decompression tradeoffs, partitioned metadata, write-buffer sizing tradeoffs, mature-database open costs, and testing under background activity are supported by the consulted sources. The numeric capacities are illustrative, not universal sizing recommendations.
- No workload benchmarking or OOM testing was performed; validation covers technical documentation and example correctness, not a production capacity guarantee.
