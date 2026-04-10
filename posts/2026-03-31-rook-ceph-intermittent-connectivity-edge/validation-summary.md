# Validation Summary: How to Configure Ceph for Intermittent Connectivity at Edge

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- RADOS Gateway (RGW) multisite sync
- CRUSH maps and rules
- CephFS MDS

## Sources Consulted
- Ceph monitor config source: https://github.com/ceph/ceph/blob/main/src/common/options/mon.yaml.in
- Ceph OSD config source: https://github.com/ceph/ceph/blob/main/src/common/options/osd.yaml.in
- Ceph Monitor/OSD Interaction docs: https://github.com/ceph/ceph/blob/main/doc/rados/configuration/mon-osd-interaction.rst
- radosgw-admin man page: https://github.com/ceph/ceph/blob/main/doc/man/8/radosgw-admin.rst
- CRUSH Maps documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/

## Issues Found

### 1. Invalid config option name `osd_down_out_interval`
- **What was wrong:** The heartbeat tuning section used `ceph config set mon osd_down_out_interval 300`. The option `osd_down_out_interval` does not exist; the correct name is `mon_osd_down_out_interval`.
- **What was changed:** Removed the line from the heartbeat section entirely, since the correct option (`mon_osd_down_out_interval`) is already covered in the dedicated "Preventing OSD Mark-Out" section below it. This also eliminated a contradictory duplicate (300 vs 600).

### 2. Incorrect default value for `mon_osd_down_out_interval`
- **What was wrong:** The post stated "By default, OSDs are marked out after 5 minutes" and then set the value to 600 (10 minutes). The actual default in modern Ceph (Nautilus and later) is 600 seconds (10 minutes), making the claim wrong and the command a no-op.
- **What was changed:** Corrected the default claim to "10 minutes (600 seconds)" and changed the recommended value from 600 to 1800 (30 minutes) to actually provide a meaningful increase for edge environments with unreliable connectivity.

### 3. Invalid config option name `osd_down_out_subtree_limit`
- **What was wrong:** The post used `ceph config set mon osd_down_out_subtree_limit host`. The correct option name is `mon_osd_down_out_subtree_limit` (requires `mon_` prefix).
- **What was changed:** Fixed the option name to `mon_osd_down_out_subtree_limit`.

## Review Notes
- The `osd_recovery_max_active` option defaults to 0 in modern Ceph (Reef), which enables auto-tuning via device-type-specific options (`osd_recovery_max_active_hdd` defaults to 3, `osd_recovery_max_active_ssd` defaults to 10). Setting it explicitly to 3 overrides auto-tuning, which is fine for the edge use case described but worth noting.
- The description of `mon_osd_down_out_subtree_limit` as "Disable automatic OSD removal entirely" is somewhat misleading. Setting it to `host` prevents auto-mark-out when all OSDs under a host go down, but individual OSD failures will still be auto-marked out. For a complete disable, `ceph osd set noout` would be more appropriate. This was not changed since the command itself is valid and useful for the described scenario.
- The `mon_lease` increase to 30 seconds is aggressive and should be paired with proportional increases to `mon_lease_ack_timeout_factor` to avoid election instability. The post does not mention this dependency.
