# Validation Summary: How to Create a Ceph Pre-Production Checklist

## Status
validated

## Post Type
Guide / Checklist

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- CRUSH map (Ceph placement algorithm)
- CephX (Ceph authentication)
- BlueStore (Ceph OSD backend)
- Prometheus / Grafana (monitoring)
- chrony / NTP (time synchronization)

## Sources Consulted
- Ceph Monitor Configuration Reference (Quincy): https://docs.ceph.com/en/quincy/rados/configuration/mon-config-ref/
- Ceph Hardware Recommendations (Reef): https://docs.ceph.com/en/reef/start/hardware-recommendations/
- Ceph Network Configuration Reference: https://docs.ceph.com/en/pacific/rados/configuration/network-config-ref/
- Ceph Placement Groups / Autoscaling (Reef): https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph CRUSH Map Editing: https://docs.ceph.com/en/latest/rados/operations/crush-map-edits/
- Ceph Pools Documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Red Hat Ceph Storage Firewall Ports: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/6/html/configuration_guide/config-ceph-firewall-ports_conf
- ceph(8) man page (Reef): https://docs.ceph.com/en/reef/man/8/ceph/

## Issues Found

### 1. NTP clock skew tolerance too permissive
- **What was wrong:** The checklist stated "max 1 second skew" for NTP synchronization.
- **What was changed:** Changed to "max 50 ms skew".
- **Why:** Ceph's `mon_clock_drift_allowed` defaults to 0.05 seconds (50 ms). Exceeding this triggers `HEALTH_WARN` with `MON_CLOCK_SKEW`. A 1-second tolerance is 20x too permissive and would cause health warnings in production.

### 2. RAM recommendations were inaccurate
- **What was wrong:** The checklist stated "at least 16 GB per OSD node, 8 GB per MON".
- **What was changed:** Changed to "at least 5 GB per OSD daemon (osd_memory_target defaults to 4 GB), 32 GB per MON".
- **Why:** RAM requirements should be expressed per OSD daemon, not per node, since nodes can host varying numbers of OSDs. The `osd_memory_target` defaults to 4 GB per OSD daemon; 5 GB per daemon accounts for overhead. A node with 10 OSDs would need ~50 GB, not 16 GB. Monitor RAM of 8 GB is far too low for production clusters; 32 GB is the minimum recommended for small production clusters.

### 3. PG count guidance was outdated
- **What was wrong:** The checklist only mentioned the manual PG formula `(OSDs * 100) / replica_count`.
- **What was changed:** Added mention that PG autoscaler is the recommended approach (default since Nautilus), with the manual formula as a fallback.
- **Why:** PG autoscaling has been enabled by default since Ceph Nautilus (14.x) and is the officially recommended approach. The manual formula is still valid but should not be presented as the primary method.

## Review Notes
- The `ping -c 1000 -i 0.01` command for packet loss testing requires root privileges on Linux (intervals below 0.2s need elevated permissions). This works in a pre-production context where the operator likely has root, but could be noted.
- The checklist covers Ceph ports 3300, 6789, 6800-7300 which is correct. If RGW is in use, port 7480 (default RGW port) should also be opened.
- All CLI commands (`ceph osd crush tree`, `ceph osd crush rule dump`, `ceph osd getcrushmap`, `crushtool -d`, `ceph osd pool ls detail`, `ceph osd pool get rbd all`) were verified as syntactically correct and current.
- The checklist items for security, monitoring, and backup/recovery are all sound best practices.
