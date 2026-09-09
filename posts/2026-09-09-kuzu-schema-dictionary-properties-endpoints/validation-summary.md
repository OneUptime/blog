# Validation Summary: Extract a Kuzu Schema Dictionary with Properties and Endpoints

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kuzu 0.11.3 and its catalog functions
- Cypher schema definitions and read-only transactions
- Python, pip, and the Kuzu Python binding
- Graph schema metadata and JSON serialization

## Sources Consulted
- Kuzu 0.11.3 endpoint catalog implementation: https://github.com/kuzudb/kuzu/blob/v0.11.3/src/function/table/show_connection.cpp
- Kuzu 0.11.3 property catalog implementation: https://github.com/kuzudb/kuzu/blob/v0.11.3/src/function/table/table_info.cpp
- Kuzu 0.11.3 table catalog implementation: https://github.com/kuzudb/kuzu/blob/v0.11.3/src/function/table/show_tables.cpp
- Official Python API documentation: https://kuzudb.github.io/docs/client-apis/python/
- Official transaction documentation: https://kuzudb.github.io/docs/cypher/transaction/
- Upstream repository archive notice: https://github.com/kuzudb/kuzu
- Installed kuzu==0.11.3 Python package: inspected public Database, Connection, and QueryResult signatures and executed the tutorial against this binding.

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The post explicitly targets the archived 0.11.3 release; its version pin is appropriate. GitHub reports that the upstream repository was archived on October 10, 2025.
- Successfully installed the exact binding in an isolated virtual environment and ran the complete Python example on Python 3.13.1 / macOS ARM64. JSON serialization and both assertions passed.
- Confirmed the singular show_connection name, its four endpoint columns, and its iteration over all allowed node-table pairs. Confirmed show_tables metadata and the local(kuzu) filter against upstream source and runtime output.
- Confirmed that node property metadata includes primary key, while relationship property metadata includes storage_direction and omits the internal relationship ID. Property types and default expressions are returned as strings.
- Additional runtime checks passed for an empty database, STRING[] and INT64[][] properties, a relationship with two unused endpoint pairs, relationship defaults, and endpoint primary key names matching node metadata.
- Both table_info and show_connection rejected parameter arguments with a binder error requiring a literal. Table names containing apostrophes and backslashes worked with the supplied escaping helper.
- Verified public context-manager methods, result iteration and close methods, the in-memory database constructor, and the documented BEGIN TRANSACTION READ ONLY / COMMIT / ROLLBACK syntax.
- The linked documentation pages resolved. GitHub raw source was retrieved directly when the browsing service could not fetch a source URL.
- Scope caveats for future extensions: table_info splits names on dots as database qualification, so literal escaping alone does not support arbitrary local table names containing dots. Also, show_tables omits local tables when an attached database has been selected as the default. The supplied fresh local-database example does not encounter either condition. Attached-database export would need explicit handling, as the post advises.
