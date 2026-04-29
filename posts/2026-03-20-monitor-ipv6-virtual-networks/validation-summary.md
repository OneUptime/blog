# Validation Summary: How to Monitor IPv6 Traffic in Virtual Networks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 (NDP, DHCPv6, ICMPv6)
- KVM/QEMU + libvirt (`virsh`, vnet/tap interfaces)
- Linux iproute2 (`ip`, NDP states)
- Open vSwitch (`ovs-ofctl`, `ovs-vsctl`, sFlow, NetFlow)
- VMware vSphere Distributed Switch (port mirroring)
- tcpdump (BPF filters for ICMPv6/DHCPv6/IPv6)
- Wireshark (remote capture pipeline)
- Prometheus (`prometheus_client` Python library, alert rules)
- Grafana (dashboard panels)
- Kea DHCP (Control Agent REST API, `lease6-get-all`)

## Sources Consulted
- Kea ARM (Control Agent): https://kea.readthedocs.io/en/latest/arm/agent.html
- Kea hooks (`lease6-get-all`): https://kea.readthedocs.io/en/latest/arm/hooks.html
- ovs-vswitchd.conf.db(5) — sFlow / NetFlow tables: https://www.openvswitch.org/support/dist-docs/ovs-vswitchd.conf.db.5.txt
- IANA ICMPv6 Type Numbers (133–136 NDP): https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml
- IANA Service Name and Port Number Registry (DHCPv6 546/547): https://www.iana.org/assignments/service-names-port-numbers/
- libvirt `virsh` man page (`domiflist`): https://libvirt.org/manpages/virsh.html
- ip(8) man page (`-6`, `-s`, `link show`): https://man7.org/linux/man-pages/man8/ip.8.html
- Prometheus naming conventions (`_total` suffix on Counters): https://prometheus.io/docs/practices/naming/
- RFC 8415 (DHCPv6)

## Issues Found

1. **Kea Control Agent default port wrong (8080 → 8000).** The `collect_dhcpv6_leases()` function POSTed to `http://localhost:8080/`, but Kea's documented default Control Agent endpoint is `http://127.0.0.1:8000/`. Updated to `8000`.

2. **`_total` suffix on Gauge metrics.** `vnet_ipv6_rx_bytes_total` and `vnet_ipv6_tx_bytes_total` were declared as `Gauge` instances. Prometheus naming convention reserves the `_total` suffix for accumulating Counter metrics. Renamed both Gauges to `vnet_ipv6_rx_bytes` / `vnet_ipv6_tx_bytes`, and updated all downstream references in the alert rule and the Grafana dashboard queries (including the `IPv6 vs IPv4 traffic ratio` query that referenced `vnet_rx_bytes_total`, now `vnet_rx_bytes`).

3. **Alert expression `rate(vnet_ipv6_rx_bytes_total[5m]) == 0` no longer made sense once the metric was renamed and is a `Gauge` set to an absolute byte count.** Changed to `delta(vnet_ipv6_rx_bytes[5m]) == 0`, which correctly detects "no change in cumulative bytes over 5 minutes" for a Gauge that holds an absolute counter value sourced from the kernel.

4. **OVS sFlow / NetFlow IPv6 collector targets in bracket form.** The post used `target='"[2001:db8::monitor]:6343"'` and `targets='"[2001:db8::collector]:2055"'`. The ovs-vswitchd.conf.db(5) schema documents NetFlow `targets` as `ip:port` with "ip must be specified numerically", and the sFlow `target` column uses the same `ip:port` form. No bracketed IPv6 syntax is documented for either column, and all upstream examples are IPv4. Replaced both with IPv4 collector addresses (`10.0.0.10:6343`, `10.0.0.20:2055`) and clarified in the comments that IPv6 traffic is still sampled / exported — only the collector transport is IPv4.

5. **`ip -s -6 link show` — `-6` is misleading at L2.** The `-6` flag is a shortcut for `-family inet6`, which is meaningless at the link layer (RX/TX byte counters in `ip -s link` are aggregate, not per-family). Removed `-6` from the `subprocess.run` call. The metric is now correctly understood as the per-vnet-interface aggregate counter, which is consistent with how `ip -s link show` actually behaves on Linux.

## Review Notes

- The Counter import from `prometheus_client` is unused but harmless; left as-is to preserve author style.
- The collector exposes `dhcpv6_active_leases` but the alert rule references `dhcpv6_pool_size`, which is not produced by this collector. The post implicitly assumes a separate exporter publishes pool size. This is a design observation, not a technical error, so it was not changed.
- Parsing `ip -s link show` line-by-line is brittle because RX/TX byte values appear on the line *after* the `RX:`/`TX:` header. The current regex `r'RX:.*?(\d+)'` will not actually match the value line, so this collector under-reports in practice. Consider switching to `ip -s -j link show` (JSON) or `/proc/net/dev` in a follow-up. Left unchanged because fixing the parsing model is out of scope for technical-correctness review and risks restructuring the post.
- The Gauge-vs-Counter modelling for monotonic kernel counters is also a design choice; using a `Counter` with a derived delta would be more idiomatic but requires more bookkeeping. The current `Gauge.set(absolute_value)` pattern is acceptable now that `_total` is removed.
- ICMPv6 NDP filter only covers types 133–136 (RS/RA/NS/NA); Redirect (137) and Inverse ND (141/142) are excluded. This is a deliberate, common simplification, not an error.
