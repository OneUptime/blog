# Validation Summary: How to Create a Ceph Backup Verification Runbook

## Status
validated

## Post Type
Runbook / Operations Guide

## Technologies Covered
- Rook-Ceph (RBD, CephFS, RGW)
- Kubernetes (kubectl)
- Velero (backup and restore)
- Restic (CephFS backup verification)
- radosgw-admin (multisite sync)
- AWS CLI (S3-compatible object storage)

## Sources Consulted
- Ceph RBD CLI reference: https://docs.ceph.com/en/latest/rbd/rados-rbd-cmds/
- Ceph radosgw-admin CLI reference: https://docs.ceph.com/en/latest/radosgw/admin/
- Velero CLI reference: https://velero.io/docs/main/restore-reference/
- Restic documentation: https://restic.readthedocs.io/en/latest/
- Kubernetes kubectl exec documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- AWS CLI S3 reference: https://docs.aws.amazon.com/cli/latest/reference/s3/

## Issues Found
No technical issues found.

## Review Notes
- The `-it` flags on `kubectl exec` commands that pipe output (e.g., the `--format json | python3 -m json.tool` line) could cause issues in automated/scripted contexts because TTY allocation may inject control characters into the piped output. For manual runbook execution this is fine, but if automating these checks, users should use `-i` without `-t` when piping.
- The `rbd map` command inside the rook-ceph-tools container requires the container to run with sufficient privileges (e.g., privileged mode or appropriate capabilities). This is a deployment-specific prerequisite worth noting when following the runbook.
- The post uses `md5sum` for checksum verification. While adequate for data integrity checking (detecting corruption), `sha256sum` would be a stronger choice if tamper detection is also a concern.
