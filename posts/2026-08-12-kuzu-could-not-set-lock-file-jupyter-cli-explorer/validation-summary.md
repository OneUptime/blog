# Validation Summary: Fix Kuzu “Could Not Set Lock on File” Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Kuzu 0.11.x embedded graph database
- Kuzu Python API
- Kuzu command-line interface
- Kuzu Explorer and Docker
- Jupyter notebooks and kernels
- OS-level file locking and process diagnostics
- Kuzu transactions and on-disk companion files

## Sources Consulted

- Kuzu connections and concurrency documentation: https://kuzudb.github.io/docs/concurrency/
- Kuzu Python API guide: https://kuzudb.github.io/docs/client-apis/python/
- Kuzu Python API reference: https://kuzudb.github.io/api-docs/python/kuzu.html
- Kuzu CLI documentation: https://kuzudb.github.io/docs/client-apis/cli/
- Kuzu Explorer documentation: https://kuzudb.github.io/docs/visualization/kuzu-explorer/
- Kuzu transactions documentation: https://kuzudb.github.io/docs/cypher/transaction/
- Kuzu on-disk files documentation: https://kuzudb.github.io/docs/developer-guide/files/
- Kuzu database migration documentation: https://kuzudb.github.io/docs/migrate/
- Kuzu 0.11.0 release notes: https://github.com/kuzudb/kuzu/releases/tag/v0.11.0
- Archived Kuzu repository and final-release notice: https://github.com/kuzudb/kuzu
- Kuzu 0.11.3 local-file open and lock implementation: https://github.com/kuzudb/kuzu/blob/89f0263cc7a1fd9c396d2c4953747a013556a7f9/src/common/file_system/local_file_system.cpp#L109-L147
- Kuzu 0.11.3 transaction-manager implementation: https://github.com/kuzudb/kuzu/blob/89f0263cc7a1fd9c396d2c4953747a013556a7f9/src/transaction/transaction_manager.cpp#L20-L39
- Kuzu Explorer database configuration implementation: https://github.com/kuzudb/explorer/blob/1ceb6e2884768d7a089632b5688f401371ca44b4/src/server/utils/Database.js#L38-L60
- Python `pathlib.Path.resolve` documentation: https://docs.python.org/3/library/pathlib.html#pathlib.Path.resolve
- Docker `run` reference: https://docs.docker.com/reference/cli/docker/container/run/

## Issues Found

- The explanation said Kuzu prevents a second database instance whenever a writer is involved. The supported topology is indeed one read-write `Database` object or multiple read-only objects, but POSIX process-associated locks do not reliably reject a second read-write object in the same process, and Explorer has a documented container-lock limitation. The wording now describes the supported concurrency model without overstating enforcement.
- The Explorer command mounted the directory containing `app.kuzu` but did not set `KUZU_FILE`. Explorer defaults to `database.kz`, so the command would not select the database used throughout the post. Added `KUZU_FILE=app.kuzu` and noted that the Explorer image version must match the Kuzu version that created the database.
- The transaction section said long writes can queue or block other writers. Kuzu 0.11.3 rejects a second concurrent write transaction rather than queuing it. The post now tells applications to serialize or retry competing writes.
- The permissions section said the specific lock error could be caused by an inability to set required filesystem permissions. Kuzu opens the database file before attempting its lock, so ordinary access failures produce a file-open error; the lock error is emitted only after the open succeeds and the lock operation fails. The text now distinguishes permission failures from lock conflicts, checks directory writability, and refers to a read-only mount rather than a read-only container.

## Review Notes

- Kuzu was archived on October 10, 2025, and `0.11.3` is its final release. This review targets that final behavior; older database storage formats may require a matching Kuzu and Explorer version.
- The Python lifecycle example was executed with the released `kuzu==0.11.3` package. The query returned `[[0]]`, and `QueryResult.close()`, `Connection.close()`, and `Database.close()` completed in the documented order.
- Multiple independent read-only database objects were tested successfully, and a separate read-only process was rejected while a read-write object held the same database open.
- All links in the post's Official Documentation section were checked and resolved to the described resources.
