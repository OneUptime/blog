# Validation Summary: How to Monitor GRE Tunnel Interface Status

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GRE (Generic Routing Encapsulation) tunnels on Linux
- iproute2 (`ip link`, `ip addr`, `ip route`, `ip monitor`, `ip -s link`)
- ping (iputils)
- Prometheus / node_exporter
- Bash scripting

## Sources Consulted
- iproute2 manpages (ip-link(8), ip-monitor(8), ip-address(8))
- iputils ping(8) manpage for `-c` count and `-W` timeout flags
- Linux kernel documentation on GRE tunnels and operstate behavior
- RFC 2784 (Generic Routing Encapsulation) and RFC 2890 (Key and Sequence Number Extensions to GRE)
- Prometheus node_exporter source and metric documentation (https://github.com/prometheus/node_exporter)
- Prometheus alerting rules documentation (https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)

## Issues Found
No technical issues found.

Verified:
- Default GRE MTU of 1476 is correct (1500 MTU - 20-byte IPv4 header - 4-byte GRE header).
- `state UNKNOWN` is the documented normal state for GRE tunnel interfaces because virtual tunnels do not implement carrier detection.
- Flags `<POINTOPOINT,NOARP,UP,LOWER_UP>` are accurate for an active GRE tunnel.
- `ip -s link show` output column layout (RX: bytes/packets/errors/dropped/overrun/mcast and TX: bytes/packets/errors/dropped/carrier/collsns) matches actual output.
- `ip monitor link` is a valid command and the filtering pattern works.
- node_exporter metric names (`node_network_up`, `node_network_receive_bytes_total`, `node_network_transmit_bytes_total`, `node_network_receive_drop_total`) all exist.
- Prometheus alert rule YAML syntax is valid.
- ping flags `-c10` (count) and `-W2` (response timeout in seconds) are valid in iputils ping.
- Bash script logic for state checking and packet loss extraction is correct.

## Review Notes
- The `node_network_up` metric in node_exporter is computed from the kernel's `operstate` (returns 1 when operstate is "up", 0 otherwise). Because GRE tunnels report operstate as "unknown" rather than "up", `node_network_up{device="gre1"}` may report 0 even when the tunnel is functional on some systems/kernel versions. The combined approach in the post (interface state + inner-IP ping) mitigates this, but readers using only the Prometheus alert may see false positives. An alternative is to alert on metric absence (`absent(node_network_receive_bytes_total{device="gre1"})`) or to use `node_network_flags` and check the UP bit.
- The post focuses on IPv4 GRE; IPv6 GRE (ip6gre) interfaces behave similarly but use different default MTU calculations.
- The monitoring script's `grep -c "LOWER_UP"` approach is functional but relies on the flag being on a single line; this matches current iproute2 output format.
