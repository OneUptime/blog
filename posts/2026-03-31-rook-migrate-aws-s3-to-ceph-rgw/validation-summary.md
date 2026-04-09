# Validation Summary: How to Migrate from AWS S3 to Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RGW / RADOS Gateway)
- AWS S3
- rclone (S3-to-S3 migration tool)
- radosgw-admin (Ceph RGW administration CLI)
- Kubernetes (kubectl)

## Sources Consulted
- rclone official documentation: `rclone copy`, `rclone sync`, `rclone check`, `rclone mkdir`, `rclone lsd`, `rclone lsf` subcommand help (https://rclone.org/docs/)
- rclone S3 backend configuration reference, including `provider = Ceph` (https://rclone.org/s3/)
- Ceph radosgw-admin man page (https://docs.ceph.com/en/latest/man/8/radosgw-admin/)
- Ceph radosgw-admin source-level command list (https://github.com/ceph/ceph/blob/main/src/test/cli/radosgw-admin/help.t)

## Issues Found

1. **Missing `mkdir -p` for rclone config directory (Step 2):** The rclone Docker image does not necessarily have `/root/.config/rclone/` pre-created. The `cat << EOF >` redirect would fail if the directory doesn't exist. Added `mkdir -p /root/.config/rclone` before writing the config file.

2. **Misleading comment on `rclone sync` behavior (Step 5):** The comment said "only copies new/modified objects," but `rclone sync` also deletes objects from the destination that do not exist in the source. This is a significant behavioral difference from `rclone copy`. Updated the comment to accurately state that sync "copies new/modified objects and deletes destination objects not in source."

3. **Incorrect comment about multipart uploads (Handling Multipart Uploads section):** The comment said "List any incomplete multipart uploads in Ceph," but `radosgw-admin bucket list` lists regular objects in the bucket, not incomplete multipart uploads. There is no `radosgw-admin` subcommand specifically for listing incomplete multipart uploads. Updated the comment to "List objects in the bucket to verify migration," which accurately describes what the command does.

## Review Notes
- The `rclone sync` command in Step 5 is appropriate for a migration scenario where the destination should be an exact mirror of the source, but readers should be aware of the delete behavior. A `--dry-run` flag is recommended before running sync in production.
- The post correctly identifies `provider = Ceph` as a valid rclone S3 provider.
- All rclone flags (`--transfers`, `--checkers`, `--buffer-size`, `--s3-chunk-size`, `--progress`, `--one-way`) are valid and correctly used.
- The `radosgw-admin user create` syntax with `--uid`, `--display-name`, `--access-key`, and `--secret-key` is correct.
- The `--allow-unordered` flag for `radosgw-admin bucket list` is valid and documented for faster listing of large buckets.
