# Validation Summary: How to Use mongotop to Track Collection-Level Activity in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (mongotop CLI tool)
- MongoDB Database Tools (mongotop, mongostat)
- Python 3 (for JSON output analysis script)
- MongoDB Shell (currentOp, explain, createIndex)

## Sources Consulted
- [mongotop - MongoDB Database Tools Documentation](https://www.mongodb.com/docs/database-tools/mongotop/)
- [mongotop v3.2 Reference](https://www.mongodb.com/docs/v3.2/reference/program/mongotop/)
- [TOOLS-1849: Remove the mongotop --locks option - MongoDB Jira](https://jira.mongodb.org/browse/TOOLS-1849)
- [mongodb/mongo-tools source code (command.go)](https://github.com/mongodb/mongo-tools/blob/master/mongotop/command.go) - verified JSON output struct definitions (TopDiff, NSTopInfo, TopField)
- [mongostat and mongotop - DeepWiki](https://deepwiki.com/mongodb/mongo-tools/3.3-mongostat-and-mongotop)

## Issues Found

### 1. `--locks` flag presented as functional (non-functional on MongoDB 3.0+)
- **What was wrong:** The post described the `--locks` flag as a working feature without noting that it only functions with MongoDB 2.6 and earlier. On MongoDB 3.0+, it fails with "server does not support reporting lock information."
- **What was changed:** Added a note explaining the version limitation and suggesting `db.serverStatus()` or the `top` admin command as alternatives for modern MongoDB. Updated the section heading text to clarify it applies to MongoDB 2.6 and earlier only.
- **Why:** Any reader using MongoDB 3.0+ (released 2015) would encounter an error when trying this flag. Per MongoDB Jira TOOLS-1849, this flag has no utility with non-EOL server versions.

### 2. Incorrect JSON output format for `mongotop --json`
- **What was wrong:** The sample JSON output showed a flat structure with string values: `{"mydb.orders":{"read":"230ms","write":"115ms","total":"345ms"},"ts":"..."}`.
- **What was changed:** Corrected to the actual format confirmed from the Go source code: `{"totals":{"mydb.orders":{"total":{"time":345,"count":1},"read":{"time":230,"count":1},"write":{"time":115,"count":1}}},"time":"..."}`. Key differences: (a) data is wrapped in a `"totals"` key, (b) each metric has nested `"time"` (integer ms) and `"count"` (integer) fields, (c) the timestamp key is `"time"` not `"ts"`.
- **Why:** The actual output structure uses `TopDiff` with nested `NSTopInfo` and `TopField` structs as defined in the mongo-tools source code. Integer millisecond values are used, not string representations.

### 3. Python analysis script incompatible with actual JSON format
- **What was wrong:** The script iterated over `data.items()` directly, skipping `"ts"`, and parsed string values like `"230ms"` using a `parse_ms()` helper. This did not match the actual nested JSON structure.
- **What was changed:** Updated to access `data.get('totals', {})` for the collection data and read integer values via `metrics.get('read', {}).get('time', 0)` instead of parsing strings. Removed the now-unnecessary `parse_ms()` function. Also fixed a minor formatting issue where a literal newline was used in an f-string instead of `\n`.
- **Why:** The script must match the actual `mongotop --json` output format to function correctly when piped from mongotop.

## Review Notes
- The basic `mongotop` commands (default interval, custom interval, `--uri`, `--rowcount`) are all correct.
- The output column descriptions (ns, total, read, write, timestamp) are accurate.
- The `currentOp` and `explain()` correlation workflow is correct and demonstrates a sound debugging methodology.
- The primary vs secondary monitoring comparison and the advice about combining `mongotop` with `mongostat` are accurate.
- The awk command for identifying hot collections is a reasonable approach, though the output parsing assumes a specific text format that may vary across mongotop versions.
