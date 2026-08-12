# Validation Summary: How to Audit a Frozen Kuzu Deployment for Security and Compatibility Risk

## Status
validated

## Post Type
Technical security and compatibility audit guide

## Technologies Covered
- Kuzu 0.11.3 embedded graph database
- Cypher and parameterized queries
- Kuzu CLI and Python, Node.js, Java, Rust, Go, C, and C++ bindings
- Native Kuzu extensions and local extension repositories
- Database locking, transactions, WAL recovery, checkpoints, and logical export/import
- Containers, operating-system/runtime compatibility, and artifact hashing
- LadybugDB migration planning

## Sources Consulted
- [Archived Kuzu repository](https://github.com/kuzudb/kuzu) and [Kuzu v0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu installation](https://kuzudb.github.io/docs/installation/) and [system requirements](https://kuzudb.github.io/docs/system-requirements/)
- [Published Kuzu 0.11.3 artifacts on PyPI](https://pypi.org/project/kuzu/0.11.3/)
- [Kuzu CLI documentation](https://kuzudb.github.io/docs/client-apis/cli/) and [npm `ls` documentation](https://docs.npmjs.com/cli/v11/commands/npm-ls/)
- [Kuzu prepared-statements guide](https://kuzudb.github.io/docs/get-started/prepared-statements/), [Python API reference](https://kuzudb.github.io/api-docs/python/kuzu.html), and [tagged v0.11.3 Python connection implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/python_api/src_py/connection.py)
- [Kuzu extension documentation](https://kuzudb.github.io/docs/extensions/), [tagged v0.11.3 extension-directory implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/main/client_context.cpp#L195-L198), and [static-extension configuration](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/extension_config.cmake)
- [Kuzu connections and concurrency](https://kuzudb.github.io/docs/concurrency/)
- [Kuzu transactions and checkpoints](https://kuzudb.github.io/docs/cypher/transaction/) and [on-disk file documentation](https://kuzudb.github.io/docs/developer-guide/files/)
- [Kuzu export/import migration documentation](https://kuzudb.github.io/docs/migrate/) and [CSV import options](https://kuzudb.github.io/docs/import/csv/)
- [Kuzu Cypher syntax](https://kuzudb.github.io/docs/cypher/syntax/) and [ATTACH/DETACH documentation](https://kuzudb.github.io/docs/cypher/attach/)
- [Node.js Node-API documentation](https://nodejs.org/api/n-api.html)
- [Microsoft `Get-FileHash` documentation](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/get-filehash)
- [LadybugDB repository](https://github.com/LadybugDB/ladybug), [current v0.19.1 release](https://github.com/LadybugDB/ladybug/releases/tag/v0.19.1), [first post-Kuzu fork release notes](https://blog.ladybugdb.com/post/ladybug-release/), and [Ladybug migration documentation](https://docs.ladybugdb.com/migrate/)

## Issues Found
- The Python example used the deprecated two-step `Connection.prepare()` plus `execute()` API. It was replaced with the supported `execute(query, parameters=...)` form, which prepares parameterized queries automatically in Kuzu 0.11.3.
- The post repeated the archived documentation's `~/.kuzu/extensions` path. Tagged v0.11.3 runtime source actually resolves dynamically installed official extensions below `~/.kuzu/extension/0.11.3/<platform>/`; both path references were corrected and the documentation/source discrepancy was made explicit.
- The statement that all other extensions require a local repository was too broad. It now says that other official extensions installed by name require a local extension server, while self-built extensions can be loaded directly by path. The inventory guidance was also clarified for the four statically linked bundled extensions, whose containing engine or binding artifact must be hashed.
- The hashing example assumed GNU `sha256sum` and `/usr/local/bin/kuzu`. It now resolves the executable from `PATH`, provides Linux and macOS commands, and points Windows users to `Get-FileHash`.
- The recovery procedure did not state that extension-dependent indexes are exported only when their owning extensions are loaded. It now includes that prerequisite and accurately calls the `EXPORT DATABASE` output a directory.

## Review Notes
- The archived Kuzu system-requirements page is stale relative to the published artifacts: it says Python wheels cover CPython 3.7 through 3.11, while the published 0.11.3 release includes additional wheels through CPython 3.14 on some platforms. The post correctly recommends verifying the exact downloaded artifacts and testing the deployment's own compatibility matrix rather than relying on a broad support assumption.
- Kuzu documents one `READ_WRITE` `Database` object or multiple `READ_ONLY` objects for a database. File locking normally enforces this, but the documentation identifies a Kuzu Explorer/Docker lock-visibility exception, so the post appropriately treats the one-writer-object rule as an operational invariant rather than an absolute lock guarantee.
- `IMPORT DATABASE` must target an empty database and does not automatically roll back a failed import. Recovery testing should discard and recreate a failed target before retrying.
- Commands and the corrected Python query were also smoke-tested with published Kuzu 0.11.3 artifacts. The Python version and parameterized query worked, the old `prepare()` form emitted its documented deprecation warning, and the Node.js package loaded under Node.js 24.
