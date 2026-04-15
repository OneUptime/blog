# Validation Summary: How to Create UDFs with Shell Scripts in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (executable UDFs)
- Bash / Shell scripting
- Python 3 (used within a shell UDF for URL encoding)
- awk (used for text field extraction)
- geoiplookup CLI tool (example of calling external tools)

## Sources Consulted
- ClickHouse official documentation — User Defined Functions (UDFs): https://clickhouse.com/docs/sql-reference/functions/udf
- ClickHouse official documentation — system.functions table: https://clickhouse.com/docs/operations/system-tables/functions
- ClickHouse official documentation — URL functions: https://clickhouse.com/docs/sql-reference/functions/url-functions
- ClickHouse official documentation — Configuration files: https://clickhouse.com/docs/operations/configuration-files

## Issues Found

1. **Shell injection vulnerability in urlencode.sh**: The original script interpolated `$line` directly into a Python command string (`python3 -c "...print(urllib.parse.quote('$line', safe=''))"`). If the input contained single quotes or shell metacharacters, the Python command would break or allow arbitrary code execution. Fixed by piping the input via `printf '%s' "$line"` to Python's stdin and reading it with `sys.stdin.read()`.

2. **Full path in `<command>` tag**: The XML config used `<command>/var/lib/clickhouse/user_scripts/urlencode.sh</command>` with a full absolute path. ClickHouse resolves script names relative to the `user_scripts_path` directory (default `/var/lib/clickhouse/user_scripts/`), so the `<command>` tag should contain just the script name. Changed to `<command>urlencode.sh</command>`.

3. **Obsolete `origin` column in system.functions query**: The verification query used `SELECT name, origin FROM system.functions`, but the `origin` column is marked as obsolete in current ClickHouse versions. Changed to `SELECT name, is_aggregate FROM system.functions` which uses a current, non-deprecated column and provides useful information about the registered function.

## Review Notes
- ClickHouse has built-in URL encoding functions (`encodeURLComponent`, `encodeURLFormComponent`) that would be faster than a shell UDF for URL encoding. The post uses URL encoding as a teaching example, which is fine, but readers should be aware of the built-in alternatives.
- The `executable_pool` type mentioned in the performance section is a valid and recommended optimization for production use of shell UDFs.
- The urlencode.sh script calls Python from within Bash, which somewhat defeats the purpose of a "shell script" UDF. It works as an example, but a pure-Bash URL encoding approach or using Python UDFs directly would be more idiomatic.
- The awk-based domain extraction example (`awk -F'/' '{print $3}'`) works for simple URLs like `http://example.com/path` but will not handle edge cases like protocol-relative URLs or URLs without a path component.
