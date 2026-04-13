# Validation Summary: How to Use mongotop to Track Read/Write Activity in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Database Tools (`mongotop`, `mongostat`)
- MongoDB server (monitoring and performance)
- Python 3 (for JSON output parsing)
- Bash shell pipelines

## Sources Consulted
- Official MongoDB Database Tools documentation for mongotop: https://www.mongodb.com/docs/database-tools/mongotop/
- MongoDB Database Tools source code (mongo-tools GitHub repository) — specifically `mongotop/options.go` and `mongotop/command.go` for JSON output struct definitions
- MongoDB server documentation on the `top` command and lock changes in MongoDB 3.0+

## Issues Found

1. **`--locks` flag presented as a current feature without caveat**: The `--locks` flag only works with MongoDB 2.6 or earlier. On MongoDB 3.0+, the server no longer reports per-database lock timing data, so the flag returns an error. Added a note explaining this limitation.

2. **Incorrect comment for `--locks` in Common Usage Patterns**: The comment read "Lock to a specific number of results" which is nonsensical — `--locks` is about lock statistics, not limiting results. Removed the `--locks` entry from the Common Usage Patterns code block since it doesn't work with modern MongoDB.

3. **JSON output format was incorrect**: The blog showed `{"mydb.orders": {"read": "230ms", "write": "115ms", "total": "345ms"}}`. The actual `mongotop --json` output uses a `"totals"` wrapper key, nested objects for each metric (`{"time": <int>, "count": <int>}`), and numeric millisecond values — not strings with "ms" suffixes. Fixed the sample output to reflect the real format.

4. **Both Python parsing scripts used wrong JSON structure**: The first script iterated over `data.items()` and accessed `metrics.get('total', '0ms')` as a string. The second script did `metrics.get('total', '0ms').replace('ms', '')`. Both were updated to navigate the correct nested structure: `data.get('totals', {})` for the wrapper, and `metrics.get('total', {}).get('time', 0)` for numeric values.

5. **Incorrect oplog collection name**: `local.oplog` was used in the example output, but the actual MongoDB oplog collection is `local.oplog.rs`. Fixed to use the correct name.

## Review Notes
- The `--locks` section was kept with a deprecation note rather than removed, as the lock contention concepts it explains are still educationally valuable.
- The `--rowcount` flag, authentication flags (`--username`, `--password`, `--authenticationDatabase`), `--uri`, and `--host` flags were all verified as correct against official documentation.
- The comparison with `mongostat` is accurate — `mongostat` shows server-wide operation counts while `mongotop` shows per-collection time distribution.
