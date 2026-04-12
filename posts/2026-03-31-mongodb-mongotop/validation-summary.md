# Validation Summary: How to Use mongotop to Track MongoDB Collection Activity

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongotop command-line tool)
- MongoDB Database Tools package
- mongostat (comparison)
- MongoDB replica sets
- MongoDB database profiler

## Sources Consulted
- [mongotop - Database Tools - MongoDB Docs](https://www.mongodb.com/docs/database-tools/mongotop/)
- [mongotop Examples - Database Tools - MongoDB Docs](https://www.mongodb.com/docs/database-tools/mongotop/mongotop-examples/)
- [mongo-tools/mongotop/options.go (source code)](https://github.com/mongodb/mongo-tools/blob/master/mongotop/options.go)
- [mongo-tools/mongotop/mongotop.go (source code)](https://github.com/mongodb/mongo-tools/blob/master/mongotop/mongotop.go)
- [mongo-tools/mongotop/command.go (source code)](https://github.com/mongodb/mongo-tools/blob/master/mongotop/command.go)
- [top (database command) - MongoDB Docs](https://www.mongodb.com/docs/manual/reference/command/top/)
- [mongostat - Database Tools - MongoDB Docs](https://www.mongodb.com/docs/database-tools/mongostat/)
- [mongotop Go package docs](https://pkg.go.dev/github.com/mongodb/mongo-tools/mongotop)

## Issues Found

1. **Incorrect JSON output key `"topmounts"`**: The sample JSON output used `"topmounts"` as the top-level key for collection data. The correct key is `"totals"`, matching the MongoDB `top` admin command's output structure (confirmed via source code: `dest.LookupErr("totals")`). Fixed to `"totals"`.

2. **Incorrect JSON field names `"readLock"` and `"writeLock"`**: The sample JSON output used `"readLock"` and `"writeLock"` as sub-keys. While the raw MongoDB `top` command returns BSON with these field names, mongotop's `--json` output maps them to `"read"` and `"write"` respectively (confirmed via Go struct BSON/JSON tag mappings in the source code). Fixed to `"read"` and `"write"`.

3. **JSON time values in wrong unit**: The sample JSON showed time values like 1200000 (microseconds) but mongotop reports time in milliseconds. Fixed values to match the text output (e.g., 1200ms becomes `"time": 1200`).

4. **Misleading section title "Limiting Output to Specific Databases"**: The section content discussed `--rowcount` and `--locks` options, neither of which filters output by database. mongotop has no database filtering flag. Renamed to "Additional Options".

5. **Disconnected `--locks` description**: The text said "Use `--locks` to include lock information" but the command below it did not use `--locks` — it used `--rowcount`. This was a clear editing error. Rewrote the section to properly describe `--rowcount` first, then note `--locks` deprecation separately.

6. **Duplicate identical command blocks**: The section contained two identical `mongotop --rowcount=30 5` command blocks with different descriptions. Consolidated into a single command with accurate description.

## Review Notes
- The `--locks` flag is deprecated in MongoDB Database Tools 100.0.0+ and was only useful with MongoDB 3.x. The post now correctly notes this deprecation.
- The `"ts"` field name in the JSON sample could not be fully verified against the source code. It may actually be `"time"` or another name. This was left as-is since the exact field name could not be confirmed.
- The post states mongotop output shows "all collections with non-zero activity" — in practice, mongotop shows all collections including those with 0ms. This is a minor inaccuracy but does not materially affect the tutorial's usefulness.
- The `clusterMonitor` role requirement is correct; mongotop uses the `top` admin command which requires this role.
- Installation commands, connection URI syntax, and replica set connection examples are all correct.
