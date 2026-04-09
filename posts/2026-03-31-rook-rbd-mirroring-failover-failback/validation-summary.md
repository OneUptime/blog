# Validation Summary: How to Perform RBD Mirroring Failover and Failback

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RBD (RADOS Block Device) mirroring
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl)
- Bash scripting

## Sources Consulted
- Ceph official documentation on RBD mirroring: https://docs.ceph.com/en/latest/rbd/rbd-mirroring/
- Rook documentation on disaster recovery: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/rbd-mirroring/
- Ceph CLI reference for `rbd mirror` commands: https://docs.ceph.com/en/latest/man/8/rbd/

## Issues Found

1. **Outdated field name `entries_behind_master`** — The post referenced `entries_behind_master` in two places (planned failover step 3 and failback step 3). Ceph renamed this field to `entries_behind_primary` starting with the Pacific release (v16.2, 2021) as part of inclusive terminology changes. Updated both occurrences to `entries_behind_primary`.

2. **`$TOOLBOX` variable reused across different cluster contexts** — In the "Rook: Failover Workflow" section, the `$TOOLBOX` variable was populated from the primary cluster but then used in a `kubectl --context secondary-cluster` command. The secondary cluster's toolbox pod has a different name. Fixed by introducing separate `$PRIMARY_TOOLBOX` and `$SECONDARY_TOOLBOX` variables, each queried from the appropriate cluster context.

3. **Incorrect verification comment** — The "Verifying After Failover" section had the comment "Check all images are in replaying state on new primary." After promotion, images on the new primary are in "primary" state, not "replaying." The "replaying" state is what you see on the secondary/standby side. Updated the comment to "Check all images show as primary on the promoted cluster."

## Review Notes
- The overall failover/failback workflow (demote primary, wait for sync, promote secondary) is correct and follows Ceph best practices.
- The distinction between planned (graceful demote then promote) and unplanned (force promote) failover is accurately described.
- The automation script uses `--force` which is appropriate for emergency failover but the post could note in the future that a planned failover script variant (without `--force`) would also be useful.
- The `watch` command usage for monitoring sync status is practical and correct.
