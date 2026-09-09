# Validation Summary: Diagnose Kuzu JSON Imports Across Connection Lifetimes

## Status
validated

## Post Type
Troubleshooting guide with an executable Python fixture and Cypher queries.

## Technologies Covered
- Kuzu 0.11.3 and its bundled JSON extension
- Python database, connection, and query-result lifecycle APIs
- Cypher JSON scans, COPY imports, node tables, and primary keys
- JSON arrays and newline-delimited JSON
- Embedded database persistence, ownership, transactions, and memory settings

## Sources Consulted
- JSON extension documentation: https://kuzudb.github.io/docs/extensions/json/
- JSON import documentation: https://kuzudb.github.io/docs/import/copy-from-json/
- Python API documentation: https://kuzudb.github.io/docs/client-apis/python/
- Connections and concurrency: https://kuzudb.github.io/docs/concurrency/
- Versioned JSON scanner implementation and format option parser: https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/json/src/functions/table_functions/json_scan.cpp
- Versioned Python Database implementation: https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/python_api/src_py/database.py
- Versioned Python Connection implementation: https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/python_api/src_py/connection.py
- Versioned Python QueryResult implementation: https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/python_api/src_py/query_result.py
- Versioned release and bundled-extension information: https://github.com/kuzudb/kuzu/blob/v0.11.3/README.md
- Repository archive status: https://github.com/kuzudb/kuzu

## Issues Found
- Replaced the vague instruction to use the corresponding documented format for newline-delimited input with the specific supported option, `format='auto'`. The 0.11.3 option parser accepts `array`, `unstructured`, and `auto`, but not an explicit `newline_delimited` value, even though a scanner error message suggests that value. Confirmed that automatic detection reads the newline-delimited fixture successfully. No code changes were necessary.

## Review Notes
- Installed Kuzu 0.11.3 in an isolated temporary Python 3.13 environment on macOS 26.6.2 ARM64. Executed the exact Python code extracted from the post: all three sequential connections scanned the expected rows and copied two records into each fresh table without assertion failures.
- Executed `CALL show_loaded_extensions() RETURN *;` successfully. JSON appeared as a statically linked extension, alongside ALGO, FTS, and VECTOR. Repeated explicit JSON loading succeeded.
- Supplementary checks confirmed that replaying a COPY into each existing table raises a duplicate-primary-key exception and that Batch0 still contains two rows after closing the first database owner and opening a new owner at the same disk path.
- Verified database constructor parameters, context manager support, query iteration, and explicit result closure against the versioned Python implementations. The nested cleanup order follows the Database.close requirement to close connections and results first.
- The versioned JSON scanner allocates scan and reconstruction buffers through the memory manager, supporting the memory-pressure explanation. No exhaustive memory/thread stress matrix was run; the fixture settings are appropriately described as diagnostic settings rather than production sizing advice.
- The repository is archived. The 0.11.3 README explicitly identifies JSON as preinstalled; older generic documentation still discusses extension installation, so versioned sources take precedence for this fixture.
- The referenced documentation and repository resources were accessible and relevant. Validation covers the pinned release and tested platform, not every historical release or operating system.
