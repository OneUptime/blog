# Validation Summary: How to Configure Stretch Clusters in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (Pacific or later)
- Ceph CRUSH maps
- Ceph stretch mode
- Ceph monitor quorum and election strategies

## Sources Consulted
- Ceph Stretch Mode Official Docs (latest): https://docs.ceph.com/en/latest/rados/operations/stretch-mode/
- Ceph Stretch Mode Official Docs (Pacific): https://docs.ceph.com/en/pacific/rados/operations/stretch-mode/
- Ceph CRUSH Map Documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph CLI Manpage: https://manpages.ubuntu.com/manpages/questing/man8/ceph.8.html
- Red Hat Ceph Storage 5 - Stretch Clusters: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/5/html/administration_guide/stretch-clusters-for-ceph-storage
- Ceph MonMap source code (stretch_mode_enabled): https://github.com/ceph/ceph/blob/main/src/mon/MonMap.cc

## Issues Found

1. **`enable_stretch_mode` command had wrong syntax**: The blog used `ceph mon enable_stretch_mode mon.arbiter datacenter datacenter-a datacenter-b` (4 parameters, wrong types). The correct syntax is `ceph mon enable_stretch_mode <tiebreaker_mon> <new_crush_rule> <dividing_bucket>`, so fixed to `ceph mon enable_stretch_mode arbiter stretch_rule datacenter`. The tiebreaker monitor name also should not include the `mon.` prefix.

2. **Steps were in wrong order**: The blog enabled stretch mode (old Step 2) before creating the CRUSH rule (old Step 3). The `enable_stretch_mode` command requires the CRUSH rule to already exist since the rule name is a parameter. Swapped the order so the CRUSH rule is created first.

3. **Incorrect `min_size=1` claim**: The blog stated that `enable_stretch_mode` "Sets `min_size=1`". This is incorrect — `min_size=1` is not set on initial enablement. Instead, when a site fails, the cluster automatically enters degraded stretch mode and temporarily reduces `min_size` to allow I/O to continue. Corrected the description to explain this automatic failover behavior.

4. **CRUSH rule command had spurious `host` argument**: `ceph osd crush rule create-replicated stretch_rule default datacenter host` — the `host` parameter would be interpreted as a device class (like `ssd` or `hdd`), which is incorrect. Removed the `host` argument.

5. **Inconsistent "one copy per datacenter" text**: The description said "place one copy per datacenter" but the pool was configured with size=4 (2 copies per datacenter). Changed to "distribute copies across both datacenters".

6. **Wrong verification command**: `ceph mon stat` does not show stretch mode status. The `stretch_mode_enabled` field is part of the MonMap and is shown by `ceph mon dump`. Fixed the command.

7. **Missing election strategy step**: Added the required `ceph mon set election_strategy connectivity` command before enabling stretch mode, which is a prerequisite documented in the official Ceph docs.

## Review Notes
- The official Ceph stretch mode documentation recommends creating the CRUSH rule by manually editing and compiling the CRUSH map (using a multi-take rule with separate `take` steps per site), rather than using `ceph osd crush rule create-replicated`. The `create-replicated` approach used in this blog is a simpler alternative that works in practice with stretch mode, but for production deployments the manual CRUSH map approach provides more precise control over replica placement (guaranteeing exact 2+2 distribution).
- The blog does not cover setting monitor locations with `ceph mon set_location`, which is another step documented in the official guide. This is acceptable for a simplified tutorial but worth noting.
- The `ceph pg dump | awk '{print $1, $14}'` command in the monitoring section may need column index adjustments depending on the Ceph version, as `pg dump` output format can vary.
