# Validation Summary: Kuzu Was Archived: Should You Pin 0.11.3, Fork It, or Migrate?

## Status

validated

## Post Type

Technical migration and software-lifecycle guide

## Technologies Covered

- Kuzu 0.11.3
- LadybugDB 0.19.1
- Embedded graph databases and Cypher
- Kuzu and Ladybug Python bindings
- Kuzu Node.js and Java packages
- `CHECKPOINT`, `EXPORT DATABASE`, and `IMPORT DATABASE`
- Parquet-based logical migration artifacts
- Native database extensions and extension-backed indexes

## Sources Consulted

- [Archived Kuzu repository and lifecycle announcement](https://github.com/kuzudb/kuzu)
- [Kuzu 0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu 0.11.0 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.0)
- [Kuzu installation and package coordinates](https://kuzudb.github.io/docs/installation/)
- [Kuzu extension documentation and local extension-server guidance](https://kuzudb.github.io/docs/extensions/)
- [Kuzu database export and import documentation](https://kuzudb.github.io/docs/migrate/)
- [Kuzu transaction and checkpoint documentation](https://kuzudb.github.io/docs/cypher/transaction/)
- [Kuzu on-disk file documentation](https://kuzudb.github.io/docs/developer-guide/files/)
- [Kuzu 0.11.3 export implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/processor/operator/simple/export_db.cpp)
- [Kuzu 0.11.3 port-file constants](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/include/common/constants.h)
- [Kuzu MIT license](https://github.com/kuzudb/kuzu/blob/v0.11.3/LICENSE)
- [Kuzu 0.11.3 on PyPI](https://pypi.org/project/kuzu/0.11.3/)
- [Kuzu 0.11.3 npm registry metadata](https://registry.npmjs.org/kuzu/0.11.3)
- [Kuzu 0.11.3 on Maven Central](https://repo1.maven.org/maven2/com/kuzudb/kuzu/0.11.3/)
- [LadybugDB repository](https://github.com/LadybugDB/ladybug)
- [LadybugDB 0.19.1 release](https://github.com/LadybugDB/ladybug/releases/tag/v0.19.1)
- [LadybugDB 0.12.0 release and Kuzu 0.11.3 equivalence note](https://github.com/LadybugDB/ladybug/releases/tag/v0.12.0)
- [LadybugDB installation documentation](https://docs.ladybugdb.com/installation/)
- [LadybugDB getting-started examples](https://docs.ladybugdb.com/get-started/)
- [LadybugDB Python API](https://docs.ladybugdb.com/client-apis/python/)
- [LadybugDB Node.js API](https://docs.ladybugdb.com/client-apis/nodejs/)
- [LadybugDB CLI documentation](https://docs.ladybugdb.com/client-apis/cli/)
- [LadybugDB migration documentation](https://docs.ladybugdb.com/migrate/)
- [LadybugDB on-disk file documentation](https://docs.ladybugdb.com/developer-guide/files/)
- [LadybugDB extension documentation](https://docs.ladybugdb.com/extensions/)
- [LadybugDB Python backend selection implementation](https://github.com/LadybugDB/ladybug-python/blob/7cb1ea088ed1fe8b433b8cdb6793fc78b36f0999/src_py/_backend.py)

## Issues Found

1. The post called Kuzu 0.11.3 the repository's explicitly identified "final release." GitHub marks it as the latest release, and it is the last release actually published, but the announcement does not use the word "final." Changed the claim to "latest—and last published—release."
2. The post described 0.11.3 as the 0.11.2 "engine" plus four extensions. The official release wording says it bundles the 0.11.2 release and also lists minor static-extension changes. Changed the wording to match the release note without implying a byte-identical engine.
3. The local-server statement applied to every non-bundled or older extension. Kuzu's requirement applies to official extension artifacts; self-built extensions can be loaded by path. Qualified the statement as applying to official extensions and used the documented term "local extension server."
4. The post referred to "default file suffixes." Kuzu and Ladybug create a database at the supplied path; `.kuzu` and `.lbdb` are conventions rather than required or automatically appended suffixes. Changed this to "database paths and naming conventions."
5. The comparison snippet opened Kuzu and Ladybug through native Python bindings in one process. A runtime test with the official `kuzu==0.11.3` and `ladybug==0.19.1` wheels reproduced a native type-registration conflict. Split the examples and instructed readers to run the baselines in separate processes and environments.
6. The export-manifest claim followed stale documentation by listing `macro.cypher` and omitting `index.cypher`. Kuzu 0.11.3 source and an actual export show `schema.cypher` (which includes macro definitions), `copy.cypher`, `index.cypher`, and data files. Corrected the manifest accordingly.
7. The migration guidance did not account for extension-backed index import behavior in Ladybug 0.19.1. An FTS-index migration test failed until the Ladybug FTS extension was installed and loaded. Added the requirement to install and load corresponding Ladybug extensions before import; this also avoids relying on the current Ladybug migration page's inaccurate auto-load statement.

## Review Notes

- The Kuzu archive date, read-only status, MIT license, 0.11.3 release date, bundled `algo`/`fts`/`json`/`vector` extensions, and Kuzu package coordinates were verified.
- Ladybug's official successor wording, `v0.19.1` latest-release status as of August 12, 2026, Python distribution/import name, Node.js package, CLI name, and `.lbdb` example paths were verified.
- The `CHECKPOINT;` and `EXPORT DATABASE` statements were executed with the official Kuzu 0.11.3 CLI. A basic Kuzu 0.11.3 logical export was successfully imported into an empty Ladybug 0.19.1 database and its node and relationship values were queried successfully.
- The actual Kuzu 0.11.3 export manifest and macro placement were checked both against source and through a clean runtime export. Parquet was the default data format.
- Both products' documentation confirms that `IMPORT DATABASE` requires an empty database and that failed imports do not automatically roll back.
- Every external URL already present in the post returned HTTP 200 during this review.
