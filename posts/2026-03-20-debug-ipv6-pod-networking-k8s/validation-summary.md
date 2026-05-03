# Validation Summary: How to Debug IPv6 Pod Networking Issues in Kubernetes

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Kubernetes (kubectl, dual-stack networking, podIPs API)
- IPv6 (addressing, ICMPv6, neighbor discovery)
- Linux networking tools (`ip`, `ip6tables`, `tcpdump`, `ping6`, `nslookup`)
- CNI (Container Network Interface) configuration
- Calico CNI (calico-node binary, FelixConfiguration CRD, BIRD BGP daemon)
- Cilium CNI (`cilium status`)
- systemd / journalctl (kubelet log inspection)
- Mermaid (for the diagnostic flowchart)

## Sources Consulted
- Kubernetes dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes Pod API reference (`status.podIPs` field): https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/
- CNI specification — config file extensions (`.conf`, `.conflist`, `.json`): https://github.com/containernetworking/cni/blob/main/SPEC.md
- Calico documentation — `calico-node` liveness/readiness flags (`-bird-ready`, `-bird6-ready`, `-felix-ready`): https://docs.tigera.io/calico/latest/reference/component-resources/node/configuration
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Cilium CLI reference (`cilium status`): https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status/
- iptables/ip6tables man pages (`-L`, `-n`, `-v`, `-t nat` flags)
- iproute2 man pages (`ip -6 addr`, `ip -6 route show`, `ip -6 route get`)
- tcpdump filter expression for `icmp6`: https://www.tcpdump.org/manpages/pcap-filter.7.html
- RFC 4861 (Neighbor Discovery for IPv6) — ICMPv6 replacing ARP

## Issues Found
1. **CNI config file glob missed `.conflist` files.** The original command `cat /etc/cni/net.d/*.conf` would not match modern CNI configurations, which use the `.conflist` extension (Calico's `10-calico.conflist`, Flannel's `10-flannel.conflist`, Cilium's `05-cilium.conflist`, etc.). The CNI specification and kubelet both load `.conf`, `.conflist`, and `.json` files. Updated the command to explicitly include `*.conflist` and `*.conf`, with `2>/dev/null` to suppress errors when one extension is absent.

## Review Notes
- `ping6` is technically deprecated on most modern Linux distributions in favor of `ping -6` (the `iputils` package symlinks `ping6` to `ping`), but `ping6` continues to work everywhere it has historically been available and is still the more recognizable command in troubleshooting docs. Left as-is.
- The `calico-system` namespace is correct for Calico installed via the Tigera operator (the current recommended install path). Older manifest-based installs place calico-node in `kube-system`. The post's guidance is correct for modern installs.
- The `calico-node -bird6-ready` flag is the correct readiness probe for the IPv6 BGP (BIRD6) daemon, matching the upstream Calico liveness/readiness probe definitions.
- `kubectl get pod ... -o jsonpath='{.status.podIPs}'` is the correct API field for retrieving multiple pod IPs in dual-stack clusters (introduced as GA in Kubernetes 1.20).
- The diagnostic flow (Mermaid) is logically sound and mirrors the order of the steps below it.
- No specific Kubernetes/CNI versions are pinned in the post, so no version-specific caveats apply.
