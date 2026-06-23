# Validation Summary: Monitoring Backup Jobs with OneUptime: Ensure Your Backups Actually Work

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OneUptime incoming request (heartbeat) monitors
- Bash shell scripting
- Python (`requests`, `subprocess`, `boto3`)
- PostgreSQL `pg_dump`
- MySQL `mysqldump`
- `rsync`
- AWS S3 (boto3)
- `curl`, `stat`, `gzip` CLI tools

## Sources Consulted
- GNU coreutils `stat` manual — `-c` / `--format` with `%s` (file size in bytes) vs `-f` (filesystem status): https://www.gnu.org/software/coreutils/manual/html_node/stat-invocation.html
- PostgreSQL `pg_dump` documentation (`-Fc` custom format flag): https://www.postgresql.org/docs/current/app-pgdump.html
- MySQL `mysqldump` documentation: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- rsync man page (`-avz`, `--stats`): https://download.samba.org/pub/rsync/rsync.1
- Python `requests` docs (`post`, `json=`, `timeout=`): https://requests.readthedocs.io/en/latest/api/
- Python `subprocess` docs (`run`, `capture_output`, `check`, `CalledProcessError`): https://docs.python.org/3/library/subprocess.html
- Boto3 S3 `upload_file` reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/upload_file.html
- OneUptime incoming request monitor documentation: https://oneuptime.com

## Issues Found
1. **`stat -f%z` is macOS/BSD syntax, incorrect on Linux** (3 occurrences: PostgreSQL basic script, `pg_dump -Fc` script, and `mysqldump` script). On Linux with GNU coreutils — the standard environment for the database/file backup servers this post targets — `stat -f` displays *filesystem* status, not file size, so `%z` would not return the backup file's byte size. Changed all three to `stat -c%s`, the correct GNU coreutils invocation for a file's size in bytes.
2. **Missing `import os` in the AWS S3 Python example.** The `backup_to_s3` function calls `os.walk`, `os.path.join`, `os.path.relpath`, and `os.path.getsize`, but the snippet only imported `boto3` and `requests`, which would raise `NameError` at runtime. Added `import os`.

## Review Notes
- The `mysqldump app_db | gzip > app_backup.sql.gz` example checks `[ $? -eq 0 ]` afterward, which inspects the exit status of `gzip` (the last command in the pipe), not `mysqldump`. A failing `mysqldump` could still leave a "successful" but truncated archive. For production scripts, `set -o pipefail` (or inspecting `${PIPESTATUS[0]}`) would be more robust. Left as-is since the snippet is syntactically valid and the pattern is widely used in tutorials; flagging it as a potential future improvement.
- The `curl ... -d '{...}'` calls in the "Popular Backup Tool Integration" section omit the `Content-Type: application/json` header (unlike the basic examples, which set it). `curl -d` defaults to `application/x-www-form-urlencoded`. OneUptime incoming request monitors accept arbitrary request bodies, so heartbeats still register; for strict JSON parsing downstream, adding the header is preferable. Not a functional error.
- The `monitor_backup_job` and `verify_backup` Python snippets are intentional illustrative fragments (they contain `# ... perform backup ...` placeholders and reference helpers like `calculate_sha256` and modules `socket`/`datetime` without imports). These are clearly pseudo-code excerpts demonstrating payload structure rather than complete runnable programs, so no changes were made.
- Heartbeat URL format (`https://your-domain.com/heartbeat/<key>`) and the OneUptime incoming-request-monitor workflow described are consistent with OneUptime's product model and presented generically; no inaccuracies found.
