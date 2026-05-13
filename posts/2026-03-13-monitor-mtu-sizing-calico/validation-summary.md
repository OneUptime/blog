# Validation Summary: Monitor MTU Sizing in Calico

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Calico (v3.27+) — CNI plugin
- Kubernetes (kubectl, FelixConfiguration, DaemonSet)
- calicoctl
- Linux networking (MTU, VXLAN, IPIP, WireGuard encapsulation)
- Prometheus / PrometheusRule (alerting)
- netshoot (debug container image)
- iperf3 (throughput testing)
- tcpdump, tracepath (network diagnostics)
- Python `socket` module

## Sources Consulted
- Calico MTU configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico install-options documentation (namespace layout): https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/config-options
- Python 3 `socket` module documentation: https://docs.python.org/3/library/socket.html
- Linux `ip(7)` manual page (IP_MTU_DISCOVER, IP_PMTUDISC_DO): https://man7.org/linux/man-pages/man7/ip.7.html
- Cilium `config view` reference (for cross-check): https://docs.cilium.io/en/latest/cmdref/cilium_config_view/

## Issues Found

1. **`cilium config view` in a Calico-only step (Step 1).** The original code began with `cilium config view 2>/dev/null || kubectl get configmap calico-config -n kube-system -o yaml | grep "^  veth_mtu"`. `cilium config view` is a real Cilium CLI command, but it has zero relevance to a Calico cluster and reads Cilium's ConfigMap, not Calico's. This was copy-paste contamination from a Cilium post. **Fix:** removed the `cilium config view` fallback and kept only the kubectl call.

2. **Namespace inconsistency between Step 1 and Step 2.** Step 1 originally queried `calico-config` in `kube-system` (legacy manifest install), while Step 2 restarts `calico-node` in `calico-system` (operator install). No single install method produces this layout. **Fix:** changed Step 1 to read `calico-config` from `calico-system` so both steps consistently match the operator install (which is the modern recommended path and is what Step 2 already uses).

3. **`socket.IP_DONTFRAG` is BSD-only and will raise `AttributeError` on Linux (Step 5).** Python only exposes `socket.IP_DONTFRAG` on FreeBSD (added in Python 3.12). The example runs in a Linux container (`netshoot`), so the original script would crash before sending anything. **Fix:** replaced the option with the Linux-correct equivalent: `s.setsockopt(socket.IPPROTO_IP, socket.IP_MTU_DISCOVER, socket.IP_PMTUDISC_DO)`. Also removed the unused `time` import that came with the original snippet.

## Review Notes
- The encapsulation overhead numbers (VXLAN 50, IPIP 20, WireGuard 60, no-encap 0) are correct for IPv4 per Calico's MTU documentation. The post does not call out IPv6 overheads (VXLANv6 70, WireGuardV6 80) or the corresponding `vxlanMTUV6` / `wireguardMTUV6` FelixConfiguration fields — adding those would make the guide more complete but is not a correctness issue for the IPv4-focused content as written.
- `felix_int_dataplane_failures_total` is the correct Prometheus-exposed name for the Felix `felix_int_dataplane_failures` counter (Prometheus client libraries append `_total` to counters). Valid metric.
- The `HighPacketFragmentation` alert uses the packets/bytes ratio as a proxy for small packets. The chosen threshold (`> 0.01`, i.e., average packet size below ~100 bytes) is reasonable as a coarse heuristic but will be noisy on workloads with naturally small UDP traffic. Worth tuning per cluster in production.
- The `kubectl get pod -A -o name | head -1 | sed ... | cut ...` one-liners in Steps 1 and 5 strip the `pod/` prefix but cannot recover the namespace (since `-o name` drops it), so the resulting `kubectl exec` will only succeed if the pod happens to be in the `default` namespace. These are illustrative one-liners and the surrounding text directs readers to substitute `<any-pod>`, so I did not rewrite them, but readers should be aware.
- Calico v3.27 was released in early 2024; as of 2026-05-13 it is supported but no longer the latest. The post's instructions remain accurate for newer Calico releases (v3.28+) as the FelixConfiguration MTU fields have not changed.
