# Validation Summary: How to Parameterize Kuzu Cypher Safely Without Replanning Every Query

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered

- Kuzu 0.11.3
- Cypher and named query parameters
- Kuzu Python client API
- Kuzu C++ client API and prepared statements
- Kuzu vector extension and `QUERY_VECTOR_INDEX`
- Kuzu `COPY FROM` bulk import
- Query compilation and execution timing

## Sources Consulted

- [Kuzu 0.11.3 release notes](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu prepared-statements guide](https://kuzudb.github.io/docs/get-started/prepared-statements/)
- [Kuzu Python client documentation](https://kuzudb.github.io/docs/client-apis/python/)
- [Kuzu Python API reference](https://kuzudb.github.io/api-docs/python/kuzu.html)
- [Kuzu 0.11.3 Python `Connection` implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/python_api/src_py/connection.py)
- [Kuzu 0.11.3 client-context prepare and execute implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/main/client_context.cpp)
- [Kuzu 0.11.3 C++ `Connection` API](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/include/main/connection.h)
- [Kuzu 0.11.3 parameter-expression binding](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/binder/expression_binder.cpp)
- [Kuzu 0.11.3 Python value conversion](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/python_api/src_cpp/py_connection.cpp)
- [Kuzu 0.11.3 table-function optional-parameter binding](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/binder/bind/bind_table_function.cpp)
- [Kuzu 0.11.3 vector-index query implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/vector/src/function/query_hnsw_index.cpp)
- [Kuzu vector extension documentation](https://kuzudb.github.io/docs/extensions/vector/)
- [Kuzu parameterized `LIMIT` documentation](https://kuzudb.github.io/docs/cypher/query-clauses/limit/)
- [Kuzu `MERGE` documentation](https://kuzudb.github.io/docs/import/merge/)
- [Kuzu DataFrame import documentation](https://kuzudb.github.io/docs/import/copy-from-dataframe/)
- [Kuzu CSV bulk-import documentation](https://kuzudb.github.io/docs/import/csv/)
- [Kuzu 0.11.3 Python `QueryResult` timing implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/python_api/src_py/query_result.py)
- [Kuzu 0.11.3 CLI timing output](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/shell/embedded_shell.cpp)
- [Kuzu prepared-statement cache implementation discussion](https://github.com/kuzudb/kuzu/pull/5846)
- [Ladybug maintained prepared-statements guide](https://docs.ladybugdb.com/get-started/prepared-statements/)

## Issues Found

- The original title implied that prepared statements avoid replanning. Kuzu 0.11.3 caches the parsed statement, but every successful parameterized execution calls the binder, planner, and optimizer again. Changed the title to “How to Parameterize Kuzu Cypher Safely Without Assuming Plan Reuse” and corrected the introduction, C++ discussion, benchmark guidance, and conclusion to distinguish parsing reuse from logical-plan reuse.
- The Python discussion implied that keeping a constant query string could provide prepared-object reuse. In 0.11.3, each `execute(query_string, nonempty_parameters)` call creates a fresh prepared object. Added that caveat while retaining the supported, non-deprecated Python usage.
- The post said the binder validates that all parameters are present. In 0.11.3, omitted parameters are not universally rejected and can bind as `NULL`. More seriously, an omitted key on an explicitly reused prepared statement can retain its previously bound value. Replaced the claim with the actual behavior and added requirements to validate keys in application code and always pass a complete map when explicitly reusing a prepared statement.
- The vector example used `efs := $efs`. In 0.11.3, named table-function options enter `QUERY_VECTOR_INDEX` configuration only when they are literals, so that parameter was silently ignored and the default remained in effect. Changed the example to `efs := 400`, removed `efs` from the parameter dictionary, and documented allowlisted static templates for selectable `efs` values.
- The Python integer guidance claimed that a Python `int` has an `INT64` shape. Kuzu 0.11.3 instead infers the narrowest fitting signed or unsigned integer type. Updated the guidance to require values compatible with the schema rather than assuming `INT64`.
- The Python conversion guidance treated every dictionary as a `MAP`. For query parameters, an ordinary dictionary becomes a `STRUCT`; a Kuzu `MAP` uses the binding's special `{"key": [...], "value": [...]}` representation. Corrected the explanation.
- The C++ example told readers to check execution success but checked only preparation. Added an `isSuccess()` check for the returned `QueryResult`.
- The prepared-statement ownership wording referred only to “unrelated” connections. Cached state belongs to the exact connection's client context, so the post now says not to execute the object through any other connection, including another connection to the same database.
- The CLI timing statement implied that timing is always printed. Clarified that the CLI's default statistics output prints compiling and executing time; users can disable that output.

## Review Notes

The basic Python parameter examples, parameterized `LIMIT`, `MERGE` syntax and primary-key warning, structural-token restrictions, variadic C++ `execute()` call, DataFrame `COPY FROM` example, bulk-loading recommendation, timing APIs, and query-timeout advice were verified. The key behaviors were also reproduced with the official `kuzu==0.11.3` Python package, including parameterized reads and writes, vector search, missing and extra keys, deprecated explicit preparation, and retained values after omitted keys on a reused prepared statement.

Kuzu 0.11.3 and its documentation repository are archived and frozen; Ladybug is the maintained successor. The post intentionally pins 0.11.3, so it remains useful as version-specific guidance, but readers adopting the maintained successor should re-check its current APIs and execution behavior. All external links already present in the post returned HTTP 200 on the validation date.
