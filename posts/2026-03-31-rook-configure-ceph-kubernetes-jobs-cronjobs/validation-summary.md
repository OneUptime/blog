# Validation Summary: How to Configure Ceph for Kubernetes Jobs and CronJobs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (persistent storage operator for Kubernetes)
- Kubernetes Jobs and CronJobs (batch/v1 API)
- Ceph RBD (block storage, ReadWriteOnce)
- CephFS (filesystem storage, ReadWriteMany)
- Ceph RGW (S3-compatible object storage)
- AWS CLI (for S3 operations against RGW)

## Sources Consulted
- Kubernetes Job API reference: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes PersistentVolumeClaim documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Rook-Ceph Object Store (RGW) documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Rook-Ceph CephFS documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
1. **CronJob backup example missing AWS credentials**: The CronJob at the "Scheduled Backups with CronJob" section used `aws s3 cp` to push backups to the RGW endpoint but did not include `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` environment variables. Without these, the S3 upload would fail with an authentication error. Added the credential env vars referencing the same `rgw-creds` secret used in the earlier S3 batch job example.

## Review Notes
- The S3 batch job example uses the `amazon/aws-cli` image but calls `python /scripts/transform.py` within it. The `amazon/aws-cli` image does not expose Python as a user-facing command, and no volume is mounted at `/scripts`. This is clearly meant as an illustrative placeholder for "run your processing logic here," but readers copying the example verbatim would encounter errors. A custom image with both AWS CLI and Python would be needed in practice.
- All Kubernetes YAML structures (Job, CronJob nesting with `jobTemplate.spec.template.spec`) are correct for the `batch/v1` API.
- The `restartPolicy` values are correct — Jobs require either `OnFailure` or `Never`.
- The CronJob `schedule: "0 2 * * *"` is a valid cron expression (daily at 2:00 AM).
- The claim that RBD PVCs are `ReadWriteOnce` and CephFS supports `ReadWriteMany` is accurate.
- The `rook-ceph-tools` deployment exec pattern for running `ceph df` is the standard Rook approach.
- The RGW service endpoint format `rook-ceph-rgw-<store-name>.<namespace>:<port>` is correct for the default Rook CephObjectStore service naming convention.
