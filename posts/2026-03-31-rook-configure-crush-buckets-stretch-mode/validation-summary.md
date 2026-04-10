# Validation Summary: How to Configure CRUSH Buckets for Stretch Mode

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CRUSH maps, stretch mode, OSD tree)
- Rook (Ceph operator for Kubernetes)
- crushtool (CRUSH map compilation and testing utility)

## Sources Consulted
- Ceph official documentation — CRUSH Maps: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph official documentation — Stretch Clusters: https://docs.ceph.com/en/latest/rados/operations/stretch-mode/
- Ceph official documentation — crushtool man page: https://docs.ceph.com/en/latest/man/8/crushtool/
- Ceph official documentation — Manually editing the CRUSH Map: https://docs.ceph.com/en/latest/rados/operations/crush-map-edits/
- Ceph blog — New in Luminous: CRUSH Device Classes: https://ceph.io/en/news/blog/2017/new-luminous-crush-device-classes/

## Issues Found
1. **Incorrect device class argument in CRUSH rule creation command (line 89)**
   - **What was wrong:** The command `ceph osd crush rule create-replicated stretch_rule default datacenter osd` passed `osd` as the fourth argument. This argument is interpreted as a device class filter. `osd` is not a valid device class — valid classes are `hdd`, `ssd`, and `nvme`. This would cause the command to fail with `Error EINVAL: device class osd does not exist`.
   - **Additional concern:** Ceph stretch mode documentation explicitly states that CRUSH rules with device class restrictions are not supported in stretch mode.
   - **What was changed:** Removed the trailing `osd` argument, making the command `ceph osd crush rule create-replicated stretch_rule default datacenter`.
   - **Why:** The corrected command creates a replicated rule with `default` as the root and `datacenter` as the failure domain, with no device class restriction — which is the correct configuration for stretch mode.

## Review Notes
- The `crushtool --test` example uses `--rule 2` as a hardcoded rule number. In practice, the rule number depends on how many CRUSH rules already exist in the cluster. Users should check their actual rule ID via `ceph osd crush rule dump stretch_rule` before running the test command.
- The `ceph osd tree` expected output only shows dc1. This is fine as a partial example, but users should expect to see both dc1 and dc2 in the full output.
- All other commands (`add-bucket`, `crush move`, `getcrushmap`/`setcrushmap`, `crushtool -d`/`-c`, `crush rule ls`/`dump`) are syntactically correct and match official Ceph documentation.
