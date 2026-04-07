# Validation Summary: How to Scrub the CephFS Filesystem

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph / CephFS
- MDS (Metadata Server) scrubbing
- Kubernetes CronJobs

## Sources Consulted
- Ceph official documentation on CephFS scrub commands: https://docs.ceph.com/en/latest/cephfs/scrub/
- Ceph MDS admin commands reference: https://docs.ceph.com/en/latest/cephfs/administration/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found

1. **Step 4 - `scrub pause` and `scrub resume` do not exist**: The MDS scrub interface does not support `pause`/`resume` subcommands. The available subcommands are `scrub start`, `scrub abort`, and `scrub status`. Changed the section to document `scrub abort` instead.

2. **Step 5 - `force` flag incorrectly described as enabling repair**: The correct flag for repairing inconsistencies is `repair`, not `force`. The `force` flag forces a scrub to start even if one is already running. Changed the flag from `force` to `repair` and updated the description accordingly.

3. **Step 6 - CronJob missing Ceph config/keyring volume mounts**: The CronJob container running the `ceph` CLI needs access to Ceph configuration and authentication credentials. Without volume mounts for `/etc/ceph`, the `ceph` command cannot connect to the cluster. Added `volumeMounts` and `volumes` sections with projected sources for the Rook-Ceph mon endpoints ConfigMap and mon Secret.

4. **Summary section**: Updated reference from `force` to `repair` to match the corrected Step 5.

## Review Notes
- The sample `scrub status` output in Step 3 is illustrative rather than exact; real output format may vary by Ceph version. This is acceptable for a tutorial.
- The CronJob image `rook/ceph:v1.14.0` is version-specific; readers should update to match their deployed Rook version.
- The CronJob volume mount approach is a simplified example. In production, users may need to use the Rook toolbox image or configure additional authentication (e.g., admin keyring secret) depending on their cluster setup.
