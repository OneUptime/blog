# Validation Summary: How to Share Prebuilt DuckDB Files Across Read-Only Replicas

## Status
validated

## Post Type
Technical guide with SQL, Python, and shell examples.

## Technologies Covered
- DuckDB native database files, concurrency, checkpoints, and WAL recovery
- Python DuckDB client and explicit read-only connections
- SHA-256 artifact verification with shasum
- Filesystem renames and immutable artifact distribution
- DuckDB resource configuration, extensions, and external Parquet dependencies

## Sources Consulted
- DuckDB concurrency: https://duckdb.org/docs/current/connect/concurrency.html
- DuckDB connections and storage compatibility: https://duckdb.org/docs/current/connect/overview.html
- DuckDB files and WAL lifecycle: https://duckdb.org/docs/current/operations_manual/footprint_of_duckdb/files_created_by_duckdb.html
- DuckDB CHECKPOINT syntax and transaction restrictions: https://duckdb.org/docs/current/sql/statements/checkpoint.html
- DuckDB Python DB API, read_only, and connection closure: https://duckdb.org/docs/current/clients/python/dbapi
- DuckDB configuration reference: https://duckdb.org/docs/current/configuration/overview
- DuckDB extension versioning: https://duckdb.org/docs/current/extensions/versioning_of_extensions
- DuckDB CREATE VIEW semantics: https://duckdb.org/docs/current/sql/statements/create_view
- Perl shasum documentation: https://perldoc.perl.org/shasum
- Installed shasum --help output, including SHA-256 selection and checksum checking.
- Local macOS mv(1) and rename(2) manual pages, including cross-filesystem copy behavior and same-filesystem rename semantics.

## Issues Found
- The transfer example printed a SHA-256 digest but never compared it with the manifest, checked the byte size, or prevented publication after verification failure. Replaced it with required manifest-derived expected values, a byte-count comparison, shasum check mode, and conditional execution of mv. This makes the executable example enforce the verification required by the surrounding text.

## Review Notes
- Confirmed the native-file multiple-reader model, explicit Python read_only=True argument, WAL recovery guidance, and CHECKPOINT syntax. Build transactions must finish before CHECKPOINT; the documented command can fail while transactions are running.
- Confirmed the backward-compatibility explanation starting with DuckDB 0.10 and the distinction from forward compatibility. The exact writer/reader compatibility test remains necessary.
- Confirmed access_mode, memory_limit, threads, temp_directory, and max_temp_directory_size are documented configuration names. Read-only database access does not eliminate query spill requirements.
- Confirmed views store queries rather than materialized results, so referenced external data and extension dependencies must remain available. Extension versions have their own release semantics.
- The immutable publication, handle draining, rollback, and freshness recommendations are application-level design guidance, not claims of built-in DuckDB replication or transactional fleet-wide consistency.
- All four official documentation links in the post resolved to the intended DuckDB pages; the .html links redirect to canonical URLs. The author link is a plausible GitHub profile URL and is not a technical reference.
- Parsed the Python example and checked Bash syntax. Executed the corrected shell example with temporary paths: matching size/checksum published successfully; incorrect size and incorrect checksum both blocked publication.
- DuckDB is not installed in the local Python environment, so SQL execution, WAL recovery, and multi-process runtime behavior were verified against official documentation rather than a local DuckDB integration test. No deprecated API was identified in the examples.
