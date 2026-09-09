# Validation Summary: Save Kuzu CLI Results as Machine-Readable Files

## Status
validated

## Post Type
Guide / technical tutorial

## Technologies Covered
- Kuzu 0.11.3 CLI and database engine
- Cypher queries and COPY TO
- JSON, NDJSON (JSON Lines), CSV, and Parquet
- Bash-compatible shell redirection
- Python JSON validation and filesystem publication

## Sources Consulted
- Kuzu CLI reference: https://kuzudb.github.io/docs/client-apis/cli/
- Kuzu 0.11.3 CLI flags, startup processing, banner, and exit handling: https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/shell/shell_runner.cpp
- Kuzu 0.11.3 error reporting, CSV escaping, and result rendering: https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/shell/embedded_shell.cpp
- Kuzu 0.11.3 JSON result serialization: https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/shell/printer/json_printer.cpp
- Kuzu 0.11.3 JSON array and JSON Lines delimiters: https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/shell/include/printer/json_printer.h
- Kuzu 0.11.3 output modes and table-mode classification: https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/shell/include/printer/printer.h
- Kuzu export overview: https://kuzudb.github.io/docs/export/
- Kuzu CSV export syntax and options: https://kuzudb.github.io/docs/export/csv/
- Kuzu JSON export: https://kuzudb.github.io/docs/export/json/
- Kuzu Parquet export and type limitations: https://kuzudb.github.io/docs/export/parquet/
- Kuzu JSON extension: https://kuzudb.github.io/docs/extensions/json/
- Kuzu version-specific extension installation and loading: https://kuzudb.github.io/docs/extensions/
- Kuzu 0.11.3 static extension configuration: https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/extension_config.cmake
- Python JSON decoding and command-line validation: https://docs.python.org/3/library/json.html
- Python assert semantics: https://docs.python.org/3/reference/simple_stmts.html#the-assert-statement
- Python rename semantics: https://docs.python.org/3/library/os.html#os.rename

## Issues Found
1. Error handling implied that query errors could be inspected in the stderr log and that a later successful query could evade complete-file JSON parsing. In 0.11.3, printErrorMessage uses stdout, while the normal shell loop can still exit successfully. Updated the paragraph to identify the actual streams, require parsing the entire unfiltered output, and distinguish syntax validation from expected-content checks.
2. The NDJSON schema check used assert and only compared set(record). Assertions disappear under Python optimization, and an array containing "id" and "name" could pass the original check. Replaced it with an explicit dictionary/type and key check that raises ValueError.
3. The JSON extension wording did not explain that it is already loaded in the targeted official release. Clarified that 0.11.3 bundles and pre-loads it and requires no manual INSTALL or LOAD, as documented in the version-specific extension notice.

## Review Notes
- Reviewed against the explicitly targeted 0.11.3 tag, using source where the general CLI documentation omits flags or implementation details. The documented -r, -d 256, -m json/jsonlines/csv, -s, and -b options match this version; -d sets the buffer pool size in MiB.
- Confirmed working-directory .kuzurc handling, explicit -i replacement, and the unconditional processing message for an opened startup file. The -s option suppresses the normal opening banner as well as query statistics.
- JSON mode wraps each result in its own array; JSON Lines emits separate objects. JSON rendering traverses the full result and constructs an output string, so the post correctly avoids promising constant-memory query streaming. Human-oriented table truncation does not apply to these JSON modes.
- The MATCH/RETURN/ORDER BY example and COPY subquery with HEADER=true match the documented query/export syntax. The Person declaration is a description of an existing schema, not an executable CREATE NODE TABLE statement.
- CSV rendering quotes special fields, but null/empty-string and nested-type round trips need a defined consumer contract. Parquet retains column typing subject to supported type mappings; it is not a universal lossless representation of every Kuzu type.
- Empty JSON results remain an array; empty NDJSON can contain no records. Expected counts and stderr checks remain necessary, as stated in the post.
- Atomic visibility on a single filesystem does not itself guarantee crash durability. The post makes the narrower visibility claim correctly.
- All four documentation/source links in the post resolved to the intended resources. General JSON documentation contains older installation guidance; the extensions overview explicitly supersedes it for 0.11.3.
- Validation was based on official documentation and version-pinned source inspection, plus local Python snippet checks. The Kuzu CLI commands were not executed against a live database in this review.
