# Validation Summary: Debug Cross-Node Flannel VXLAN Traffic on UDP 8472

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes and `kubectl`
- Flannel v0.28.9 and the Linux VXLAN backend
- Linux VXLAN devices, routes, neighbor entries, and forwarding databases
- `iproute2`, `tcpdump`, kernel sysctls, checksum offload, and MTU diagnosis
- firewalld zones, rich rules, policies, and the kernel FORWARD path
- Kubernetes Service proxying and kube-proxy
- Cloud security groups and network ACLs

## Sources Consulted
- Flannel v0.28.9 release: https://github.com/flannel-io/flannel/releases/tag/v0.28.9
- Flannel v0.28.9 backend reference, including the Linux and Windows VXLAN defaults and `DirectRouting`: https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/backends.md
- Flannel v0.28.9 configuration reference, interface selection, MTU calculation, and `subnet.env`: https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/configuration.md
- Flannel v0.28.9 firewall, interface-selection, checksum, and MTU troubleshooting: https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/troubleshooting.md
- Flannel v0.28.9 Kubernetes manifest and its namespace, ConfigMap, DaemonSet, container, and labels: https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/kube-flannel.yml
- Flannel Kubernetes annotations for selecting and advertising node addresses: https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/kubernetes.md#annotations
- Current Flannel Linux VXLAN configuration and device naming source: https://github.com/flannel-io/flannel/blob/cdf760595c23292fd03ff4daf03638ac1ceef417/pkg/backend/vxlan/vxlan.go
- Current Flannel VXLAN route, neighbor, FDB, and `DirectRouting` implementation: https://github.com/flannel-io/flannel/blob/cdf760595c23292fd03ff4daf03638ac1ceef417/pkg/backend/vxlan/vxlan_network.go
- Current Flannel VXLAN device, ARP, and FDB implementation: https://github.com/flannel-io/flannel/blob/cdf760595c23292fd03ff4daf03638ac1ceef417/pkg/backend/vxlan/device.go
- Current Flannel interface and external-address selection logs: https://github.com/flannel-io/flannel/blob/cdf760595c23292fd03ff4daf03638ac1ceef417/pkg/ipmatch/match.go
- Current Flannel Windows VXLAN validation and defaults: https://github.com/flannel-io/flannel/blob/cdf760595c23292fd03ff4daf03638ac1ceef417/pkg/backend/vxlan/vxlan_windows.go
- Flannel CNI plugin delegation and `FLANNEL_MTU`: https://github.com/flannel-io/cni-plugin
- Linux kernel VXLAN documentation: https://docs.kernel.org/networking/vxlan.html
- Linux kernel IPv4 forwarding and reverse-path filtering sysctls: https://docs.kernel.org/networking/ip-sysctl.html
- `ip-link(8)`, `ip-route(8)`, `ip-neighbour(8)`, and `bridge(8)`: https://man7.org/linux/man-pages/man8/ip-link.8.html, https://man7.org/linux/man-pages/man8/ip-route.8.html, https://man7.org/linux/man-pages/man8/ip-neighbour.8.html, https://man7.org/linux/man-pages/man8/bridge.8.html
- `tcpdump(8)` and packet-filter syntax: https://man7.org/linux/man-pages/man8/tcpdump.8.html, https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `sysctl(8)` and dotted-interface path syntax: https://man7.org/linux/man-pages/man8/sysctl.8.html, https://man7.org/linux/man-pages/man5/sysctl.d.5.html
- firewalld command and rich-language references: https://firewalld.org/documentation/man-pages/firewall-cmd, https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html
- Kubernetes `kubectl get`, `logs`, and `exec` references: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes virtual IP and Service proxy documentation: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes cluster networking documentation: https://kubernetes.io/docs/concepts/cluster-administration/networking/
- systemd `journalctl` reference for kernel and boot filtering: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html

## Issues Found
- The test instructions allowed any ordinary pod even though the command requires both named Pods to be in `NS` and the selected client container to contain `ping`. Clarified those prerequisites; the existing application-port alternative remains valid.
- The DaemonSet log command selected only one Flannel Pod, which could inspect the wrong node, and its `public address` grep pattern did not match Flannel's current `external address` log messages. Added `--all-pods=true` and corrected the pattern.
- Route, neighbor, FDB, and packet-capture expectations assumed every remote peer used VXLAN. Documented that `DirectRouting=true` uses a direct route for an on-link peer, creates no VXLAN neighbor or FDB entry for that peer, and correctly produces no outer VXLAN packet.
- The route's synthetic next hop was called the remote subnet gateway, which could be confused with the remote CNI bridge gateway. Identified it precisely as the remote Pod CIDR base address used as the VXLAN route's synthetic next hop.
- Later packet-capture and firewalld examples hard-coded UDP 8472 despite the earlier instruction to inspect a configured `Port` override. Changed those commands to use `<vxlan-port>`, documented the default-device/default-port assumption, and made the conclusion refer to the configured port.
- ClusterIP and DNS checks were described as always adding kube-proxy. Kubernetes permits an alternative Service implementation, so the text now refers to Service proxying and identifies kube-proxy as the usual implementation.
- The dotted `sysctl net.ipv4.conf.<interface>.rp_filter` spelling fails for interface names that themselves contain a dot, such as VLAN interfaces. Changed the per-interface query to slash-separated sysctl syntax so dotted interface names remain intact.

## Review Notes
- Flannel v0.28.9, released on 2026-08-07, is the current stable release on the validation date. Current upstream master at commit `cdf7605` (2026-08-14) was also checked for post-release behavior.
- When no VXLAN `Port` is configured, Flannel's startup log reports `Port=0` because it delegates the choice to the kernel; `ip -d link show` exposes the effective Linux destination port, currently 8472.
- The upstream namespace, ConfigMap, DaemonSet, container, and default `flannel.1` device match the post. Distribution-managed and customized installations may use different object names, VNI values, interfaces, or ports.
- The walkthrough is IPv4-specific. Dual-stack or IPv6-only deployments require corresponding checks for `.spec.podCIDRs`, IPv6 addresses and routes, `flannel-v6.<VNI>`, and IPv6 firewall rules.
- All links in the post resolve to the intended current official documentation. The remaining commands, JSON and JSONPath expressions, packet filters, firewalld rich rule, forwarding guidance, checksum caveat, and MTU explanation are technically correct.
