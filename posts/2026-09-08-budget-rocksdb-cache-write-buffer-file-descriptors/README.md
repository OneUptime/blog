# How to Budget RocksDB Cache, Write Buffers, and File Descriptors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RocksDB, Caching, Memory Management, Resource Management, Performance

Description: Build one RocksDB process budget for block cache, memtables, metadata, pinned blocks, page cache, and open files.

---

RocksDB memory is not one setting. Data blocks may occupy the block cache, compressed file data can occupy the operating-system page cache, memtables hold writes, indexes and filters may live outside the cache, and iterators can pin blocks. File-descriptor demand grows with SST files, WALs, manifests, logs, and other files owned by the process.

Set one process-level budget before tuning individual column families.

## Reserve memory for the complete process

Start from the container or host allocation and subtract non-RocksDB needs:

```text
RocksDB target = process memory limit
               - application heap and stacks
               - allocator and library overhead
               - response and request buffers
               - emergency headroom
```

Divide the RocksDB target among block cache, memtables, indexes and filters, pinned blocks, and OS page cache. Do not allocate 100 percent. Peaks during flush, compaction, database open, backup, and large iterator activity need room.

Measure resident memory and component properties under load. An options-file calculation is an estimate, not enforcement.

## Share one block cache

The block cache stores uncompressed table blocks. Reuse the same cache object across column families and database instances in a process so one global capacity is meaningful:

```cpp
constexpr size_t GiB = 1024ULL * 1024 * 1024;

auto shared_cache = rocksdb::NewLRUCache(5 * GiB);

rocksdb::BlockBasedTableOptions table_options;
table_options.block_cache = shared_cache;
table_options.cache_index_and_filter_blocks = true;
table_options.pin_l0_filter_and_index_blocks_in_cache = true;

rocksdb::ColumnFamilyOptions cf_options;
cf_options.table_factory.reset(
    rocksdb::NewBlockBasedTableFactory(table_options));
```

Without a shared object, each column family may receive its own cache and multiply the intended memory. Track `rocksdb.block-cache-usage`, cache pinned usage, hit rate, and eviction behavior.

Buffered I/O also caches compressed SST pages in the operating-system page cache. A smaller block cache does not necessarily mean an equal rise in physical reads, though it may increase decompression CPU. Test direct I/O separately if eliminating the second cache is a real requirement.

## Decide where indexes and filters are charged

By default, index and filter blocks can consume memory outside the data-block cache. Setting `cache_index_and_filter_blocks=true` charges them to the shared block cache and makes the budget more controllable, but they can then be evicted. Pinning L0 metadata is a useful compromise because overlapping L0 files are latency-sensitive.

Monitor `rocksdb.estimate-table-readers-mem` and the number and size of SST files. Partitioned indexes and filters can reduce the amount that must remain resident for large databases, but they change lookup behavior and should be benchmarked.

## Bound aggregate memtable memory

A rough upper envelope starts with:

```text
sum over column families(write_buffer_size * max_write_buffer_number)
```

The precise peak depends on flush timing and implementation details, so leave margin and measure `rocksdb.cur-size-all-mem-tables` plus immutable memtable properties. Many column families can multiply an innocent per-family setting.

Use a `WriteBufferManager` to enforce one memtable budget across families or DB instances. It can also charge memtable memory against the shared block cache:

```cpp
auto write_buffer_manager =
    std::make_shared<rocksdb::WriteBufferManager>(1 * GiB, shared_cache);

rocksdb::DBOptions db_options;
db_options.write_buffer_manager = write_buffer_manager;
```

When charging memtables to the cache, size cache capacity for both the desired cached data and the memtable allowance. Decide whether `allow_stall` is appropriate: a memory safety stall is preferable to an OOM kill, but it must be visible in latency and admission metrics.

Larger write buffers reduce flush frequency but increase memory, flush size, and possibly WAL retention. Match them to background flush capacity and base-level sizing.

## Include iterators and snapshots

Iterators pin blocks while they are positioned, and many concurrent iterators can make pinned usage material. Long-lived snapshots also prevent old versions and files from being reclaimed. Bound iterator lifetime, close handles on cancellation, and expose snapshot age.

Avoid reading a large range into an unbounded application collection. Streaming at the storage layer does not help if the caller retains every value.

## Build a file-descriptor budget

Current RocksDB options use `max_open_files=-1` to keep files open, which provides high performance but requires enough OS descriptors and can increase memory used for table readers. A finite value allows the table cache to evict file handles at the cost of reopen work.

Estimate the high-water count from all SST files across column families, WALs, MANIFEST, OPTIONS, LOG files, sockets, and unrelated application files. Then verify with operating-system observations under compaction and backup:

```bash
cat /proc/$(pgrep -n my-service)/limits | grep 'open files'
lsof -p "$(pgrep -n my-service)" | wc -l
```

Run only on a host where those diagnostics are authorized. `lsof` rows are not a perfect count of unique descriptors, so also use process metrics and `/proc/<pid>/fd` where available.

Configure a finite limit when the process cannot safely keep every SST open:

```cpp
db_options.max_open_files = 4096;
```

The value must remain below the process soft limit after reserving descriptors for networking and the runtime. Raising the OS limit without controlling SST-file growth only moves the failure. Compaction style, target file size, and L0 backlog determine how many files exist.

## Validate the combined envelope

Stress every column family with production key sizes and write ratios while running reads, compaction, checkpoint, backup, and snapshot workloads. Record total RSS, page-cache pressure, cache usage and pinned bytes, memtables, table-reader memory, descriptors, reopen latency, stalls, and OOM events.

Test database open with the mature file count. A configuration that runs well after warmup may exceed memory or descriptors while opening thousands of SST files.

## Conclusion

Budget RocksDB at process scope. Share one block cache, choose whether metadata is charged to it, cap aggregate memtables with a write-buffer manager, reserve for iterators and the OS page cache, and size descriptors from the real SST high-water count. Verify the complete envelope during compaction, backup, and database open.

## Official Documentation

- [RocksDB memory usage](https://github.com/facebook/rocksdb/wiki/Memory-usage-in-RocksDB)
- [RocksDB block cache](https://github.com/facebook/rocksdb/wiki/Block-Cache)
- [RocksDB write buffer manager](https://github.com/facebook/rocksdb/wiki/Write-Buffer-Manager)
- [RocksDB options API](https://github.com/facebook/rocksdb/blob/main/include/rocksdb/options.h)
