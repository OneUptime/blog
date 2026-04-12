# Validation Summary: How to Schedule MongoDB Backups with Cron

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongodump, mongorestore)
- Cron (Linux job scheduling)
- Bash shell scripting
- AWS CLI (S3 uploads)
- OneUptime (heartbeat monitoring)

## Sources Consulted
- MongoDB Database Tools documentation for mongodump: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB Database Tools documentation for mongorestore: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB built-in roles reference (backup role): https://www.mongodb.com/docs/manual/reference/built-in-roles/
- Linux crontab(5) man page for cron expression syntax
- AWS CLI S3 cp reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html

## Issues Found
No technical issues found.

## Review Notes
- The backup script stores the MongoDB password in plaintext. In production, consider using environment variables, a secrets manager, or a MongoDB configuration file with restricted permissions.
- The `mongorestore --dryRun` verification step does not include `--authenticationDatabase`, which is fine if the local instance doesn't require auth for reads, but may need adjustment in authenticated environments.
- The cron expression `0 8-18 * * 1-5` runs 11 times per day (hours 8 through 18 inclusive), which is correct as described.
