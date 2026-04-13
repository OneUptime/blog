# Validation Summary: How to Use mongodump to Back Up a MongoDB Database

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- mongodump (MongoDB Database Tools)
- mongorestore (referenced)
- Bash scripting

## Sources Consulted
- MongoDB Database Tools documentation for mongodump: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB connection string URI format: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB Extended JSON (v2) specification: https://www.mongodb.com/docs/manual/reference/mongodb-extended-json/

## Issues Found

1. **Double gzip compression in piped archive example**: The command `mongodump --archive --gzip | gzip > file.gz` applied gzip compression twice — once via the `--gzip` flag (which compresses the archive stream) and again via the external `gzip` pipe. This would produce a double-compressed file that `mongorestore` could not read directly. Fixed by removing the external `| gzip` pipe and using shell redirection (`>`) instead.

2. **Missing `-mindepth 1` in backup cleanup script**: The `find` command used to delete old backups (`find "${BACKUP_DIR}" -maxdepth 1 -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} \;`) could match and delete the `BACKUP_DIR` parent directory itself if its modification time exceeded the retention period. Added `-mindepth 1` to ensure only subdirectories are considered for deletion.

## Review Notes
- All mongodump flags (`--out`, `--db`, `--collection`, `--archive`, `--gzip`, `--query`, `--queryFile`, `--excludeCollection`, `--uri`, `--host`, `--port`) are correct and current as of MongoDB Database Tools 100.x.
- The `--db` flag is noted as deprecated in some versions of the tools documentation in favor of specifying the database in the URI, but it remains functional and widely used.
- The Extended JSON v2 date format used in the query file example (`{"$date": "..."}`) is correct.
- The replica set URI format and `readPreference` options are accurate.
- The output directory structure description (`.bson` + `.metadata.json` files) is correct.
