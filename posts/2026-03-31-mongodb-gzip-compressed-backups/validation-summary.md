# Validation Summary: How to Use --gzip for Compressed Backups in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (`mongodump`, `mongorestore`)
- gzip compression via `--gzip` flag
- `--archive` flag for single-file backups
- `--numParallelCollections` for parallel dump/restore
- Bash scripting and cron scheduling

## Sources Consulted
- MongoDB official documentation for `mongodump`: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB official documentation for `mongorestore`: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB Database Tools reference for `--gzip`, `--archive`, and `--numParallelCollections` options

## Issues Found
No technical issues found.

## Review Notes
- The `--db` flag is deprecated in MongoDB Database Tools 100.0.0+ (shipped with MongoDB 4.4+). It still works but newer documentation recommends using `--uri` with a connection string or specifying the database in the connection URI. Since `--db` remains functional and is widely recognized, this is not an error but worth noting for a future update.
- The 70-80% compression ratio claim is reasonable for typical BSON data but actual results vary significantly depending on data content (e.g., binary data or already-compressed fields will see less benefit). The post correctly qualifies this with "typically."
- The `--numParallelCollections` default value is 4, which matches the value used in the example. The post could mention this is the default, but this is a stylistic observation, not an error.
