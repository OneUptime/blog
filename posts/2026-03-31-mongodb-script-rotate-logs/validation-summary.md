# Validation Summary: How to Write a Script to Rotate MongoDB Logs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (server log rotation via `logRotate` admin command)
- Bash/Shell scripting
- Python 3 with PyMongo
- Linux `logrotate` utility
- Cron scheduling
- gzip compression

## Sources Consulted
- MongoDB `logRotate` command reference: https://www.mongodb.com/docs/manual/reference/command/logRotate/
- MongoDB Rotate Log Files tutorial: https://www.mongodb.com/docs/manual/tutorial/rotate-log-files/
- PyMongo `Database.command` documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/database.html
- Linux `logrotate(8)` man page

## Issues Found

1. **Incorrect description of `logRotate` default behavior**: The post stated "the old log remains in place with the same filename" and "You must rename the old file before or after rotation." This is wrong for the default `rename` mode. MongoDB automatically renames the old log file by appending a UTC timestamp (e.g., `mongod.log.2026-04-12T00-00-00`) and creates a new file at the original path. Fixed the description to accurately explain both `rename` (default) and `reopen` modes.

2. **Unused `subprocess` import in Python script**: The Python code imported `subprocess` but never used it. Removed the unused import.

3. **Misleading section title "Configuring systemd logrotate Integration"**: `logrotate` is not a systemd component; it is a standalone utility (historically run via cron, though modern systems may use a systemd timer). Changed to "Configuring logrotate Integration".

4. **Missing `reopen` mode prerequisite for logrotate config**: The `logrotate.d` config uses a `postrotate` script to send `logRotate` to MongoDB, but did not mention that this approach requires `systemLog.logRotate: reopen` in `mongod.conf`. Without this setting, both logrotate and MongoDB (in default `rename` mode) would attempt to rename the file, causing conflicts. Added a note about this requirement.

## Review Notes
- The Python script uses `datetime.utcnow()` and `datetime.fromtimestamp()` without timezone info, which are deprecated since Python 3.12 in favor of `datetime.now(datetime.UTC)` and `datetime.fromtimestamp(ts, tz=datetime.UTC)`. These still work but will emit deprecation warnings on Python 3.12+.
- The shell script's copy-before-rotate approach is valid but will leave behind MongoDB's auto-renamed log copy (in default `rename` mode) in the log directory. These auto-renamed copies are not cleaned up by the script. Users may want to add cleanup for `mongod.log.*` files in the log directory, or switch MongoDB to `reopen` mode.
- The compression ratio claim of "5-10% of original size" for MongoDB logs is reasonable for structured JSON logs with repetitive fields, though actual ratios vary with log content.
