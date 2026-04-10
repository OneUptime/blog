# Validation Summary: How to Use Ceph RGW as Backup Target for Restic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RGW / RADOS Gateway)
- Restic backup tool
- S3-compatible object storage
- systemd (timers and services)
- AWS CLI (for bucket creation)
- radosgw-admin CLI

## Sources Consulted
- [Restic documentation — Working with repositories](https://restic.readthedocs.io/en/stable/045_working_with_repos.html) — verified `--read-data-subset=10%` percentage format, repository URL format, environment variables, and all Restic CLI commands/flags
- [Restic PR #3038 — Check random percentage subset](https://github.com/restic/restic/pull/3038) — confirmed percentage-based `--read-data-subset` feature
- [systemd.exec man page](https://man7.org/linux/man-pages/man5/systemd.exec.5.html) — verified `EnvironmentFile` parsing behavior, systemd timer/service unit syntax
- [systemd env-file.c source code](https://github.com/systemd/systemd/blob/main/src/basic/env-file.c) — confirmed `EnvironmentFile` parser does NOT strip `export` prefix
- [Ceph radosgw-admin documentation](https://docs.ceph.com/en/latest/radosgw/admin/) — verified user creation syntax

## Issues Found
- **`EnvironmentFile` incompatible with `export` prefix**: The `.restic-env` file created in Step 2 used `export KEY=VALUE` syntax. This works when sourced in a shell (`source ~/.restic-env`), but systemd's `EnvironmentFile` directive does NOT strip the `export` keyword — it would parse the variable name as `export AWS_ACCESS_KEY_ID` (including the word "export" and a space), causing Restic to not find its expected environment variables. **Fix**: Removed the `export` prefix from the persistent env file so it uses plain `KEY=VALUE` format (compatible with both systemd `EnvironmentFile` and shell sourcing via `set -a`). Updated Step 3 to use `set -a` / `set +a` around `source` so that variables are exported to child processes without needing the `export` keyword in the file.

## Review Notes
- The `--read-data-subset=10%` percentage format is valid for Restic 0.14.0+ (confirmed via official docs and PR #3038). The blog does not specify a Restic version; this is fine for modern installations.
- The `aws s3 mb` command in Step 1 requires AWS CLI credentials to be configured (from the RGW user creation output), but this is implied by the flow and not a technical error.
- The systemd service uses `ExecStartPost` for the `restic forget --prune` step. This means pruning only runs if the backup succeeds, which is correct behavior.
- All Restic commands (`init`, `backup`, `snapshots`, `check`, `restore`, `forget --prune`) use correct syntax and valid flags.
- The `radosgw-admin user create` command syntax is correct for Ceph RGW.
