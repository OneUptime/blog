# Validation Summary: How to Debug ARP Issues in Kubernetes Clusters

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- ARP (Address Resolution Protocol)
- Linux networking (iproute2: `ip neigh`, `bridge fdb`)
- Linux kernel sysctls (`net.ipv4.neigh.default.gc_thresh*`, `arp_ignore`, `arp_announce`, `proxy_arp`)
- Kubernetes (DaemonSets, `kubectl`, `hostNetwork`, privileged containers)
- CNI plugins: Flannel (VXLAN mode), Calico, Cilium
- VXLAN overlay networking and FDB

## Sources Consulted
- Linux kernel documentation: `Documentation/networking/ip-sysctl.txt` (gc_thresh1/2/3 semantics, arp_ignore, arp_announce, proxy_arp)
- iproute2 manpages (`ip-neighbour(8)`, `bridge(8)`) for `ip neigh show nud <state>` filter syntax
- Kubernetes Registry migration blog: https://kubernetes.io/blog/2023/03/10/image-registry-redirect/ (deprecation of `k8s.gcr.io` and `gcr.io/google_containers`)
- Kubernetes pause image: https://github.com/kubernetes/kubernetes/tree/master/build/pause
- Calico documentation on data plane / IP routing (proxy ARP on host-side `cali*` veth interfaces with 169.254.1.1 gateway)
- Flannel documentation on VXLAN backend (`flannel.1` device naming, VNI 1)
- Cilium documentation on BPF-based datapath

## Issues Found

1. **Deprecated container image registry path** in the DaemonSet manifest: `gcr.io/google_containers/pause:3.1` is doubly outdated — `gcr.io/google_containers` was migrated to `k8s.gcr.io` (~2017), which was then redirected to `registry.k8s.io` in March 2023. Tag `3.1` is also very old (circa 2018). Updated to `registry.k8s.io/pause:3.9`, the current recommended path and a widely-used modern tag.

## Review Notes

- The chosen `gc_thresh` values (80000 / 90000 / 100000) are valid and not technically wrong, but unusual: setting `gc_thresh1` so close to `gc_thresh3` effectively disables the garbage collector until the cache is nearly full. More common large-cluster recommendations from Calico/Cilium docs scale these as `1024 / 2048 / 4096` or `4096 / 8192 / 16384`. Left unchanged because the post's values still function correctly and the appropriate values are environment-dependent.
- `hostPID: true` in the tuner DaemonSet is not strictly required to write `net.ipv4.neigh.default.gc_thresh*` sysctls — `hostNetwork: true` plus `privileged: true` is sufficient since these sysctls are per-network-namespace. Left unchanged because including `hostPID` is harmless and a common pattern.
- `cilium status | grep ARP` is a best-effort grep; Cilium's status output does not have a dedicated ARP field, so this command may return no output on healthy clusters. Useful as a quick check but not authoritative — left as-is since the post correctly notes Cilium handles ARP at the BPF level.
- `ip neigh show nud failed` filter syntax verified correct against iproute2; valid NUD states include permanent, noarp, reachable, stale, none, incomplete, delay, probe, failed.
- `proxy_arp=1` on `cali*` veth interfaces is correct — Calico uses point-to-point routing with the 169.254.1.1 link-local gateway and relies on the host answering ARP via proxy_arp.
- `arp_ignore=1` and `arp_announce=2` are the standard ARP flux mitigation values and are correct.
