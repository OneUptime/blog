# Validation Summary: How to Plan Network Bandwidth for Ceph Cluster

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Python 3 (bandwidth calculation scripts)
- Prometheus (alerting rules for network saturation)
- node_exporter (Prometheus metrics source)
- sysstat / sar (Linux network monitoring)
- Bash (shell scripting and heredocs)

## Sources Consulted
- Ceph official documentation on perf counters: https://docs.ceph.com/en/reef/dev/perf_counters/
- Ceph network configuration documentation: https://docs.ceph.com/en/reef/rados/configuration/network-config-ref/
- Prometheus node_exporter metrics reference (node_network_transmit_bytes_total, node_network_speed_bytes)
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- sysstat/sar man page for `-n DEV` output fields including `%ifutil`

## Issues Found
1. **Incorrect Ceph OSD perf dump grep pattern**: The command `ceph daemon osd.0 perf dump | python3 -m json.tool | grep -E "bytes_sent|bytes_recv"` used non-existent counter names. In modern Ceph (Quincy, Reef), the messenger byte counters are named `msgr_send_bytes` and `msgr_recv_bytes`, not `bytes_sent` and `bytes_recv`. Fixed the grep pattern to `grep -E "msgr_send_bytes|msgr_recv_bytes"`.

## Review Notes
- All Python calculation scripts are mathematically correct and produce the expected output.
- The four Ceph network traffic types (client I/O, replication, recovery, heartbeats/metadata) are accurately described and correctly mapped to public vs. cluster networks.
- The replication traffic formula (client_writes x (replica_factor - 1)) is correct for replicated pools.
- The Prometheus alerting rule uses valid metric names (`node_network_transmit_bytes_total` and `node_network_speed_bytes`) and the `humanizePercentage` template function is correctly applied to the 0-1 ratio value.
- The `sar -n DEV` command relies on the `%ifutil` field (available in sysstat 10.1.1+, released 2012), which is present on all modern Linux distributions.
- The Prometheus alert only monitors transmit bytes, not receive bytes. For comprehensive cluster network monitoring, both directions should be checked, but this is acceptable for a simplified example.
- The network sizing recommendation table aligns with Ceph community best practices for production deployments.
- Ceph Reef has introduced `counter dump` as a replacement for `perf dump`, though the latter still works. This is not an error but a future deprecation note.
