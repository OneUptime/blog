# Validation Summary: How to Restore a MongoDB Backup to a Different Database

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- mongorestore (MongoDB Database Tools)
- mongodump (MongoDB Database Tools)
- mongosh (MongoDB Shell)

## Sources Consulted
- mongorestore official documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- mongorestore examples: https://www.mongodb.com/docs/database-tools/mongorestore/mongorestore-examples/
- mongorestore behavior, access, and usage: https://www.mongodb.com/docs/database-tools/mongorestore/mongorestore-behavior-access-usage/
- MongoDB 4.2 compatibility changes: https://www.mongodb.com/docs/manual/release-notes/4.2-compatibility/
- mongo-tools source (options.go): https://github.com/mongodb/mongo-tools/blob/master/mongorestore/options.go

## Issues Found
- **`--db` deprecation not mentioned**: The post used `--db` to restore to a different database name from a directory without noting that this flag is deprecated as of MongoDB Database Tools 4.2 when restoring from a directory or archive. Updated the note to mention the deprecation and recommend `--nsFrom`/`--nsTo` instead.

## Review Notes
- The section title "Dropping the Target Database First" is slightly misleading since `--drop` drops each collection individually, not the entire target database. The body text correctly explains the behavior, so no change was made.
- All `--nsFrom`/`--nsTo` wildcard patterns use the correct `*` syntax.
- The combination of `--nsInclude` with `--nsFrom`/`--nsTo` is valid; `--nsInclude` correctly filters by source namespace.
- The `--archive` + `--gzip` + namespace remapping combination is valid.
- Authentication flags (`--host`, `--username`, `--password`, `--authenticationDatabase`) are all correct.
- The `countDocuments()` method used in the verification section is correct for mongosh.
