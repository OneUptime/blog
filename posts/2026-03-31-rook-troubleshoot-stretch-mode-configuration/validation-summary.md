# Validation Summary: How to Troubleshoot Stretch Mode Configuration Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (stretch mode, CRUSH rules, monitors, PGs, OSD map)
- Rook (Ceph operator for Kubernetes)
- Bash scripting

## Sources Consulted
- Ceph official documentation on stretch mode: https://docs.ceph.com/en/latest/rados/operations/stretch-mode/
- Ceph CRUSH rule documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph monitor management documentation: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-mons/

## Issues Found

1. **Incorrect tiebreaker monitor check**: The post used `ceph quorum_status` and parsed a `tiebreaker_mon` field that does not exist in the quorum_status output. Replaced with `ceph mon dump`, which shows stretch mode tiebreaker information, and a simpler `ceph quorum_status` call for checking quorum membership.

2. **Incorrect CRUSH rule verification guidance**: The post stated to verify that `step chooseleaf` uses `datacenter` type. In a correct stretch mode CRUSH rule, `chooseleaf` uses `host` type, not `datacenter`. The datacenter separation is handled by either multiple `take` steps or a `step choose` with datacenter type. Fixed the explanation and removed the misleading grep command.

3. **Incorrect CRUSH rule creation method**: The post used `ceph osd crush rule create-replicated stretch_rule default datacenter osd` to create a stretch mode rule. This command cannot produce the multi-step rule structure required by stretch mode (which needs separate take/chooseleaf/emit blocks per datacenter). Additionally, `osd` is not a standard device class. Replaced with the correct approach of editing the CRUSH map directly using `crushtool`, with an example of the proper rule structure.

4. **Invalid command to disable stretch mode**: The post used `ceph osd unset stretch_mode_enabled`, which is not a valid Ceph command. Replaced with the correct command `ceph mon disable_stretch_mode --yes-i-really-mean-it`, and added a note that this is only available in Ceph Reef 18.2.8+ and has specific state requirements.

## Review Notes
- The `ceph mon enable_stretch_mode` syntax is correct as written.
- Pool size=4 and min_size=2 are confirmed correct for stretch mode.
- The `ceph pg dump stuck inactive` and `ceph pg <pgid> query` commands are correct.
- The `ceph osd dump | grep` approach for checking stretch mode flags is valid.
- The CRUSH rule example uses generic site names (site1, site2); users will need to replace these with their actual CRUSH bucket names.
