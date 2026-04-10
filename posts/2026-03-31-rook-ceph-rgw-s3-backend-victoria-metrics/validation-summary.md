# Validation Summary: How to Use Ceph RGW as S3 Backend for Victoria Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- VictoriaMetrics (vmbackup, vmrestore, vmbackupmanager)
- Rook Ceph (CephObjectStore, RGW)
- Kubernetes (CronJob, Helm)
- S3-compatible object storage
- AWS CLI (for bucket creation)

## Sources Consulted
- VictoriaMetrics vmbackup official docs: https://docs.victoriametrics.com/vmbackup/
- VictoriaMetrics vmrestore official docs: https://docs.victoriametrics.com/vmrestore/
- VictoriaMetrics vmbackupmanager official docs: https://docs.victoriametrics.com/vmbackupmanager/
- VictoriaMetrics Helm chart values.yaml: https://github.com/VictoriaMetrics/helm-charts/blob/master/charts/victoria-metrics-cluster/values.yaml
- VictoriaMetrics Cluster Helm Chart docs: https://docs.victoriametrics.com/helm/victoria-metrics-cluster/
- Rook Ceph CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook Ceph example object.yaml: https://github.com/rook/rook/blob/master/deploy/examples/object.yaml
- Ceph radosgw-admin documentation

## Issues Found

### 1. Incorrect Helm value paths for vmbackupmanager (lines 55-61)
**What was wrong:** The Helm `--set` flags used `vmbackupmanager.enable` and `vmbackupmanager.credentials.*` paths. In the `victoria-metrics-cluster` chart, vmbackupmanager is nested under `vmstorage` (i.e., `vmstorage.vmbackupmanager.*`), the enable key is `enabled` (not `enable`), and the `credentials` sub-section does not exist at all.

**What was changed:** Updated to use `vmstorage.vmbackupmanager.enabled`, `vmstorage.vmbackupmanager.destination` for the S3 bucket, `vmstorage.vmbackupmanager.extraArgs.customS3Endpoint` for the custom endpoint, and `vmstorage.vmbackupmanager.env` for AWS credentials as environment variables.

**Why:** The original paths would cause Helm to silently accept the values but never apply them to the deployment, resulting in vmbackupmanager not being enabled and having no credentials.

### 2. CronJob shell expansion in container args (lines 112-114)
**What was wrong:** The CronJob container `args` field contained `$(date +%Y-%m-%d)`. Kubernetes container `args` are not processed by a shell — the string would be passed as a literal to the vmbackup entrypoint, resulting in an invalid S3 path.

**What was changed:** Added `command: ["/bin/sh", "-c"]` to invoke a shell, and moved the vmbackup invocation (using `/vmbackup-prod`, the actual binary name in the image) into a shell script string in `args`. The vmbackup Docker image is Alpine-based and includes `/bin/sh`.

**Why:** Without shell processing, `$(date +%Y-%m-%d)` is treated as a literal string, not expanded to the current date, causing the backup to target a malformed S3 path.

### 3. CronJob missing S3 credentials (lines 109-116)
**What was wrong:** The CronJob spec did not include any AWS credentials (no `-credsFilePath` flag and no environment variables), so vmbackup would fail to authenticate against the Ceph RGW endpoint.

**What was changed:** Added `env` block with `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables matching the credentials created earlier in the post.

**Why:** Without credentials, vmbackup cannot authenticate to the S3-compatible endpoint and the backup would fail immediately.

## Review Notes
- The CephObjectStore YAML, radosgw-admin commands, vmbackup/vmrestore CLI flags, and credentials file format are all correct.
- The Rook RGW service name `rook-ceph-rgw-vm-store.rook-ceph` works within a Kubernetes cluster, though the fully-qualified form would be `rook-ceph-rgw-vm-store.rook-ceph.svc.cluster.local`.
- In production, AWS credentials should be stored in a Kubernetes Secret and referenced via `secretKeyRef` rather than hardcoded in Helm values or CronJob specs. The post uses inline values for simplicity, which is acceptable for a tutorial.
- The post uses `image: victoriametrics/vmbackup:latest` — in production, pinning to a specific version tag is recommended.
