# Validation Summary: How to Configure Common Settings in Ceph

## Status
validated

## Post Type
Reference / Configuration Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph orchestrator for Kubernetes)
- BlueStore (Ceph OSD backend)
- Cephadm (Ceph deployment tool)

## Sources Consulted
- Ceph official documentation — Configuring Ceph: https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/
- Ceph official documentation — Pool, PG and CRUSH Config Reference: https://docs.ceph.com/en/reef/rados/configuration/pool-pg-config-ref/
- Ceph official documentation — BlueStore Config Reference: https://docs.ceph.com/en/quincy/rados/configuration/bluestore-config-ref/
- Ceph official documentation — OSD Config Reference: https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/
- Ceph official documentation — Monitor/OSD Interaction: https://docs.ceph.com/en/latest/rados/configuration/mon-osd-interaction/
- Ceph official documentation — Logging and Debugging: https://docs.ceph.com/en/latest/rados/troubleshooting/log-and-debug/
- Ceph blog — New in Mimic: Centralized Configuration Management: https://ceph.io/en/news/blog/2018/new-mimic-centralized-configuration-management/
- Ceph official documentation — Cephadm OSD Service: https://docs.ceph.com/en/reef/cephadm/services/osd/

## Issues Found

1. **Centralized config version attribution (line 13)**: The post stated centralized config management was introduced in "Nautilus+". It was actually introduced in **Mimic** (v13.x, 2018). Changed "Nautilus+" to "Mimic+".

2. **osd_recovery_sleep unit error (line 74)**: The comment described the unit as "(ms)" (milliseconds), but `osd_recovery_sleep` is measured in **seconds** (as a float). For example, the HDD-specific variant `osd_recovery_sleep_hdd` defaults to 0.1 seconds. Changed comment to "(seconds, float)".

3. **osd_heartbeat_min_peers wrong description and value (line 105-106)**: The post described this as "Number of failed heartbeats before reporting down" with value 3. This is incorrect. `osd_heartbeat_min_peers` specifies the **minimum number of peer OSDs to heartbeat with**, and the default is **10**, not 3. Fixed both the description and value.

4. **Legacy injectargs syntax (line 122)**: The post used `ceph tell osd.5 injectargs --debug_osd 10`, which is the legacy approach. Modern Ceph documentation recommends `ceph tell osd.5 config set debug_osd 10`. Updated to the modern syntax.

## Review Notes
- `osd_recovery_max_active` defaults to 0 in modern Ceph (Pacific+), which auto-delegates to `osd_recovery_max_active_hdd` (3) and `osd_recovery_max_active_ssd` (10). The post's example value of 3 is valid but will override SSD-specific defaults. Not changed since it is presented as an example configuration, not a claim about the default.
- `osd_recovery_sleep` similarly delegates to HDD/SSD-specific variants in modern Ceph (`osd_recovery_sleep_hdd` defaults to 0.1s, `osd_recovery_sleep_ssd` defaults to 0). The post's value of 0 is valid but overrides the HDD default.
- `osd_pool_default_min_size` actual Ceph default is 0 (auto-calculated as `size - size/2`), which yields 2 when size=3. The post's value of 2 is functionally equivalent and a reasonable explicit setting.
- The `log_file` example uses a single path `/var/log/ceph/ceph.log` for all daemons, whereas the Ceph default pattern is `/var/log/ceph/$cluster-$name.log` (per-daemon). The example is valid but users should be aware that per-daemon log files are the norm in production.
