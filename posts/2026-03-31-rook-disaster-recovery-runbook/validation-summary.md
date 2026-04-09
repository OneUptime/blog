# Validation Summary: How to Create a Ceph Disaster Recovery Runbook

## Status
validated

## Post Type
Guide / Runbook

## Technologies Covered
- Rook-Ceph (Ceph orchestrated on Kubernetes via Rook)
- Ceph (monitors, OSDs, CRUSH, RBD, RGW, PG repair)
- Kubernetes (kubectl, pod management)
- Velero (backup and restore)
- AWS CLI (S3 sync for RGW object data)

## Sources Consulted
- Ceph official documentation: `ceph-mon` CLI usage for monmap extraction and injection (https://docs.ceph.com/en/latest/man/8/ceph-mon/)
- Ceph official documentation: `monmaptool` usage (https://docs.ceph.com/en/latest/man/8/monmaptool/)
- Ceph official documentation: disaster recovery procedures (https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-mon/)
- AWS CLI v2 documentation: `aws s3 sync` command reference (https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html)
- Velero documentation: restore command reference (https://velero.io/docs/)
- Rook documentation: disaster recovery guide (https://rook.io/docs/rook/latest/Troubleshooting/disaster-recovery/)

## Issues Found

### Issue 1: Missing `--mon-data` flag on `ceph-mon --inject-monmap`
- **What was wrong:** The `ceph-mon --inject-monmap /tmp/monmap` command in Scenario 2 was missing the `--mon-data` flag. Without it, `ceph-mon` does not know which monitor store to inject the monmap into, and the command would fail. The extract command earlier in the same section correctly included `--mon-data /var/lib/ceph/mon/ceph-a`, but the inject command omitted it.
- **What was changed:** Added `--mon-data /var/lib/ceph/mon/ceph-a` to the inject command to match the extract command.
- **Why:** The `--mon-data` (or `-i <id>`) parameter is required for both extract and inject operations so `ceph-mon` can locate the monitor's data store on disk.

### Issue 2: Invalid `--source-region` flag on `aws s3 sync`
- **What was wrong:** The `aws s3 sync` command in Scenario 3 included `--source-region us-east-1`, which is not a valid parameter for the `aws s3 sync` command. The `--source-region` flag does not exist in the AWS CLI S3 high-level commands.
- **What was changed:** Removed the `--source-region us-east-1` line from the command.
- **Why:** The AWS CLI resolves the source bucket's region automatically. The `--source-region` parameter is not supported by `aws s3 sync` and would cause the command to fail with an unknown option error.

## Review Notes
- The Scenario 2 monmap recovery procedure runs `ceph-mon --extract-monmap` and `ceph-mon --inject-monmap` via `kubectl exec` into a running monitor pod. In practice, the monitor daemon should ideally be stopped before performing monmap injection. In a quorum-loss scenario, the monitor may already be in a non-functional state, making this viable, but readers should be aware that injecting a monmap while the daemon is running can be risky.
- The `aws s3 sync` command with `--endpoint-url` sends all requests (both source reads and destination writes) to the specified endpoint. This means the command only works when both buckets are accessible from the same endpoint (e.g., both on the same RGW cluster). If the backup bucket is on AWS S3 and the destination is on Ceph RGW, two separate operations would be needed.
- The `rados list-inconsistent-pg` command in the RBD recovery section would benefit from a note that a deep scrub should be run first to detect inconsistencies, but this is an omission rather than an error.
