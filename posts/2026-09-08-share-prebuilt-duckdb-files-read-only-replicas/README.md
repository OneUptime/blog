# How to Share Prebuilt DuckDB Files Across Read-Only Replicas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DuckDB, Database, Analytics, Storage, High Availability

Description: Publish immutable, cleanly closed DuckDB artifacts and let replicas verify and open local copies in explicit read-only mode.

---

DuckDB supports multiple processes reading the same native database when no process writes. The safest replica pattern is stronger than that minimum: build one immutable file, close it cleanly, publish it under a versioned name, and let each application replica copy it to local storage and open it read-only.

Never copy a live DuckDB main file by itself. DuckDB creates a `.wal` file, and that WAL is required for recovery after a crash.

## Build in a private staging path

Give one publisher exclusive write ownership of a new version:

```text
/srv/build/catalog-20260908T014500Z.duckdb.partial
```

Load data in bounded transactions, record the source snapshot or high-water mark, and validate domain invariants. Before publishing, issue a checkpoint and close every connection normally:

```sql
CHECKPOINT;
```

A clean close is the artifact boundary. Confirm that no publisher process has the file open and that no companion `.wal` remains. If a publisher crashed, reopen the database with DuckDB and let recovery complete. Do not delete the WAL or distribute the unrecovered main file.

## Validate and describe the artifact

Open the staged file with the same minimum reader version used by replicas and run representative queries. Create a manifest containing:

- immutable version or content identifier;
- byte size and SHA-256 checksum;
- creation and source-cutoff timestamps;
- DuckDB version used to build it;
- minimum supported reader version;
- schema version and required extensions;
- important table row counts and totals.

DuckDB's storage format is backward-compatible from version 0.10 onward, meaning newer DuckDB releases can read files from older releases. That does not promise that every older reader can open a file produced by a newer writer. Qualify the exact reader and writer versions before rollout.

Rename the fully built artifact within the same filesystem, then atomically update a small manifest or pointer. Consumers must never discover the `.partial` name.

## Transfer to a local replica path

Have each replica download or copy the immutable version to a unique staging name, then verify size and checksum before renaming it locally:

```bash
shasum -a 256 /var/lib/myapp/catalog-v42.duckdb.partial
mv /var/lib/myapp/catalog-v42.duckdb.partial \
   /var/lib/myapp/catalog-v42.duckdb
```

Only use `mv` as the publication step when source and destination are on the same filesystem. Retain the old local version until all queries using it have completed.

Local copies isolate query I/O, avoid network-filesystem lock and latency surprises, and make rollout independent for each replica. If shared storage is unavoidable, keep the artifact strictly immutable and test the exact filesystem path.

## Open with explicit read-only access

Do not rely only on file permissions. Tell DuckDB the intended access mode through the client binding:

```python
import duckdb

connection = duckdb.connect(
    "/var/lib/myapp/catalog-v42.duckdb",
    read_only=True,
)
```

The SQL configuration name is `access_mode='READ_ONLY'`. Use one well-defined connection factory so no worker silently requests read-write access. File ownership and mount permissions should also prevent writes as defense in depth.

Queries may still need memory and temporary spill space. Configure `memory_limit`, `threads`, `temp_directory`, and `max_temp_directory_size` for each replica. Put spill on a separate writable local path, not beside an immutable mounted artifact.

## Roll out with versioned handles

Do not overwrite a file while a process has it open. A replica should:

1. read the published manifest;
2. fetch and verify the new immutable version;
3. open it read-only and run a health query;
4. atomically swap its application-level database handle;
5. let in-flight requests finish on the old handle;
6. close and later remove the old file.

If health checks fail, leave the current handle unchanged and report the bad version. Because files are content-addressed or versioned, rollback is selecting the previous manifest rather than reconstructing data during an incident.

## Keep extensions and external files reproducible

A database may contain views that reference external Parquet files or functions supplied by extensions. A single `.duckdb` file is then not the complete data product. Pin extension versions and availability, restrict external access as needed, and include every referenced immutable object in the manifest.

Prefer materialized tables when a self-contained replica artifact is the goal. Test startup in a clean environment without the publisher's home directory or extension cache.

## Monitor freshness and fleet convergence

Expose the loaded artifact version and source cutoff from every replica. Alert on checksum failures, replicas stuck on an old version, query errors after a swap, local disk pressure, and refresh age beyond the analytical SLO.

The artifact model is asynchronous by design. Do not present it as strongly current transactional state.

## Conclusion

Build DuckDB files with one writer, checkpoint and close them cleanly, validate and checksum them, then publish immutable versioned artifacts. Replicas should verify local copies, open them explicitly read-only, and swap handles without overwriting an open file. Keep WAL recovery, version compatibility, extensions, and freshness in the release contract.

## Official Documentation

- [DuckDB concurrency and read-only mode](https://duckdb.org/docs/current/connect/concurrency.html)
- [DuckDB connection and storage compatibility](https://duckdb.org/docs/current/connect/overview.html)
- [DuckDB files and WAL behavior](https://duckdb.org/docs/current/operations_manual/footprint_of_duckdb/files_created_by_duckdb.html)
- [DuckDB CHECKPOINT statement](https://duckdb.org/docs/current/sql/statements/checkpoint.html)
