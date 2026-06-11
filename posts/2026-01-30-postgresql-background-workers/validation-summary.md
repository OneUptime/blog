# Validation Summary: How to Build PostgreSQL Custom Background Workers

## Status
validated

## Post Type
Tutorial / Guide (in-depth technical walkthrough with C code examples)

## Technologies Covered
- PostgreSQL background workers (`bgworker.h` API)
- PostgreSQL C extension development (PGXS build system)
- Server Programming Interface (SPI)
- PostgreSQL shared memory (`ShmemInitStruct`, `RequestAddinShmemSpace`)
- PostgreSQL LWLocks and named LWLock tranches
- PostgreSQL latches (`WaitLatch`, `MyLatch`)
- GUC custom variables (`DefineCustomIntVariable`, `DefineCustomStringVariable`, `DefineCustomBoolVariable`)
- PostgreSQL signal handling (`pqsignal`, `BackgroundWorkerUnblockSignals`)
- PostgreSQL error handling (`PG_TRY`/`PG_CATCH`, `ereport`)
- Memory contexts (`AllocSetContextCreate`)
- Mermaid diagrams

## Sources Consulted
- PostgreSQL Documentation: Background Worker Processes — https://www.postgresql.org/docs/current/bgworker.html
- PostgreSQL Documentation: Server Programming Interface (SPI) — https://www.postgresql.org/docs/current/spi.html
- PostgreSQL Documentation: Shared Memory and LWLocks — https://www.postgresql.org/docs/current/xfunc-c.html
- PostgreSQL source: `src/include/postmaster/bgworker.h` (BackgroundWorker struct, flags, start time enum, `BGW_MAXLEN`, `BGW_NEVER_RESTART`, `RegisterBackgroundWorker`, `RegisterDynamicBackgroundWorker`, `WaitForBackgroundWorkerStartup`)
- PostgreSQL source: `src/backend/postmaster/bgworker.c`
- PostgreSQL source: `src/test/modules/worker_spi/worker_spi.c` (canonical example for background worker patterns)
- PostgreSQL source: `src/include/storage/ipc.h` (`shmem_request_hook`, `shmem_startup_hook`)
- PostgreSQL source: `src/include/storage/lwlock.h` (`RequestNamedLWLockTranche`, `GetNamedLWLockTranche`)
- PostgreSQL source: `src/include/utils/guc.h` (`MarkGUCPrefixReserved`, `DefineCustomIntVariable` and family, `PGC_SIGHUP`, `PGC_POSTMASTER`, `GUC_UNIT_S`)
- PostgreSQL system catalog: `pg_file_settings` documentation
- PostgreSQL system view: `pg_stat_activity.backend_type` documentation

## Issues Found
1. **Missing `prev_shmem_request_hook` declaration.** In the "Defining Shared State" snippet, only `prev_shmem_startup_hook` was declared as a static, yet later code (`my_worker_shmem_request`) dereferences `prev_shmem_request_hook`. Added the missing `static shmem_request_hook_type prev_shmem_request_hook = NULL;` declaration so the code compiles consistently with the later hook setup in `_PG_init`.
2. **Misleading SQL comment in monitoring section.** The query against `pg_catalog.pg_file_settings` was prefaced with the comment `-- Check logs`, but `pg_file_settings` reports which configuration file sourced each GUC value (it has no relation to server log output). Changed the comment to `-- Check current configuration values for the worker` to accurately describe the query.

## Review Notes
- The post uses `shmem_request_hook` and `MarkGUCPrefixReserved`, both of which were introduced in PostgreSQL 15. The code is correct for PostgreSQL 15 and newer. Readers targeting PostgreSQL 14 or earlier should call `RequestAddinShmemSpace` and `RequestNamedLWLockTranche` directly from `_PG_init` and use `EmitWarningsOnPlaceholders` instead. The post does not call out this version dependency, which is acceptable since modern PG development assumes a recent server, but worth noting.
- The format specifier `%ld` is used for `int64` values (e.g., `errmsg("found %ld pending items to process", count)`). On platforms where `long` is 32-bit (notably 64-bit Windows / LLP64), this is technically incorrect; PostgreSQL's portable idiom is `INT64_FORMAT`. The current usage will compile and work on typical LP64 Unix platforms but isn't strictly portable. Not corrected as it's a minor portability concern, not an incorrectness issue on the platforms most readers target.
- `_PG_init` is shown twice across the post (once in "Basic Worker Structure", again in the shared-memory hook setup, and again in "Configuration with GUC Variables"). Each snippet is illustrative of a separate concern; in an actual extension these would be merged into a single `_PG_init`. Readers familiar with C extension structure should understand this convention.
- The `pg_stat_activity` query uses `backend_type = 'my_custom_worker'`, which matches the `bgw_type` set in the registration code — this is the correct field for filtering background workers in modern PostgreSQL.
- All SPI patterns, latch usage, signal handling boilerplate, GUC registration, memory context discipline, and `PG_TRY`/`PG_CATCH` patterns match the canonical PostgreSQL `worker_spi` example and current upstream conventions.
