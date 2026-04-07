# Validation Summary: How to Set Up Ceph Cluster Configuration Backup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (CRUSH map, OSD map, monitor map)
- Kubernetes (kubectl, CronJob, PVC, ConfigMap, Secret)
- AWS CLI (S3-compatible storage)

## Sources Consulted
- Rook documentation on the Ceph toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Rook CronJob backup patterns and toolbox deployment specs
- Ceph CLI reference for `ceph osd getcrushmap`, `ceph osd dump`, `ceph mon dump`, `crushtool`
- Kubernetes CronJob API reference: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
1. **CronJob missing Ceph config and keyring mounts**: The CronJob spec ran `ceph` CLI commands but did not mount the Ceph configuration file or authentication keyring. Without these, the ceph CLI cannot discover or authenticate to the Ceph monitors, so all ceph commands in the container would fail. Fixed by adding volume mounts for the `rook-ceph-config` ConfigMap (providing `/etc/ceph/ceph.conf`) and the `rook-ceph-mon` Secret (providing `/etc/ceph/keyring`), mirroring how the rook-ceph-tools deployment is configured.

2. **Outdated Rook image version**: The CronJob used `rook/ceph:v1.13.0`, which is significantly outdated. Updated to `rook/ceph:v1.16.0` to reflect a current release.

## Review Notes
- The post refers to backing up "Rook CRDs" but is actually exporting custom resource instances (CRs), not CustomResourceDefinition objects. This is a very common colloquial usage and readers will understand the intent, so no change was made.
- The `kubectl exec -it` flag in the interactive commands is fine for manual use but would not work in a non-interactive scripting context. Since those commands are presented as manual one-off operations (not part of the CronJob), this is acceptable.
- The post mentions backing up RGW user and bucket configurations in the "What to Back Up" list but does not provide commands for this. This is a content gap but not a technical error.
