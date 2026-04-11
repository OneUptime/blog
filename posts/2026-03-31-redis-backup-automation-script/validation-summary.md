# Validation Summary: How to Write a Redis Backup Automation Script

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (BGSAVE, LASTSAVE, INFO persistence, DBSIZE, SHUTDOWN commands)
- Bash scripting (set -euo pipefail, functions, loops)
- AWS CLI (s3 cp, s3api put-bucket-lifecycle-configuration)
- Amazon S3 (storage classes, lifecycle policies)
- cron scheduling
- gzip compression

## Sources Consulted
- Redis BGSAVE documentation: https://redis.io/docs/latest/commands/bgsave/
- Redis LASTSAVE documentation: https://redis.io/docs/latest/commands/lastsave/
- Redis INFO documentation: https://redis.io/docs/latest/commands/info/
- Redis DBSIZE documentation: https://redis.io/docs/latest/commands/dbsize/
- Redis SHUTDOWN documentation: https://redis.io/docs/latest/commands/shutdown/
- redis-cli --no-auth-warning flag (added in Redis 6.0): https://redis.io/docs/latest/develop/tools/cli/
- redis-server configuration options: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- AWS CLI s3 cp documentation: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS S3 storage classes (STANDARD_IA): https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html
- AWS S3 lifecycle configuration: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html

## Issues Found

1. **Description claimed "RDB and AOF backups" — script only handles RDB.** The description metadata stated "Automate Redis RDB and AOF backups" but the script only copies `dump.rdb`. No AOF file (`appendonly.aof` or appendonly directory) is backed up. Fixed the description to say "RDB backups" only.

2. **Description claimed "sends alerts on failure" — no alerting implemented.** The script has no alerting mechanism (no email, no Slack webhook, no SNS notification). Removed this claim from the description.

3. **Dead code in BGSAVE wait loop.** Two variables (`STATUS` and `CURRENT_SAVE`) were both assigned the output of `LASTSAVE` but never referenced anywhere in the script. This caused two unnecessary `redis-cli` calls per loop iteration. Removed the dead assignments.

## Review Notes
- The BGSAVE wait loop has no failure handling: if `rdb_bgsave_in_progress` never becomes `0` within 60 iterations (120 seconds), the script silently falls through and copies the RDB file anyway (potentially mid-write or stale). A production script should exit with an error in this case.
- The cron example exposes `REDIS_PASSWORD=secret` in plaintext in the crontab. A production setup should use a credentials file or environment variable sourced from a secure location.
- The `$COMPRESSED` variable on the `du -sh` line is unquoted, which could break if paths contain spaces. The default paths shown won't trigger this, but it's fragile.
- The `DBSIZE` output from `redis-cli` includes a prefix like `(integer) 42`, so the echo in verify-backup.sh would print "Restored backup contains (integer) 42 keys" rather than just the number.
