# Validation Summary: How to Use Toolbox Jobs for One-Off Commands in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (v1.13.x)
- Ceph (v18.2.x / Reef)
- Kubernetes Jobs and CronJobs
- Kubernetes Secrets and ConfigMaps

## Sources Consulted
- Rook official toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Rook official toolbox-job.yaml (v1.13): https://raw.githubusercontent.com/rook/rook/release-1.13/deploy/examples/toolbox-job.yaml
- Rook official toolbox.yaml (v1.13): https://raw.githubusercontent.com/rook/rook/release-1.13/deploy/examples/toolbox.yaml

## Issues Found

### Issue 1: Init container in "Basic Toolbox Job" used a non-functional config copy command
**What was wrong:** The init container ran `cp -r /var/lib/rook/rook-ceph/. /etc/ceph/` but nothing was mounted at that source path, so there was nothing to copy. The env vars (`ROOK_CEPH_USERNAME`, `ROOK_CEPH_SECRET`) were placed on the main container instead of the init container, and the main container (raw Ceph image) doesn't process those env vars.
**What was changed:** Replaced the init container with the official pattern: runs `/usr/local/bin/toolbox.sh --skip-watch` to generate `ceph.conf` and keyring. Moved `ROOK_CEPH_USERNAME` env var to the init container. Added required volume mounts for `rook-ceph-mon-endpoints` ConfigMap, `rook-ceph-mon` Secret (mounted as `secret.keyring`), and the shared `ceph-config` emptyDir. The main container now mounts `ceph-config` as read-only.
**Why:** Matches the official `deploy/examples/toolbox-job.yaml` from the Rook repository.

### Issue 2: "Rook Toolbox Job Template" used non-existent env var and secret key
**What was wrong:** Used `ROOK_ADMIN_SECRET` env var referencing the `admin-secret` key from the `rook-ceph-mon` Secret. Neither the env var name nor the secret key exist in Rook. The `rook-ceph-mon` Secret contains keys `ceph-username`, `ceph-secret`, `fsid`, and `mon-secret` -- not `admin-secret`.
**What was changed:** Replaced with the correct `ROOK_CEPH_USERNAME` env var (key: `ceph-username`) on an init container, with the `ceph-secret` key mounted as a volume file.
**Why:** The env var `ROOK_ADMIN_SECRET` does not exist anywhere in the Rook codebase. Using it would cause the Job to fail to authenticate with the Ceph cluster.

### Issue 3: "Rook Toolbox Job Template" was missing all volume mounts
**What was wrong:** No volumes were defined at all. Without the mon-endpoints ConfigMap, the admin secret, and an emptyDir for generated config, the `ceph` commands cannot connect to the cluster.
**What was changed:** Added the full volume configuration matching the official toolbox-job.yaml pattern: `ceph-admin-secret` (from `rook-ceph-mon` Secret), `mon-endpoint-volume` (from `rook-ceph-mon-endpoints` ConfigMap), and `ceph-config` (emptyDir).

### Issue 4: "Rook Toolbox Job Template" referenced non-existent service account
**What was wrong:** Specified `serviceAccountName: rook-ceph-default`. Rook does not create a service account by this name. The official toolbox examples do not specify a serviceAccountName.
**What was changed:** Removed the `serviceAccountName` field. The default service account in the `rook-ceph` namespace is sufficient for toolbox operations.

### Issue 5: CronJob example was missing all connection configuration
**What was wrong:** The CronJob had no init container, no env vars, and no volume mounts. The `ceph health detail` command would fail immediately because it has no way to locate or authenticate with the Ceph cluster.
**What was changed:** Added the full init container and volume configuration matching the official toolbox-job.yaml pattern.

## Review Notes
- The post uses `rook/ceph:v1.13.0` while the latest patch release for the 1.13 series is v1.13.10. This is acceptable as it refers to the correct major/minor version, but users following the guide should use the latest patch release.
- The post uses `quay.io/ceph/ceph:v18.2.0` in the first example while the official toolbox.yaml uses `v18.2.2`. This is fine as a version reference but users should prefer the latest patch.
- The `restartPolicy: OnFailure` in the first two Job examples was changed to `Never` to match the official Rook toolbox-job.yaml. The CronJob retains `OnFailure` which is appropriate for recurring scheduled tasks.
- The "Running Multiple Commands" snippet (lines 101-114) is a partial YAML fragment showing just the `command` block. It is correct as a reference snippet assuming it is embedded in a properly configured Job spec with the init container and volumes shown in the earlier examples.
