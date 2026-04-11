# Validation Summary: How to Set Up Redis Automated Backup to S3

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (RDB persistence, BGSAVE, INFO persistence)
- AWS CLI (S3, STS)
- AWS S3 (bucket creation, versioning, public access block, storage classes)
- Bash scripting (cron, gzip, awk)
- systemd (systemctl for Redis service management)

## Sources Consulted
- Redis official documentation on persistence: https://redis.io/docs/latest/operate/oss_and_bsp/management/persistence/
- Redis CLI commands (BGSAVE, LASTSAVE, INFO): https://redis.io/docs/latest/commands/bgsave/
- AWS CLI S3 reference: https://docs.aws.amazon.com/cli/latest/reference/s3/
- AWS CLI S3API reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/
- AWS S3 storage classes: https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html
- GNU coreutils date manual (for `date -d` flag): https://www.gnu.org/software/coreutils/manual/html_node/date-invocation.html
- crontab(5) man page for cron schedule syntax

## Issues Found
1. **Restore script `sudo` redirect bug (line 233)**: The command `sudo gunzip -c "/tmp/$BACKUP_FILE" > "$REDIS_DATA_DIR/dump.rdb"` is incorrect because the shell `>` redirect executes as the current user, not as root. Since `/var/lib/redis/` is typically owned by `redis:redis` with restricted permissions, the redirect would fail with "Permission denied" for a regular user. Fixed by replacing with `gunzip -c "/tmp/$BACKUP_FILE" | sudo tee "$REDIS_DATA_DIR/dump.rdb" > /dev/null`, which correctly writes the file with elevated privileges.

## Review Notes
- The `date -d` flag used in the retention cleanup section is GNU-specific and will not work on macOS/BSD. This is consistent with the post's target environment (Debian/Ubuntu, as indicated by the use of `apt`), but readers running macOS locally should be aware.
- The cron configuration shows both a daily backup (2 AM) and a weekly Sunday backup (3 AM) running the same script. On Sundays, two backups will be created one hour apart, which is redundant but not harmful.
- Placing `REDIS_PASSWORD` directly in the crontab is a security concern since crontabs can be read by the user and root. The post's summary correctly advises using environment variables or AWS Secrets Manager instead, but the cron example itself still contains the plaintext password.
- The `awscli` package from `apt` typically installs AWS CLI v1. AWS recommends v2 for new installations. Both versions support the commands used in this post, so this is not an error.
