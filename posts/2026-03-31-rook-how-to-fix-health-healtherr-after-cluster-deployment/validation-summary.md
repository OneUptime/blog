# Validation Summary: How to Fix 'health HEALTH_ERR' After Cluster Deployment

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Kubernetes (kubectl CLI)
- Ceph MON, OSD, PG, and CRUSH subsystems

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph official documentation on placement groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph official documentation on CRUSH map: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph official documentation on monitoring: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Rook documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
- **Step 9 - Incorrect description of command**: The text described `ceph osd pool set <pool-name> pg_autoscale_mode warn` as "Force a pool scrub to unstick." This is incorrect — the command sets the PG autoscale mode to "warn," which disables automatic PG scaling. It does not perform a pool scrub. These are entirely different operations. Fixed the description to accurately explain what the command does (disabling the PG autoscaler when it interferes with PG creation) and added a `ceph pg repeer <pgid>` command as the appropriate action for stuck PGs.

## Review Notes
- The `watch` command in the "Monitoring Recovery Progress" section uses `-it` flags with `kubectl exec` inside `watch`. This can sometimes produce TTY-related warnings since `watch` manages the terminal itself. Using `-i` alone (without `-t`) would be slightly more correct, but in practice this works for most users.
- All other commands, flags, labels, and technical explanations are accurate for current Rook-Ceph deployments.
