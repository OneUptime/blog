# Validation Summary: How to Set Up Automated Backup Scripts for MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongodump, mongorestore)
- Bash shell scripting
- Cron scheduling
- AWS CLI (S3 uploads)
- Slack webhooks

## Sources Consulted
- MongoDB Database Tools documentation for mongodump: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB Database Tools documentation for mongorestore: https://www.mongodb.com/docs/database-tools/mongorestore/
- GNU find manual for -mtime usage: https://www.gnu.org/software/findutils/manual/html_mono/find.html
- Bash reference manual for pipefail and set -e behavior: https://www.gnu.org/software/bash/manual/bash.html#The-Set-Builtin
- Crontab syntax reference: https://man7.org/linux/man-pages/man5/crontab.5.html

## Issues Found

1. **Backup verification script: `$?` captures wrong exit status.** The original script piped `mongorestore ... | tail -5` and then checked `$?`. In Bash, `$?` returns the exit status of the last command in a pipeline (`tail`), not `mongorestore`. Since `tail` almost always succeeds, the verification would always report PASSED even if `mongorestore` failed. **Fix:** Added `set -o pipefail` to the script so the pipeline's exit status reflects `mongorestore`'s failure.

2. **Alert notification script: `set -e` prevents alerts from being sent.** The script used `set -e` (exit on error), which causes the script to terminate immediately if `mongodump` fails. This means `STATUS=$?` and the Slack notification code are never reached on failure — exactly when the alert is needed. **Fix:** Removed `set -e` so the script continues after a `mongodump` failure and the exit status is properly captured in `STATUS`.

## Review Notes
- The `--oplog` flag used with `--archive` in the replica set script is supported in MongoDB Database Tools 3.2+. This is fine for current versions but worth noting for anyone on very old tooling.
- The basic backup script stores the MongoDB password in plaintext. In production, credentials should be managed via a MongoDB connection string URI with secrets from a vault, environment variables, or a mongodump config file with restricted permissions. This is acceptable for a tutorial but readers should be cautioned.
- The `--readPreference secondary` flag in the replica set script is correct and a good practice to avoid loading the primary during backups.
- All mongodump/mongorestore flags (`--gzip`, `--archive`, `--dryRun`, `--authenticationDatabase`, `--host` with replica set format) are current and correctly used.
