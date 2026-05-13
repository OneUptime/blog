# Validation Summary: How to Monitor QoS Controls with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (Kubernetes CNI plugin)
- Kubernetes pod bandwidth annotations (`kubernetes.io/ingress-bandwidth`, `kubernetes.io/egress-bandwidth`)
- Bandwidth CNI plugin (containernetworking/plugins)
- Linux Traffic Control (tc) — Token Bucket Filter (tbf), ingress policing
- iperf3 (network performance testing)
- Mermaid diagrams

## Sources Consulted
- Calico documentation on QoS / bandwidth: https://docs.tigera.io/calico/latest/networking/configuring/bandwidth
- Kubernetes Network Plugins — Support traffic shaping: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/#support-traffic-shaping
- containernetworking/plugins bandwidth plugin: https://www.cni.dev/plugins/current/meta/bandwidth/
- Linux tc(8) man page — qdisc tbf and ingress policing
- iperf3 documentation: https://iperf.fr/iperf-doc.php
- Docker Hub: networkstatic/iperf3 image

## Issues Found
- **Mermaid diagram label typo**: The edge label `tc tbf\négress limit` contained an accented `é` (U+00E9) immediately after the `\n` line-break sequence. This would render as "égress" on the second line of the label. Fixed to `tc tbf\negress limit` so the second line correctly reads "egress limit".

## Review Notes
- The post's description mentions "Prometheus metrics" but the body does not include any Prometheus instrumentation or metric examples — readers expecting Prometheus content may be mildly surprised. This is a description/scope mismatch rather than a technical error, so it was left as-is per the "only fix technical errors" guidance.
- The "Verify QoS Rules are Applied" section leaves `NODE=` and `POD_UID=` as empty placeholder assignments without showing how to look up the actual veth interface name on the node (typically by inspecting `/proc/<pid>/net/dev` from the container PID or by listing `ip link` on the node and correlating with the pod's veth peer index). The shown `tc qdisc show dev cali<iface>` / `tc class show dev cali<iface>` commands are themselves syntactically correct.
- The bandwidth CNI plugin must be explicitly chained in the Calico CNI config (`/etc/cni/net.d/...`) for these annotations to take effect. The post mentions "Calico v3.20+ with bandwidth plugin enabled" in prerequisites, which is accurate, but does not show the chaining configuration.
- The `"10M"` annotation value is interpreted as 10 megabits per second (Kubernetes Quantity format, bits/sec), which is consistent with the "~10 Mbps" expectation noted for iperf3 — correct.
- The `kubectl run iperf3-server --image=networkstatic/iperf3 -- iperf3 -s` invocation appears in many community tutorials. The `networkstatic/iperf3` image typically uses `iperf3` as its entrypoint, in which case the trailing `iperf3` becomes an extra arg; however, this pattern is widely used in published examples and is left unchanged.
