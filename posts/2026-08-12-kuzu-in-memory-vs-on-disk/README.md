# Kuzu In-Memory vs On-Disk: Which Mode Fits Tests, Analytics, and Production?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, In-Memory Database, Persistent Storage, Testing, Graph Analytics

Description: Choose Kuzu's in-memory or on-disk mode from durability, working-set size, concurrency, and reproducibility—not filename folklore.

---

Kuzu selects persistence when the `Database` is created. An omitted path, an empty string, or `:memory:` creates an in-memory database. A real path creates an on-disk database. The query language may look identical, but recovery, spilling, sharing, and lifecycle are not.

Use in-memory mode for small, disposable graphs whose complete setup is part of the job. Use on-disk mode when data must survive a process, the stored graph can exceed memory, or you need a recoverable operational artifact. Production is usually on-disk; “the source data can be rebuilt” is not enough unless rebuild time and failure behavior meet the service objective.

## What the Two Modes Guarantee

An on-disk Python database is explicit:

~~~python
import kuzu

db = kuzu.Database("/var/lib/graph/app.kuzu")
conn = kuzu.Connection(db)
~~~

Kuzu persists data at that path, logs updates to a write-ahead log (WAL), and merges them into database data files during checkpoints. Starting with Kuzu `0.11.0`, the durable graph is a single primary file, with `.wal`, `.shadow`, and `.tmp` companions created as needed.

In-memory mode uses no durable path:

~~~python
import kuzu

db = kuzu.Database(":memory:")
conn = kuzu.Connection(db)
~~~

Kuzu documents that in-memory mode does not write a WAL and persists nothing to disk. When the process ends, the graph is gone. `kuzu.Database()`, `kuzu.Database("")`, and `kuzu.Database(":memory:")` select that behavior in the Python API; use the explicit `:memory:` form in application code so intent is visible.

## Tests: In Memory for Isolation, On Disk for Reality

In-memory databases are excellent for unit tests that create a tiny schema and fixture every time:

~~~python
import kuzu

def open_fixture():
    db = kuzu.Database(":memory:")
    conn = kuzu.Connection(db)
    conn.execute("CREATE NODE TABLE User(id STRING PRIMARY KEY, name STRING)")
    conn.execute("CREATE (:User {id: 'u-1', name: 'Ada'})")
    return db, conn

def test_user_lookup():
    db, conn = open_fixture()
    result = conn.execute(
        "MATCH (u:User) WHERE u.id = $id RETURN u.name",
        {"id": "u-1"},
    )
    assert list(result) == [["Ada"]]
~~~

Adapt parameter syntax to the exact binding method used by the pinned package. The important testing property is that every test owns a new database and fully declares its fixture.

Do not run only in-memory tests. They cannot prove:

- WAL recovery after an abrupt process termination or crash;
- checkpoint behavior;
- filesystem permissions and lock handling;
- single-file compatibility across the chosen release path;
- `.tmp` spilling for eligible `COPY FROM` work under memory pressure;
- backup and logical export procedures;
- restart persistence.

Add an on-disk integration suite using a unique temporary directory:

~~~python
from pathlib import Path
from tempfile import TemporaryDirectory
import kuzu

with TemporaryDirectory() as directory:
    path = Path(directory) / "integration.kuzu"
    db = kuzu.Database(path)
    conn = kuzu.Connection(db)
    conn.execute("CREATE NODE TABLE Item(id INT64 PRIMARY KEY, value STRING)")
    conn.execute("CREATE (:Item {id: 1, value: 'persisted'})")
    conn.close()
    db.close()

    reopened_db = kuzu.Database(path)
    reopened = kuzu.Connection(reopened_db)
    result = reopened.execute("MATCH (i:Item) RETURN i.id, i.value")
    rows = list(result)
    assert rows == [[1, "persisted"]]
    result.close()
    reopened.close()
    reopened_db.close()
~~~

Close all query results and connections before explicitly closing a database. The Python API notes that closing releases the file lock and that dependent objects should be closed first.

## Exploratory Analytics: Size and Repeatability Decide

For a small graph loaded from CSV or DataFrames, in-memory mode removes file cleanup and is convenient in a notebook. It works well when:

- source files are authoritative and quick to reload;
- the complete graph plus query intermediates fit comfortably in memory;
- losing state at kernel restart is acceptable;
- no other process needs the same graph;
- the analysis is genuinely disposable.

Use on-disk mode when loading dominates the session, the graph is reused, or the stored graph may exceed memory. Kuzu describes on-disk mode as suitable for larger-than-memory workloads. During `COPY FROM`, its `SPILL_TO_DISK` setting allows eligible intermediate import data to spill to a temporary file under memory pressure. The setting cannot be enabled in in-memory or read-only mode, so in-memory mode cannot fall back to disk for an oversized import.

Do not assume in-memory mode always wins a benchmark. An on-disk database uses a buffer pool and hot data may already be cached by Kuzu and the operating system. End-to-end runtime includes loading, checkpointing, warm-up, and repeated queries. Measure the actual workflow with a fixed dataset and memory limit.

For notebooks, write the rebuild steps as code even when choosing on-disk mode. A hidden graph accumulated across cells is hard to reproduce and can retain a read-write lock that later blocks the CLI.

## Production: Start with Durability Requirements

As of August 2026, [Kuzu's upstream repository](https://github.com/kuzudb/kuzu) is archived and read-only, and [`0.11.3`](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3) remains its latest official release. Factor the absence of active upstream maintenance into any new production deployment.

Choose on-disk mode if any of these is true:

- acknowledged writes must survive process or host restart;
- rebuilding takes longer than the recovery objective;
- the source feed cannot replay exactly;
- operators need backups, logical exports, or audit artifacts;
- the graph is larger than the safe memory budget;
- deployments restart or reschedule routinely;
- losing recently derived state would change user-visible behavior.

An ephemeral container with an on-disk path is not durable unless the path is on an appropriate persistent volume. Conversely, a persistent mount does nothing for `:memory:` because Kuzu never writes the graph there.

In-memory production can be appropriate for a graph that the application treats as read-only and derives deterministically at startup, such as a small per-job analysis or disposable cache. Treat startup loading as part of availability: verify source access, bound the dataset, expose readiness only after import and validation, and define behavior when rebuild fails.

## Concurrency Differs in Important Ways

In-memory databases can only be opened `READ_WRITE`; Kuzu does not support a read-only in-memory database. An in-memory Kuzu database cannot be used as the target of `ATTACH`, and Kuzu documents that HTTPFS remote-file caching is unsupported for in-memory databases.

An on-disk database can be opened in either mode, but for a given on-disk database path the allowed combinations are:

- one `READ_WRITE` `Database` object; or
- multiple separate `READ_ONLY` database objects.

Multiple connections from the same read-write database object are safe. Separate service processes cannot each open a writer. If many clients must write, put one API server process in front of the one Kuzu database and route requests through it.

In-memory mode does not enable cross-process sharing. Each process has a different graph, even if both call their database `:memory:`.

## Memory Budgeting Matters in Both Modes

The Python `Database` constructor exposes `buffer_pool_size` and `max_num_threads`; in Kuzu `0.11.3`, the CLI defaults its maximum buffer pool to about 80% of total physical system memory, subject to a virtual-memory-region cap, and accepts `--defaultbpsize` in MiB. A production process shares memory with the runtime, request buffers, result serialization, and other libraries, so leaving every component at an aggressive default can cause host-level pressure.

For an on-disk deployment, set a tested budget:

~~~python
import kuzu

db = kuzu.Database(
    "/var/lib/graph/app.kuzu",
    buffer_pool_size=4 * 1024 * 1024 * 1024,
    max_num_threads=4,
)
~~~

The example is a 4 GiB pool, not a universal recommendation. Benchmark with the same container limit and concurrent request shape as production. Watch both steady-state resident memory and peaks during import, aggregation, sorting, and result conversion.

For in-memory mode, the database data itself consumes memory in addition to query work. Leave headroom for both; a source file size is not a reliable upper bound on runtime memory.

## Backups and Migration

On-disk operation enables a durable primary file, but a logical export is the stronger portability artifact:

~~~cypher
EXPORT DATABASE '/srv/backups/graph-export';
~~~

Kuzu's export contains schema, macros, generated copy statements, and data files; indexes are exported only when their dependent extensions have been loaded. Test `IMPORT DATABASE` into a clean empty database. Do not call a live file copy “validated” without a restore test.

An in-memory graph can also be exported before shutdown if preserving it becomes necessary. That is an explicit application action; Kuzu will not persist it automatically merely because the process exits normally.

## Decision Checklist

Choose **in memory** when all answers are yes:

- Is the graph disposable?
- Can setup recreate it completely and quickly?
- Does data plus worst-case query memory fit with headroom?
- Is one process sufficient?
- Are on-disk recovery and `COPY FROM` spill behavior outside this test's purpose?

Choose **on disk** if any answer is no, then configure a real persistent path, one-writer ownership, memory limits, backup/export, and restore tests.

## Official Documentation

- [Kuzu persistence modes and quick start](https://kuzudb.github.io/docs/get-started/)
- [Kuzu connections and in-memory restrictions](https://kuzudb.github.io/docs/concurrency/)
- [Kuzu Python `Database` options](https://kuzudb.github.io/api-docs/python/kuzu.html#Database)
- [Kuzu CLI buffer-pool configuration](https://kuzudb.github.io/docs/client-apis/cli/)
- [Kuzu query and spill configuration](https://kuzudb.github.io/docs/cypher/configuration/)
- [Kuzu transactions and checkpoints](https://kuzudb.github.io/docs/cypher/transaction/)
- [Kuzu on-disk files](https://kuzudb.github.io/docs/developer-guide/files/)
- [Kuzu database export/import](https://kuzudb.github.io/docs/migrate/)

## Conclusion

In-memory Kuzu is a disposable execution mode, ideal for isolated small tests and quick analyses. On-disk Kuzu adds WAL-backed persistence, support for larger-than-memory graph workloads, and an artifact that can be backed up and migrated. Pick from failure and recovery requirements first, then measure performance under a realistic memory budget.
