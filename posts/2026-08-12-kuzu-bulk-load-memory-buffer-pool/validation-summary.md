# Validation Summary: Tune Kuzu Bulk Loads to Prevent Memory Exhaustion

## Status
validated

## Post Type
Technical troubleshooting and performance-tuning guide

## Technologies Covered
- Kuzu 0.11.3 graph database
- Cypher `COPY FROM` and connection configuration
- Kuzu Python API
- CSV and Parquet bulk imports
- Buffer-pool sizing and spill-to-disk behavior
- Linux containers and cgroup memory limits
- LadybugDB successor documentation

## Sources Consulted
- [Kuzu v0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu import overview, relationship spilling, and warnings](https://kuzudb.github.io/docs/import/)
- [Kuzu CSV import options and multi-file imports](https://kuzudb.github.io/docs/import/csv/)
- [Kuzu Parquet import and multi-file imports](https://kuzudb.github.io/docs/import/parquet/)
- [Kuzu connection configuration](https://kuzudb.github.io/docs/cypher/configuration/)
- [Kuzu CLI and buffer-pool option](https://kuzudb.github.io/docs/client-apis/cli/)
- [Kuzu-Wasm browser filesystem modes](https://kuzudb.github.io/docs/client-apis/wasm/)
- [Kuzu v0.11.3 Python `Database` implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/python_api/src_py/database.py)
- [Kuzu v0.11.3 Python `Connection` implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/python_api/src_py/connection.py)
- [Kuzu v0.11.3 default buffer-pool calculation and spill-path initialization](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/main/database.cpp)
- [Kuzu v0.11.3 spill-file path construction](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/include/storage/storage_utils.h#L76-L78)
- [Kuzu v0.11.3 spill eligibility](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/storage/buffer_manager/buffer_manager.cpp#L66-L85)
- [Kuzu v0.11.3 spill cleanup and forced `COPY FROM` checkpoints](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/main/client_context.cpp#L587-L597)
- [Kuzu v0.11.3 local file creation behavior](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/common/file_system/local_file_system.cpp#L52-L123)
- [LadybugDB v0.12.0 release and Kuzu v0.11.3 compatibility statement](https://blog.ladybugdb.com/post/ladybug-release/)
- [LadybugDB maintained configuration reference](https://docs.ladybugdb.com/cypher/configuration/)
- [LadybugDB repository](https://github.com/LadybugDB/ladybug)

## Issues Found
- **Incorrect buffer-pool default description.** The post described a historical default based on “available memory” and only attributed the approximately 80% value to successor documentation. Kuzu 0.11.3 actually calculates the default as 80% of detected total physical memory, capped at 80% of its maximum virtual-memory-region size, and does not explicitly inspect cgroup limits. Replaced the wording with the pinned 0.11.3 behavior and retained the recommendation to configure containers explicitly.
- **Incorrect spill-file location and monitoring guidance.** The post implied that the spill file used the current working directory and could land on a filesystem separate from the database. Kuzu 0.11.3 deterministically uses `<database-path>.tmp`, adjacent to the database file. Updated the diagnostic and capacity guidance to monitor the database filesystem, and clarified that the spill file must be observed during `COPY` because Kuzu truncates it when the query finishes.
- **Overbroad browser/Wasm limitation.** The post classified every browser build as unable to spill. Kuzu-Wasm also supports a persistent IDBFS browser filesystem, while the engine's spill eligibility depends on the database being local, on disk, and read-write rather than on Wasm alone. Narrowed the failure class to in-memory databases; the separate documented read-only restriction remains unchanged.
- **Python example assumed a pre-existing parent directory.** `kuzu.Database("build/catalog.kuzu", ...)` fails when `build/` does not already exist because the API creates the database file but not missing parent directories. Changed the example path to `catalog.kuzu` so the snippet works without an unstated setup step.

## Review Notes
- The Python `buffer_pool_size` value is correctly expressed in bytes, and `kuzu.Connection(db, num_threads=4)` is valid in Kuzu 0.11.3.
- `CALL threads=2;`, `CALL spill_to_disk=true;`, `HEADER=true`, `PARALLEL=false`, and `CALL show_warnings() RETURN *;` are valid for the pinned release.
- Kuzu 0.11.3 documents no generic `COPY FROM` row-batch-size option. CSV and Parquet support globs and file lists, and separate `COPY` statements append to an existing table. Each `COPY FROM` also forces a checkpoint, supporting the stated overhead tradeoff.
- The requirements to load endpoint nodes before relationships and to inspect connection-scoped warnings before reconnecting are correct.
- The Kuzu repository is archived and v0.11.3 is its final release. LadybugDB began as a functionally equivalent fork but is maintained independently, so the post correctly tells Kuzu users to verify behavior against the exact frozen package they deploy.
- The Python constructors and configuration calls were smoke-tested with official Kuzu 0.11.3 artifacts. All external links listed in the post returned successfully during validation on 2026-08-12.
