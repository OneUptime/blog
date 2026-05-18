# Validation Summary: How to Set Up JuiceFS on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- JuiceFS (community edition)
- Ubuntu 20.04 / 22.04
- Redis (single-instance and Sentinel)
- MinIO and AWS S3 (object storage backends)
- PostgreSQL (alternative metadata engine)
- FUSE (Linux user-space filesystem)
- systemd
- Prometheus (metrics endpoint)

## Sources Consulted
- JuiceFS architecture: https://juicefs.com/docs/community/architecture/
- JuiceFS command reference: https://juicefs.com/docs/community/command_reference/
- JuiceFS metadata engines: https://juicefs.com/docs/community/databases_for_metadata/
- JuiceFS object storage configuration: https://juicefs.com/docs/community/reference/how_to_set_up_object_storage/
- JuiceFS installation: https://juicefs.com/docs/community/getting-started/installation/
- MinIO server docs: https://min.io/docs/minio/linux/index.html
- Redis configuration reference: https://redis.io/docs/management/config/
- Bash manual (line continuation / comments)

## Issues Found

1. **Storage architecture terminology was reversed.** The post said object storage holds data in "fixed-size chunks (default 64 MB blocks split into 4 MB slices)". The actual JuiceFS hierarchy is Chunks (up to 64 MiB, logical) → Slices (one per continuous write) → Blocks (up to 4 MiB, the physical unit written to object storage). Rewrote the sentence to describe the chunk → slice → block flow correctly.

2. **Redis Sentinel URL format was wrong.** The post used a `?sentinel=mymaster` query parameter, which JuiceFS does not parse. The correct format puts the master name first in the host list, followed by sentinel addresses sharing a single port: `redis://:password@MASTER_NAME,SENTINEL_ADDR[,SENTINEL_ADDR]:SENTINEL_PORT[/DB]`. Updated the example accordingly.

3. **`juicefs fsck` does not compact metadata.** The comment in the GC section said "Also compact metadata" next to `juicefs fsck`. `fsck` only checks consistency; compaction is performed by `juicefs gc --compact`. Replaced the misleading comment, added a `juicefs gc --compact` example, and clarified what `fsck` actually does.

4. **Bash inline comments after `\` line continuations would break the command.** In the performance-tuning mount example, comments like `\  # local cache ...` cause the backslash to escape the space rather than the newline, terminating the command on the first line. Removed the inline comments and replaced them with a separate bulleted list describing each flag (with corrected default values verified against the JuiceFS command reference).

## Review Notes
- The post correctly notes the JuiceFS install URL (`https://d.juicefs.com/install`), the MinIO download URL, the default metrics endpoint (`127.0.0.1:9567`), and the `juicefs format`/`mount`/`status`/`info`/`gc` command signatures.
- On Ubuntu 22.04 the `fuse` apt package (libfuse2) is what JuiceFS needs; this is correct as written.
- The PostgreSQL section is functional but does not mention enabling password authentication in `pg_hba.conf`; out-of-the-box `peer` auth on a fresh install will reject the `postgres://juicefs:juicefspass@...` URL. Not corrected because it is a Postgres-setup nuance rather than an incorrect technical claim about JuiceFS.
- `juicefs umount` requires the user to be root or have permission to call `umount(2)`; the post uses `sudo` for mount but not for `juicefs umount` in the troubleshooting section. Not corrected because the surrounding context implies a root shell.
- The post correctly notes that `--writeback` trades durability for write performance — worth keeping in mind for production workloads.
