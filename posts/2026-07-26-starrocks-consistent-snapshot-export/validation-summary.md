# Validation Summary: Export a Consistent StarRocks Snapshot While Data Changes

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- StarRocks `EXPORT`
- StarRocks `SHOW EXPORT`, `LAST_QUERY_ID()`, and `SYNC`
- StarRocks `INSERT INTO FILES` and the `FILES()` table function
- CSV, Parquet, and JSON/NDJSON conversion
- AWS S3 and S3-compatible object storage
- Snapshot consistency, asynchronous publication, manifests, and validation

## Sources Consulted

- [StarRocks: Export data using EXPORT](https://docs.starrocks.io/docs/unloading/Export/)
- [StarRocks SQL reference: EXPORT](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/unloading/EXPORT/)
- [StarRocks SQL reference: SHOW EXPORT](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/unloading/SHOW_EXPORT/)
- [StarRocks SQL reference: last_query_id](https://docs.starrocks.io/docs/sql-reference/sql-functions/utility-functions/last_query_id/)
- [StarRocks: Unload data using INSERT INTO FILES](https://docs.starrocks.io/docs/unloading/unload_using_insert_into_files/)
- [StarRocks SQL reference: FILES](https://docs.starrocks.io/docs/sql-reference/sql-functions/table-functions/files/)
- [StarRocks SQL reference: INSERT](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/INSERT/)
- [StarRocks: Feature Support for Data Loading and Unloading](https://docs.starrocks.io/docs/loading/loading_introduction/feature-support-loading-and-unloading/)
- [StarRocks SQL reference: SYNC](https://docs.starrocks.io/docs/sql-reference/sql-statements/cluster-management/nodes_processes/SYNC/)
- [StarRocks SQL reference: to_json](https://docs.starrocks.io/docs/sql-reference/sql-functions/json-functions/json-query-and-processing-functions/to_json/)
- [StarRocks: Resource group](https://docs.starrocks.io/docs/administration/management/resource_management/resource_group/)
- [StarRocks release notes: 3.5](https://docs.starrocks.io/releasenotes/release-3.5/)
- [StarRocks release notes: 4.0](https://docs.starrocks.io/releasenotes/release-4.0/)
- [StarRocks release notes: 4.1](https://docs.starrocks.io/releasenotes/release-4.1/)
- [StarRocks official parser grammar](https://github.com/StarRocks/starrocks/blob/main/fe/fe-grammar/src/main/antlr/com/starrocks/grammar/StarRocks.g4)
- [StarRocks source: EXPORT statement properties](https://github.com/StarRocks/starrocks/blob/main/fe/fe-core/src/main/java/com/starrocks/sql/ast/ExportStmt.java)
- [StarRocks source: plain-text export writer](https://github.com/StarRocks/starrocks/blob/main/be/src/data_sink/file/plain_text_builder.cpp)
- [StarRocks source: native export coordinator context](https://github.com/StarRocks/starrocks/blob/main/fe/fe-core/src/main/java/com/starrocks/qe/DefaultCoordinator.java)
- [StarRocks source: export job specification and resource-group selection](https://github.com/StarRocks/starrocks/blob/main/fe/fe-core/src/main/java/com/starrocks/qe/scheduler/dag/JobSpec.java)
- [StarRocks change #66654: CSV header output](https://github.com/StarRocks/starrocks/pull/66654)
- [StarRocks change #71589: CSV enclosure and escaping during unload](https://github.com/StarRocks/starrocks/pull/71589)

## Issues Found

- The `SHOW EXPORT` example did not specify a database. `SHOW EXPORT` searches the current database when `FROM` is omitted, so a session whose current database is not `analytics` would not find the job submitted for `analytics.orders`. Changed the example to `SHOW EXPORT FROM analytics`.
- The `INSERT INTO FILES` example used ANSI-style `TIMESTAMP` typed literals. StarRocks' grammar accepts typed temporal literals with `DATE` or `DATETIME`, not `TIMESTAMP`. Changed both predicates to `DATETIME` literals.
- The example uses `target_max_file_size`, but the text only stated the broad v3.2 availability of `INSERT INTO FILES`. Added the property's actual minimum version, v3.2.7.
- The post said that `EXPORT` does not add headers and implied that `INSERT INTO FILES` header controls arrived with CSV output in v3.3. Header output was added in later point releases. Clarified that `EXPORT` omits headers by default and that `with_header` for `EXPORT` and `csv.include_header` for `INSERT INTO FILES` require v3.5.13+, v4.0.6+, or v4.1.0+.
- The post referred to `enclose`, `escape`, and `include_header` without their exact `FILES()` property names or patch-version gates. Changed them to `csv.enclose`, `csv.escape`, and `csv.include_header`, and documented that CSV enclosure and escaping require v3.5.17+, v4.0.10+, or v4.1.1+.
- The CSV warning suggested testing values containing delimiters or line breaks. Native `EXPORT` writes string fields without field enclosure or escaping, so such values make the delimited output ambiguous rather than merely parser-dependent. Changed the guidance to require collision-free delimiters or Parquet.
- The `to_json` description was broader than the function contract and described text rather than the returned JSON value. Clarified that `to_json` accepts `MAP` or `STRUCT`, returns a JSON value, and remains subject to CSV field encoding when unloaded through CSV.
- The post suggested scheduling native `EXPORT` through a resource group. StarRocks resource-group classifiers cover `SELECT` and `INSERT`, while native asynchronous `EXPORT` creates its own execution context rather than inheriting the submitting session's chosen group. Removed that recommendation and retained the documented low-traffic-window advice.

## Review Notes

- The current Latest-4.1 `EXPORT` reference and unloading feature matrix lag the tagged implementation for `with_header`, and the matrix does not show the point-release gates for `csv.include_header`, `csv.enclose`, or `csv.escape`. The corrected gates were verified against the official StarRocks source and release-line tags, in addition to the release notes.
- The central claims about tablet snapshots, asynchronous job states, temporary export paths, final rename, FE restart/election failure behavior, broker-free unloading from v2.5, supported unload formats, and the role of `SYNC` match the official documentation.
- No live StarRocks cluster was available in the repository, so SQL syntax and behavior were validated against the official documentation, parser grammar, tagged source, and release notes rather than by executing an export.
