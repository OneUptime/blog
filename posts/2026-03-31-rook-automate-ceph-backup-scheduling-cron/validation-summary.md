# Validation Summary: How to Automate Ceph Backup Scheduling with Cron

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (RBD, CephFS, RGW)
- Kubernetes CronJobs (batch/v1 API)
- kubectl CLI
- rbd CLI (Ceph block device tool)
- rclone (cloud sync tool)
- AWS CLI (S3 operations)
- Bash scripting
- Python 3 (inline retention logic)

## Sources Consulted
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/cron-job-v1/
- kubectl exec documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Ceph RBD CLI reference: https://docs.ceph.com/en/latest/man/8/rbd/
- rclone S3 backend documentation: https://rclone.org/s3/
- rclone lsd command documentation: https://rclone.org/commands/rclone_lsd/
- AWS CLI s3 cp documentation: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- Rook Ceph toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
1. **`kubectl exec -it` in non-interactive script context**: The `rbd_cmd()` function used `kubectl exec -it`, which allocates a pseudo-TTY (`-t`) and enables interactive stdin (`-i`). In a CronJob or cron-scheduled script, no TTY is available, so `-t` would produce warnings like "Unable to use a TTY - input is not a terminal or the right kind of file." More critically, for the `rbd export ... - | aws s3 cp -` pipeline that streams binary image data through kubectl, TTY allocation can corrupt the binary stream by injecting carriage returns (`\r`) and terminal escape sequences. **Fix**: Changed `kubectl exec -it` to `kubectl exec` (removed both `-i` and `-t` flags) since none of the rbd commands in this script require interactive stdin.

## Review Notes
- The CronJob uses `rook/ceph:v1.13.0` as the container image. This image is the Rook operator image and may not include `kubectl` or `aws` CLI tools needed by the backup script. In production, users would need a custom image with these tools installed, or restructure the approach. This is acceptable for a tutorial showing the pattern.
- The inline Python snippet for snapshot retention uses `$RETENTION_DAYS` which is expanded by bash before Python executes. This works correctly but could be fragile if the variable contained unexpected characters. Acceptable for the demonstrated use case.
- The `rclone lsd` output parsing with `awk '{print $5}'` correctly extracts the bucket name from rclone's standard directory listing format.
- The Kubernetes CronJob YAML is well-structured and uses correct field names and valid values for `batch/v1` CronJob spec.
- The rclone configuration and sync commands use valid options and correct provider settings for Ceph S3.
