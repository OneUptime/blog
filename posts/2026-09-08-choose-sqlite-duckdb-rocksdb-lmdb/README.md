# How to Choose SQLite, DuckDB, RocksDB, or LMDB for Embedded Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Embedded Database, SQLite, DuckDB, RocksDB, LMDB

Description: Choose an embedded engine from the data model, query shape, write pattern, concurrency boundary, and maintenance budget.

---

SQLite, DuckDB, RocksDB, and LMDB are all embedded, but they solve different problems. The key decision is not which benchmark has the highest number. It is whether the application needs relational transactions, analytical scans, an ordered key-value storage engine, or memory-mapped reads with one serialized writer.

## Start with the workload contract

Write down these requirements before testing an engine:

- point lookups, ranges, joins, aggregates, or full scans;
- read and write operations per second at peak;
- transaction size and atomicity boundary;
- threads, processes, and hosts that access the same data;
- maximum database size and working-set size;
- read, write, and recovery latency objectives;
- acceptable maintenance for compaction, checkpoints, backups, and upgrades;
- whether SQL, constraints, secondary indexes, and ad hoc queries are required.

Do not use average traffic. A bursty ingest path and a steady dashboard scan have different storage needs even when their daily byte totals match.

## Compare the engines by design

| Engine | Primary model | Concurrency boundary | Strong fit | Main operational constraint |
| --- | --- | --- | --- | --- |
| SQLite | Relational row store | Many readers, one writer per file | Application state and OLTP on one host | Write transactions serialize |
| DuckDB | Analytical SQL engine | Read-write within one process; multi-process read-only for native files | Local OLAP and Parquet analytics | Not designed for many small concurrent OLTP queries |
| RocksDB | Ordered key-value LSM tree | Library manages concurrent operations within the owning application | High write throughput, point and range access | Compaction, write stalls, and memory need active tuning |
| LMDB | Ordered memory-mapped B-tree | Lock-free readers, one serialized write transaction | Read-heavy key-value state with simple operations | Map size, long readers, and virtual address space require care |

The concurrency row describes the common native embedded model, not every surrounding product or protocol. A service layer can put any engine behind a network API, but then that layer owns admission, authentication, failover, and recovery.

## Choose SQLite for relational application state

SQLite is the natural default when the application needs tables, indexes, foreign keys, constraints, transactions, and expressive SQL without a database server. It works especially well for a single service instance, desktop or mobile application, edge device, local cache, or per-tenant file.

WAL mode allows readers and one writer to overlap, but there is still one writer at a time. Prefer another topology when many hosts need to write one dataset or write transactions cannot queue within the latency objective. Keep the file on local storage and use the online backup API for live snapshots.

## Choose DuckDB for embedded analytics

DuckDB is optimized for larger, less frequent analytical queries, including scans, joins, aggregates, and direct Parquet access. Projection and filter pushdown can avoid reading irrelevant Parquet columns and row groups. It is a good fit for notebooks, local data products, feature preparation, report generation, and embedded analytical services.

Do not make a shared native DuckDB file the transactional system of record for a multi-worker web application. Read-write concurrency is centered within one process. Multiple processes can open a native database read-only when no process writes. Separate operational ingestion from analytical publication when both patterns are required.

## Choose RocksDB for an application-owned LSM tree

RocksDB provides sorted key-value operations, write batches, iterators, column families, and tunable storage behavior. Writes enter a memtable and optional WAL, flush to level-zero SST files, and are reorganized by compaction. That architecture can sustain high write rates, but the application must design keys and values, encode schema evolution, and operate the compaction and memory budgets.

Choose RocksDB when the application needs a storage engine rather than a relational database, and the team is prepared to monitor level-zero files, pending compaction bytes, write stalls, block cache, memtables, file descriptors, and disk headroom. A bad key layout or unbounded compaction debt will defeat an attractive microbenchmark.

## Choose LMDB for simple, read-heavy key-value access

LMDB exposes the database through a memory map and uses copy-on-write pages. Readers do not block the writer, and the writer does not block readers, but only one write transaction may be active. It has no compaction cycle during ordinary operation and reuses free pages.

LMDB is compelling for highly read-oriented local indexes and metadata where ordered key-value operations are enough. Size the memory map for future growth, remember that reserved address space is not the same as resident RAM or file allocation, and avoid long-lived read transactions because they delay page reuse. Handle `MDB_MAP_FULL` by aborting the write and safely increasing the map with no active transaction in the process.

## Account for what the engine does not provide

RocksDB and LMDB do not give the application a SQL schema, joins, foreign keys, or a portable query layer. The application owns serialization format, compatibility, validation, and often secondary-index consistency.

SQLite and DuckDB provide SQL, but their execution goals differ. SQLite optimizes application transactions; DuckDB optimizes analytical pipelines. Neither turns a shared network file into a robust multi-host database service.

All four require a documented backup and restore procedure. Copying a directory while it is being modified is not automatically consistent. Use the engine's checkpoint, backup, or clean-shutdown rules and test restored artifacts.

## Benchmark the complete lifecycle

Build a replay with production key distributions, value sizes, queries, transaction batches, concurrency, database age, and storage hardware. Include steady state and bursts. Measure:

1. application latency and throughput;
2. CPU, resident memory, page cache, and disk I/O;
3. file growth and write amplification;
4. checkpoint or compaction tail latency;
5. crash recovery and restore time;
6. upgrade and schema-evolution behavior.

Run long enough for caches, RocksDB compaction, SQLite checkpoints, and database growth to reach representative conditions.

## Combine engines only at a clear boundary

A product may use SQLite for authoritative application state and DuckDB against published Parquet snapshots, or RocksDB for a derived local index beside PostgreSQL. Define which system owns each fact, how derived state is rebuilt, and what consistency lag is acceptable. Avoid synchronous dual writes that cannot commit atomically.

## Conclusion

Choose SQLite for relational local transactions, DuckDB for embedded analytical scans, RocksDB for a tunable write-oriented ordered key-value engine, and LMDB for simple memory-mapped read-heavy access. Validate the choice with realistic concurrency, aged data, recovery, and maintenance behavior, not a one-operation benchmark.

## Official Documentation

- [SQLite appropriate uses](https://www.sqlite.org/whentouse.html)
- [DuckDB concurrency](https://duckdb.org/docs/current/connect/concurrency.html)
- [RocksDB overview](https://github.com/facebook/rocksdb/wiki/RocksDB-Overview)
- [LMDB API and design documentation](https://github.com/LMDB/lmdb/blob/mdb.master/libraries/liblmdb/lmdb.h)
