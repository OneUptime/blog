# Validation Summary: How to Enable Stretch Mode for a Ceph Cluster

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Ceph (distributed storage)
- Ceph CRUSH maps and rules
- Ceph stretch mode (site-level fault tolerance)
- Ceph monitors (arbiter/tiebreaker configuration)
- Rook (Ceph operator for Kubernetes, mentioned in tags)

## Sources Consulted
- Ceph Stretch Mode documentation (Reef): https://docs.ceph.com/en/reef/rados/operations/stretch-mode/
- Ceph Stretch Mode documentation (Latest): https://docs.ceph.com/en/latest/rados/operations/stretch-mode/
- Ceph CRUSH Maps documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph Pools documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph Control Commands documentation: https://docs.ceph.com/en/latest/rados/operations/control/
- Ceph CLI man page: https://docs.ceph.com/en/reef/man/8/ceph/
- Ceph stretch-mode.rst source on GitHub: https://github.com/ceph/ceph/blob/main/doc/rados/operations/stretch-mode.rst

## Issues Found

### Issue 1: Incorrect `ceph mon set-location` command syntax
- **What was wrong:** The post used `ceph mon set-location` (with a hyphen), but the correct Ceph CLI command uses an underscore: `ceph mon set_location`.
- **What was changed:** Replaced `set-location` with `set_location` in Step 2.
- **Why:** The official Ceph documentation consistently uses `ceph mon set_location`. The hyphenated form is not a valid command.

### Issue 2: Spurious `osd` argument in CRUSH rule creation
- **What was wrong:** The post used `ceph osd crush rule create-replicated stretch_rule default datacenter osd`. The fourth positional argument (`osd`) is interpreted as a **device class** (like `ssd` or `hdd`), not a sub-failure-domain. There is no standard device class named "osd", so this would either fail or create an unintended rule.
- **What was changed:** Removed the trailing `osd` argument, leaving `ceph osd crush rule create-replicated stretch_rule default datacenter`.
- **Why:** The correct syntax is `ceph osd crush rule create-replicated {name} {root} {failure-domain} [{device-class}]`. The rule only needs the name, root, and failure-domain type.

### Issue 3: Nonexistent `ceph osd up` command
- **What was wrong:** The post used `ceph osd up osd.0 osd.1` to bring OSDs back online after testing. There is no `ceph osd up` command in Ceph. OSDs mark themselves as "up" automatically when their daemon starts.
- **What was changed:** Replaced `ceph osd up osd.0 osd.1` with `systemctl start ceph-osd@0` and `systemctl start ceph-osd@1`.
- **Why:** The correct way to bring OSDs back up is to restart their daemons. The `ceph osd down` command exists for marking OSDs down, but there is no corresponding `ceph osd up` command.

## Review Notes
- The `ceph osd dump | grep stretch` verification step is correct but the exact output format may vary by Ceph version (`stretch_mode_enabled 1` vs `stretch_mode_enabled true`). This is minor and acceptable as-is.
- The pool creation syntax specifying pg-num and pgp-num (`64 64`) is valid but somewhat outdated for modern Ceph clusters that use the pg-autoscaler module. The autoscaler is enabled by default since Nautilus. This is not incorrect, just worth noting for readers on recent Ceph versions.
- For cephadm-managed clusters, the OSD restart command would be `ceph orch daemon start osd.0` instead of `systemctl`. The post uses `systemctl` which is correct for traditional deployments.
