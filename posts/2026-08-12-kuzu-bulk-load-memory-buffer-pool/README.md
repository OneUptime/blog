# Tune Kuzu Bulk Loads to Prevent Memory Exhaustion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Graph Database, Data Import, Memory, Buffer Pool, Performance

Description: Diagnose Kuzu bulk-load memory failures by budgeting the buffer pool, preserving spill space, controlling concurrency, and reshaping oversized imports safely.

---

A Kuzu bulk load can fail even when the final database would fit comfortably on disk. Importing relationships requires temporary structures, parsing and casting need working memory, parallel readers multiply active buffers, and the operating system still needs headroom outside Kuzu. The right response is not simply “give Kuzu all RAM.” Bound the buffer pool, keep temporary-disk spilling available, reduce simultaneous work, and change the source-file batch shape only after measuring which phase peaks.

Kuzu is archived at version 0.11.3, so freeze diagnostics against that version. The maintained LadybugDB documentation is useful because it continues the engine and documents the same import architecture, but a Kuzu deployment should test every setting with the Kuzu 0.11.3 package it actually ships.

## Identify the Failure Class First

“Crashed during import” can describe different problems:

- The operating system or container killed the process for exceeding its memory limit.
- Kuzu raised an out-of-memory or buffer-manager exception.
- A large relationship import exhausted temporary storage while spilling.
- The source contained a malformed value, duplicate primary key, or missing endpoint.
- An in-memory database could not use disk spilling at all.
- Parallel parsing caused a higher peak than the same data loaded serially.

Capture the exact error, process exit code, container events, peak resident memory, free space on the database filesystem, and the last completed table. Do not label every abrupt exit an engine memory leak.

On Linux, inspect the container or service cgroup limit rather than host RAM alone. A 64 GB host does not help a process limited to 8 GB. On macOS or a developer laptop, check memory pressure and competing applications. For every platform, confirm that the filesystem holding the database has free space for both the database and its spill file.

## Understand the Three Memory Budgets

Treat the load as three separate budgets:

1. **Kuzu's buffer pool.** It caches database pages and supplies memory managed by the engine.
2. **Other process memory.** The Python or Node runtime, client-side DataFrames, decompression, query results, and allocations outside the buffer manager still consume RAM.
3. **Operating-system headroom.** The kernel, filesystem cache, monitoring agents, and other processes need space too.

Kuzu 0.11.3 defaults its buffer pool to 80% of detected total physical system memory, capped at 80% of the maximum virtual-memory-region size. In a container, an explicit value is safer because that calculation does not explicitly inspect the cgroup limit. With the Kuzu Python API, pass the buffer-pool size in bytes when constructing the database:

~~~python
import kuzu

GiB = 1024 * 1024 * 1024

# Example starting point for an 8 GiB container, not a universal optimum.
db = kuzu.Database(
    "catalog.kuzu",
    buffer_pool_size=5 * GiB,
)
conn = kuzu.Connection(db, num_threads=4)
~~~

The exact starting point must reflect the runtime around Kuzu. A pure CLI import can devote more of the limit to the engine than a Python process that already holds a 2 GB DataFrame. Watch peak resident memory and adjust; do not copy the example number blindly.

Counterintuitively, lowering the buffer pool can make a load complete because it leaves space for non-buffer allocations. It can also increase I/O and extend elapsed time. The target is a stable peak below the hard limit, not the largest accepted constructor argument.

## Keep Spill-to-Disk Enabled

Kuzu's import guide says that preparing very large relationship tables can approach the buffer-pool limit. In an on-disk, read-write database, the engine can spill some preparation data to `<database-path>.tmp` beside the database file. The corresponding connection configuration is:

~~~cypher
CALL spill_to_disk=true;
~~~

Spilling is enabled by default. Do not disable it during a memory investigation unless the test is specifically intended to prove the effect. `CALL spill_to_disk=false` trades temporary I/O for a greater chance of memory failure.

Spill is not available for in-memory or read-only databases. That makes `:memory:` a poor choice for a bulk load whose working set exceeds RAM, even if the finished graph is ephemeral. Use an on-disk scratch database on fast storage, then delete it through the normal lifecycle after validation.

The database filesystem needs capacity and acceptable latency. Monitor both bytes and inodes while `COPY` runs because Kuzu truncates the spill file after the query finishes. A “no space left on device” failure beside an almost-empty final database can mean `<database-path>.tmp` exhausted that filesystem during the load.

## Reduce Execution Parallelism Deliberately

Kuzu can parse CSV in parallel and execute pipelines on multiple threads. Parallelism improves throughput but can raise peak memory. Establish a conservative baseline:

~~~cypher
CALL threads=2;
~~~

For CSV specifically, compare the documented reader option:

~~~cypher
COPY Event FROM 'staging/events-*.csv' (
    HEADER=true,
    PARALLEL=false
);
~~~

These settings affect different layers, so measure them independently. Start with fewer execution threads and serial CSV reading, confirm the load succeeds, then increase one control at a time. If doubling threads saves two minutes but removes all memory headroom, it is not a production improvement.

Parquet often reduces parsing ambiguity and may reduce source size, but it does not eliminate relationship-construction memory. Benchmark with representative types and degree distribution.

## “Import Batch Size” Is Usually an ETL Decision

Kuzu 0.11.3 does not document a generic `COPY FROM` row-batch-size knob. Do not invent one or pass an option copied from another database. Kuzu does support multiple files through a glob or list, and CSV has options such as `PARALLEL`, but a single `COPY` over twenty shards may still process them as one bulk operation.

When one relationship table remains too large, create controlled source batches upstream:

~~~cypher
COPY FOLLOWS FROM 'staging/follows-000.parquet';
COPY FOLLOWS FROM 'staging/follows-001.parquet';
COPY FOLLOWS FROM 'staging/follows-002.parquet';
~~~

This appends multiple statements to the same relationship table. Choose batch boundaries by observed peak memory and recovery cost, not an arbitrary row count. A shard with ten million low-degree edges may behave differently from one containing a handful of extreme hubs.

There are tradeoffs:

- Smaller statements cap the amount of source work that must be retried.
- More statements add transaction and checkpoint overhead.
- Poorly ordered batches may concentrate high-degree nodes and create uneven peaks.
- A failure after several successful appends requires an explicit resume ledger or a fresh rebuild; rerunning completed batches can duplicate relationships.

For a reproducible initial build, the simplest recovery policy is often to construct a fresh database and restart from the last table-level boundary. If resumable relationship batches are required, record checksums and completion status outside the database and validate counts before advancing.

## Load Nodes Before Relationships

Relationship imports resolve source and destination keys against node primary-key indexes. Load and validate every node table first:

~~~cypher
COPY Person FROM 'staging/person.parquet';
COPY Company FROM 'staging/company.parquet';

MATCH (p:Person) RETURN count(*) AS people;
MATCH (c:Company) RETURN count(*) AS companies;

COPY WORKS_AT FROM 'staging/works-at-*.parquet';
~~~

Preflight the edge source for null keys and references absent from the node datasets. Treating missing endpoints as a memory problem wastes tuning cycles and encourages unsafe `IGNORE_ERRORS` settings.

## Avoid Holding the Source Twice

A common Python anti-pattern reads the entire dataset into Pandas and then copies it while Kuzu allocates its own import structures. If data already exists in Parquet, let Kuzu read the files. If a DataFrame transformation is necessary, use a streaming or partitioned upstream transformation and release each source partition promptly.

Do not fetch large validation results into the client. Aggregate in Cypher:

~~~cypher
MATCH (:Person)-[r:WORKS_AT]->(:Company)
RETURN count(*) AS relationship_count,
       min(r.started_year) AS earliest,
       max(r.started_year) AS latest;
~~~

A query returning every imported relationship can exhaust memory after the import has succeeded, obscuring the actual result.

## Run a Controlled Tuning Matrix

Use the same database state and source checksum for every run. Record:

| Variable | Values to compare |
| --- | --- |
| Buffer pool | Conservative, medium, high within the process limit |
| Threads | 1, 2, 4, then higher only if justified |
| CSV parallel reader | `false` and `true` |
| Spill | Keep `true`; test `false` only to isolate behavior |
| Source format | Parquet versus explicitly configured CSV |
| Statement batch | Whole table versus deterministic shards |

Track elapsed time, peak RSS, peak `<database-path>.tmp` size, CPU utilization, and the exact row count committed. Change one dimension at a time. The fastest successful run with no operational headroom is not the winner; leave margin for dataset growth and environmental variance.

## Validate After Every Successful Load

Confirm node and relationship counts, source-to-destination referential coverage, duplicate expectations, min/max values, and representative traversals. If `IGNORE_ERRORS=true` was an approved requirement, inspect warnings before closing the connection:

~~~cypher
CALL show_warnings() RETURN *;
~~~

Warnings are connection-scoped. Export or record them during the run rather than assuming they will be available after reconnecting.

## Official Documentation

- [Kuzu 0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu import overview and relationship spilling](https://kuzudb.github.io/docs/import/)
- [Kuzu CSV import options](https://kuzudb.github.io/docs/import/csv/)
- [Kuzu Parquet import](https://kuzudb.github.io/docs/import/parquet/)
- [Kuzu configuration settings](https://kuzudb.github.io/docs/cypher/configuration/)
- [Kuzu Python API source for database configuration](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/python_api/src_py/database.py)
- [LadybugDB maintained configuration reference](https://docs.ladybugdb.com/cypher/configuration/)
- [LadybugDB maintained database internals](https://docs.ladybugdb.com/developer-guide/database-internal/)

## Conclusion

Stabilize Kuzu bulk loads by treating memory as a budget, not a single buffer-pool number. Leave room for the client and operating system, preserve disk spilling for on-disk imports, lower thread and CSV-reader concurrency, and split source data into deterministic statements only when measurement shows it is necessary. Most importantly, separate memory failures from malformed-data and missing-endpoint failures. A controlled matrix plus post-load invariants produces a setting you can defend, repeat, and safely operate on frozen Kuzu 0.11.3.
