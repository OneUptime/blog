# Validation Summary: How to Use mongostat for Real-Time MongoDB Statistics

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB
- mongostat (MongoDB Database Tools)
- WiredTiger storage engine
- Python (for JSON output parsing example)

## Sources Consulted
- MongoDB official documentation for mongostat: https://www.mongodb.com/docs/database-tools/mongostat/
- MongoDB Database Tools download page: https://www.mongodb.com/try/download/database-tools
- WiredTiger cache eviction documentation: https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-storage.wiredTiger.engineConfig.cacheSizeGB

## Issues Found

1. **Incorrect `command` column format description**: The post described the `command` column as showing `executed|failed`, but mongostat actually displays `local|replicated` — the count of local operations vs replicated operations. Fixed to `local|replicated`.

2. **Incorrect `--discover` output format**: The post claimed `--discover` output shows "a column per host" with a side-by-side columnar layout. In reality, `--discover` produces one row per host per interval, with additional `host`, `set`, and `repl` columns identifying each replica set member and its role (PRI, SEC, etc.). Fixed the description and example output.

3. **Shell quoting bug in Python example**: The Python code was wrapped in double quotes for `python3 -c "..."`, but dictionary access expressions like `metrics["query"]` also used double quotes. The shell would interpret the inner `"` as the end of the `-c` argument, causing a parse error. Fixed by switching to single-quoted shell string and using `.format()` instead of f-strings for compatibility.

## Review Notes
- The awk example for filtering dirty cache (`mongostat 1 | awk 'NR==1 || $7+0 > 20 {print}'`) assumes `dirty` is the 7th column, which matches the default output format. If columns change between mongostat versions, the column index would need adjustment.
- The 20% dirty cache threshold mentioned is reasonable guidance but not an official MongoDB threshold; it aligns with WiredTiger's aggressive eviction trigger point.
- The `--columns` flag is used in the post; this is the long form of `-o` in mongostat. Both are valid.
