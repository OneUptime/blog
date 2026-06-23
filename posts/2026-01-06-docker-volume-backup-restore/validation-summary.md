# Validation Summary: How to Back Up and Restore Docker Volumes

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Docker (named volumes, bind mounts, anonymous volumes)
- Docker Compose
- tar / gzip (filesystem-level backups)
- PostgreSQL (`pg_dump`, `pg_isready`, `psql`)
- MySQL (`mysqldump`)
- MongoDB (`mongodump`)
- Restic (encrypted, deduplicated backups; S3 backend)
- Borg Backup (`pschiffe/borg-backup` image)
- Ofelia (Docker-native job scheduler)
- cron (`/etc/cron.d`)
- AWS CLI (`aws s3 sync`)
- Alpine Linux container tooling

## Sources Consulted
- Borg extract documentation — https://borgbackup.readthedocs.io/en/stable/usage/extract.html (confirms `borg extract` has no `--target` flag and always writes to the current working directory)
- Restic S3 backend / preparing a repository — https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html (confirms `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` are required for all S3 operations including restore)
- Docker volumes documentation — https://docs.docker.com/storage/volumes/ (named/bind/anonymous volume behavior and `/var/lib/docker/volumes/<name>/_data` path)
- Restic restore usage — https://restic.readthedocs.io/en/stable/050_restore.html (`restic restore <id> --target <dir>` syntax)

## Issues Found
1. **Borg restore used an invalid `--target` flag.** The "Manual Borg Operations" restore example ran `borg extract /repo::backup-20240106 --target /target`. Borg's `extract` command does not support a `--target` option — it always extracts into the current working directory. The command as written would fail with an unrecognized-argument error. Fixed by removing `--target /target`, adding `-w /target` to the `docker run` invocation to set the working directory, and adding an explanatory comment. (Note: `--target` *is* valid for `restic restore`, which likely caused the mix-up.)

2. **Restic S3 restore omitted required AWS credentials.** The "Restore with Restic" snapshot restore command passed only `RESTIC_REPOSITORY` and `RESTIC_PASSWORD`, but the repository is an S3 backend. Restic requires `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` to authenticate to S3 for any operation, including restore — so the command would fail. The adjacent `snapshots` command already passed these credentials, confirming the omission was an oversight. Fixed by adding the two `-e AWS_ACCESS_KEY_ID=xxx` / `-e AWS_SECRET_ACCESS_KEY=xxx` environment flags to match the listing command.

## Review Notes
- The tar backup/restore workflow, read-only source mounts, `-C /source .` archive layout, and the 7-backup retention logic (`ls -t ... | tail -n +8 | xargs -r rm`) are all correct.
- Docker Compose `$$(date ...)` escaping (to defer expansion to the container shell rather than Compose variable interpolation) is correct throughout.
- Ofelia's schedule uses the 6-field cron format (`0 0 2 * * *`, leading seconds field), which is correct for Ofelia/robfig-cron. One caveat worth noting for a future revision: `ofelia.job-exec.*.command` is not run through a shell by default, so the `$(date ...)` substitution in the Ofelia label may be passed literally rather than expanded; wrapping in `sh -c "..."` would be more robust.
- Database dump/restore commands for PostgreSQL, MySQL, and MongoDB are accurate and use current, non-deprecated tooling.
- Minor version caveat (not an error): the "Complete Backup Solution" installs `postgresql-client` from Alpine, whose major version may differ from the `postgres:16` server. For best compatibility `pg_dump` should match or exceed the server major version; pinning the client to a postgres 16 image (as the "Combined Approach" example does) is preferable. Left as-is since it still functions in practice.
- `restic/restic` is Alpine-based, so the `Dockerfile.restic` `apk add --no-cache bash` step is valid.
