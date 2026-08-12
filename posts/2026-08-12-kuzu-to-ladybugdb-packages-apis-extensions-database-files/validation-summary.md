# Validation Summary: Kuzu to LadybugDB: What Actually Changes in Packages, APIs, Extensions, and Database Files?

## Status

validated

## Post Type

Technical migration guide

## Technologies Covered

- Kuzu 0.11.3
- LadybugDB 0.19.1
- Python and Node.js client APIs
- Java, Rust, and Go packages
- Cypher DDL, configuration, checkpoint, export, and import commands
- Native extensions, including JSON, FTS, vector search, and external-data connectors
- Single-file database storage, WAL, shadow, and temporary files

## Sources Consulted

- [Kuzu GitHub archive and extension guidance](https://github.com/kuzudb/kuzu)
- [Kuzu v0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu installation](https://kuzudb.github.io/docs/installation/)
- [Kuzu Python API](https://kuzudb.github.io/docs/client-apis/python/)
- [Kuzu Node.js API](https://kuzudb.github.io/docs/client-apis/nodejs/)
- [Kuzu CLI](https://kuzudb.github.io/docs/client-apis/cli/)
- [Kuzu configuration](https://kuzudb.github.io/docs/cypher/configuration/)
- [Kuzu table definitions](https://kuzudb.github.io/docs/cypher/data-definition/create-table/)
- [Kuzu extensions](https://kuzudb.github.io/docs/extensions/)
- [Kuzu on-disk files](https://kuzudb.github.io/docs/developer-guide/files/)
- [Kuzu export and import](https://kuzudb.github.io/docs/migrate/)
- [Kuzu v0.11.3 extension-directory implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/main/client_context.cpp)
- [LadybugDB repository and package map](https://github.com/LadybugDB/ladybug)
- [LadybugDB v0.19.1 release](https://github.com/LadybugDB/ladybug/releases/tag/v0.19.1)
- [LadybugDB installation](https://docs.ladybugdb.com/installation/)
- [LadybugDB Python API](https://docs.ladybugdb.com/client-apis/python/)
- [LadybugDB Node.js API](https://docs.ladybugdb.com/client-apis/nodejs/)
- [LadybugDB CLI](https://docs.ladybugdb.com/client-apis/cli/)
- [LadybugDB configuration](https://docs.ladybugdb.com/cypher/configuration/)
- [LadybugDB table definitions and relationship multiplicities](https://docs.ladybugdb.com/cypher/data-definition/create-table/)
- [LadybugDB `ORDER BY`](https://docs.ladybugdb.com/cypher/query-clauses/order-by/)
- [LadybugDB extensions](https://docs.ladybugdb.com/extensions/)
- [LadybugDB on-disk files](https://docs.ladybugdb.com/developer-guide/files/)
- [LadybugDB export and import](https://docs.ladybugdb.com/migrate/)
- [LadybugDB v0.19.1 extension-directory implementation](https://github.com/LadybugDB/ladybug/blob/v0.19.1/src/main/client_context.cpp)
- [LadybugDB v0.19.1 CLI history-path implementation](https://github.com/LadybugDB/ladybug/blob/v0.19.1/tools/shell/shell_runner.cpp)
- [LadybugDB v0.19.1 extension ABI version](https://github.com/LadybugDB/ladybug/blob/v0.19.1/CMakeLists.txt#L502)
- [LadybugDB v0.19.1 database-import implementation](https://github.com/LadybugDB/ladybug/blob/v0.19.1/src/processor/operator/simple/import_db.cpp)
- [LadybugDB official FTS extension export tests](https://github.com/LadybugDB/extensions/blob/4bd1dc1149964c8ea8eaf0a060f1a56c2d0dc4a5/fts/test/test_files/fts_small.test#L390-L415)
- [Node.js ECMAScript modules and top-level `await`](https://nodejs.org/api/esm.html#top-level-await)
- [LadybugDB on PyPI](https://pypi.org/project/ladybug/)
- [`@ladybugdb/core` on npm](https://www.npmjs.com/package/@ladybugdb/core)
- [LadybugDB Java artifact on Maven Central](https://central.sonatype.com/artifact/com.ladybugdb/lbug)
- [LadybugDB Rust crate](https://crates.io/crates/lbug)

## Issues Found

1. The Node.js example used CommonJS `require()` with top-level `await`, which is a syntax error in a normal CommonJS file. Wrapped the asynchronous example in an async IIFE; the corrected example runs with `@ladybugdb/core@0.19.1`.
2. The Cypher example ordered only by the two endpoint IDs even though the returned `f.since` value can differ between parallel relationships sharing those endpoints. Added `f.since` to `ORDER BY` and clarified that a comparison needs an ordering that fully orders the returned values.
3. The per-user and extension paths matched the current documentation but not the released binaries. LadybugDB 0.19.1 uses `~/.lbdb` and stores extensions below `~/.lbdb/extension/<extension-version>/<platform>/`; Kuzu 0.11.3 uses the analogous singular, versioned `~/.kuzu/extension/...` tree. Corrected the name map and extension paragraph.
4. Extensions were described as coupled to each engine release. LadybugDB 0.19.1 intentionally uses extension ABI/version 0.19.0, so patch releases do not necessarily require distinct extension artifacts. Changed the claim to refer to the engine's extension ABI/version and OS/CPU platform, and retained `INSTALL` as the safe selection mechanism.
5. The migration flow did not protect extension-backed indexes. `EXPORT DATABASE` omits an index if its dependent extension is not loaded, and a Kuzu 0.11.3 export can contain bare index-creation calls without LadybugDB installation/loading commands. Added instructions to load index-owning extensions before export, verify the generated index definitions, and install/load the corresponding LadybugDB extensions in the import session before importing.

## Review Notes

- The Kuzu 0.11.3 and LadybugDB 0.19.1 macOS ARM64 CLI release binaries were exercised directly. The schema, data, relationship, macro, `CHECKPOINT`, Parquet export, and cross-engine import examples worked as described.
- Renaming a Kuzu 0.11.3 database file to `.lbdb` and opening it with LadybugDB 0.19.1 was rejected as an invalid LadybugDB file, supporting the post's warning against suffix-only migration.
- An FTS-backed Kuzu export failed during LadybugDB import when FTS was not loaded and succeeded from a fresh target after `INSTALL fts; LOAD fts;`, confirming both the prerequisite and the documented non-atomic failure risk.
- The Python examples were run with `kuzu==0.11.3` and `ladybug==0.19.1`. The Node.js async and sync APIs were run with `@ladybugdb/core@0.19.1`.
- LadybugDB's explicit Python `prepare()` methods still exist but emit `DeprecationWarning`; parameterized `execute()` is preferred. The post correctly tells readers to audit prepared-statement usage rather than promising identical signatures.
- LadybugDB's installation page still contains some hard-coded 0.11.0 examples, but the official v0.19.1 GitHub release, PyPI, npm, Maven Central, and crates.io entries confirm the post's 0.19.1 release claim as of August 12, 2026.
- All external links in the post resolved to the described first-party repositories or documentation during review.
