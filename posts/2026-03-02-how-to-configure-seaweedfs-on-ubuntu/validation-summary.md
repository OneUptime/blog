# Validation Summary: How to Configure SeaweedFS on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- SeaweedFS master server
- SeaweedFS volume server
- SeaweedFS filer
- SeaweedFS S3-compatible API
- SeaweedFS FUSE mount
- systemd services
- AWS CLI

## Sources Consulted
- SeaweedFS GitHub README: https://github.com/seaweedfs/seaweedfs
- SeaweedFS GitHub releases: https://github.com/seaweedfs/seaweedfs/releases
- SeaweedFS Replication wiki: https://github.com/seaweedfs/seaweedfs/wiki/Replication
- SeaweedFS S3 Credentials wiki: https://github.com/seaweedfs/seaweedfs/wiki/S3-Credentials
- SeaweedFS 4.26 CLI help from the official linux_amd64 release for `weed master`, `weed volume`, `weed filer`, `weed s3`, `weed mount`, `weed filer.backup`, and `weed filer.meta.backup`

## Issues Found
- The replication digit explanation had the order reversed. Updated it to match SeaweedFS documentation: `XYZ` means replicas in other data centers, other racks in the same data center, and other servers in the same rack. Also corrected the meaning of `001` to another server in the same rack.
- The volume server examples used `-mserver`, which is deprecated in current SeaweedFS. Replaced it with `-master`.
- Single-master examples omitted `-peers=none`, which the current CLI recommends for standalone deployments to avoid waiting for a Raft quorum. Added it to standalone master examples and the systemd unit.
- The systemd section referenced restarting `seaweedfs-filer` later but did not define a filer service. Added a matching `seaweedfs-filer.service` and included it in the enable/start commands.
- The FUSE mount example mounted `/mnt/seaweedfs` without creating the mount directory. Added `sudo mkdir -p /mnt/seaweedfs`.
- The backup command used `weed filer.backup -dir=...`, but current `weed filer.backup` has no `-dir` flag and is for replication from `replication.toml`. Replaced it with `weed filer.meta.backup` using a backup filer config, which matches the post's filer metadata backup intent.

## Review Notes
- The S3 JSON identity format and actions match current SeaweedFS examples.
- `weed filer -s3 -s3.port=8333 -s3.config=...` is valid in the current CLI.
- The direct HTTP upload examples match the SeaweedFS README's master assignment and volume-server file ID workflow.
