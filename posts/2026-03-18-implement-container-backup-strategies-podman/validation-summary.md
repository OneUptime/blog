# Validation Summary: How to Implement Container Backup Strategies with Podman

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Podman containers, volumes, images, pods, and Quadlet
- CRIU-based Podman checkpoint and restore
- PostgreSQL, MySQL, MongoDB, and Redis backup commands
- systemd user services and timers
- rsync and S3-compatible off-site backup with MinIO Client
- Bash scripting

## Sources Consulted
- Podman volume export documentation: https://docs.podman.io/en/latest/markdown/podman-volume-export.1.html
- Podman volume import documentation: https://docs.podman.io/en/latest/markdown/podman-volume-import.1.html
- Podman ps filter documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman save documentation: https://docs.podman.io/en/v5.6.0/markdown/podman-save.1.html
- Podman load documentation: https://docs.podman.io/en/latest/markdown/podman-load.1.html
- Podman checkpoint documentation: https://docs.podman.io/en/stable/markdown/podman-container-checkpoint.1.html
- Podman restore documentation: https://docs.podman.io/en/latest/markdown/podman-container-restore.1.html
- Podman Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- PostgreSQL pg_dump documentation: https://www.postgresql.org/docs/current/app-pgdump.html
- Redis BGSAVE documentation: https://redis.io/docs/latest/commands/bgsave/
- Redis LASTSAVE documentation: https://redis.io/docs/latest/commands/lastsave/
- MongoDB mongodump documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- systemd.service documentation: https://www.freedesktop.org/software/systemd/man/254/systemd.service.html
- systemd.timer documentation: https://www.freedesktop.org/software/systemd/man/devel/systemd.timer.html

## Issues Found
- Podman checkpoint examples used `.tar.gz` filenames without specifying gzip compression. Current Podman checkpoint exports default to zstd compression, so I added `--compress=gzip` to the checkpoint commands that write `.tar.gz` files.
- Redis examples used `BGSAVE` and then copied `/data/dump.rdb` immediately or after a fixed sleep. `BGSAVE` runs asynchronously, so I changed the examples to record `LASTSAVE`, run `BGSAVE`, and wait until `LASTSAVE` changes before copying the RDB file.
- The MinIO Client upload example used `$(basename $BACKUP_FILE)` without quoting the variable. I changed it to `$(basename "$BACKUP_FILE")` so paths with spaces are handled correctly.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was verified against the official Podman documentation rather than local `--help` output. Bash snippets were extracted from the post and checked with `bash -n`; all parsed successfully after the fixes.
