# Validation Summary: Run Flannel With firewalld and nftables

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- kube-proxy
- Flannel
- VXLAN, host-gw, WireGuard, and UDP networking backends
- firewalld zones and policies
- nftables and iptables/xtables-nft
- Linux routing, forwarding, packet capture, and network address translation
- Kubernetes NetworkPolicy

## Sources Consulted
- Flannel v0.28.9 release: https://github.com/flannel-io/flannel/releases/tag/v0.28.9
- Flannel configuration, command-line defaults, masquerading, and experimental nftables mode: https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/configuration.md
- Flannel backend requirements and ports: https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/backends.md
- Flannel upstream DaemonSet and ConfigMap manifest: https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/kube-flannel.yml
- Flannel iptables forwarding and resynchronization implementation: https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/trafficmngr/iptables/iptables.go
- Flannel nftables forwarding and masquerading implementation: https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/trafficmngr/nftables/nftables.go
- Flannel NetworkPolicy integration documentation: https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/netpol.md
- firewalld concepts for zones, policies, stateful replies, and inter-zone forwarding: https://firewalld.org/documentation/concepts.html
- firewalld policy semantics and symbolic zones: https://firewalld.org/documentation/man-pages/firewalld.policies.html
- firewalld policy file format: https://firewalld.org/documentation/man-pages/firewalld.policy.html
- Current `firewall-cmd` options: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld v2.5.1 CLI source: https://github.com/firewalld/firewalld/blob/v2.5.1/src/firewall-cmd.in
- firewalld backend, `FlushAllOnReload`, `ReloadPolicy`, and `LogDenied` defaults: https://firewalld.org/documentation/man-pages/firewalld.conf.html
- firewalld rich-rule grammar: https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html
- firewalld nftables backend table isolation: https://firewalld.org/2018/07/nftables-backend
- Kubernetes Service proxy modes and IPVS deprecation: https://kubernetes.io/docs/reference/networking/virtual-ips/#proxy-modes
- Kubernetes kube-proxy configuration API: https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- kubeadm's kube-proxy DaemonSet and ConfigMap layout: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-reconfigure/
- Linux packet-socket capture behavior: https://man7.org/linux/man-pages/man7/packet.7.html
- nftables packet-flow hooks: https://netfilter.org/projects/nftables/manpage.html
- Linux VXLAN documentation: https://docs.kernel.org/networking/vxlan.html
- Linux IP forwarding and reverse-path filtering sysctls: https://docs.kernel.org/networking/ip-sysctl.html
- VXLAN protocol specification, RFC 7348: https://www.rfc-editor.org/rfc/rfc7348.html
- xtables-nft compatibility tools: https://man7.org/linux/man-pages/man8/xtables-nft.8.html
- systemd `journalctl` kernel-log selection: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html

## Issues Found
- The kube-proxy mode list did not mention that IPVS proxy mode is deprecated. I qualified `ipvs` as deprecated as of Kubernetes v1.35; it remains an available mode, while nftables is the recommended replacement.
- The kube-proxy DaemonSet, ConfigMap, and `data.config.conf` commands were presented as distribution-independent. Those object names and that key are the kubeadm-managed layout, so I scoped the commands to kubeadm and noted that other distributions may package kube-proxy differently.
- Inspecting only the upstream Flannel DaemonSet arguments can hide the effective forwarding behavior because `--iptables-forward-rules` defaults to `true` even when the flag is absent. I documented that default and the resulting source/destination Flannel-network ACCEPT rules so the forwarding ownership discussion is complete.
- The host-gw backend requirement was described only as direct node routing. I changed it to the documented requirement of direct Layer 2 connectivity between nodes.
- The `ANY` firewalld symbolic zone was described without its exclusion of `HOST`. I clarified that the example policy does not cover Pod-to-node connections and that those require separately reviewed input rules or a policy whose egress zone is `HOST`.
- The reload paragraph conflated replacement of firewalld runtime configuration with rules owned by other nftables tables, and it implied every Flannel rule manager periodically reconciles. I clarified firewalld's runtime/permanent behavior, the `FlushAllOnReload=yes` effect, nftables table isolation, Flannel's five-second iptables resync default, and the absence of that periodic resync in current Flannel nftables mode.
- The tracing section treated the firewalld service journal as a packet-drop log. I added a `LogDenied` status check, distinguished daemon/configuration messages from kernel packet-denial messages, and added the kernel journal command.
- The packet-capture interpretation incorrectly listed a node INPUT rule as a reason an outer VXLAN packet would be absent from underlay `tcpdump`. Linux packet sockets see the packet before the INPUT firewall hook, so I moved node-input inspection to the case where the outer packet is visible but is not decapsulated or forwarded.

## Review Notes
- The remaining commands, JSONPath expressions, rich rule, zone and policy operations, backend ports, masquerading description, and NetworkPolicy explanation are correct against Flannel v0.28.9, firewalld v2.5.1, and the Kubernetes v1.36 documentation current on the validation date.
- The forwarding example is IPv4-specific and assumes kernel forwarding is already enabled on the Kubernetes node. A troubleshooting run should also verify `net.ipv4.ip_forward`; dual-stack deployments need equivalent IPv6 review.
- Flannel still marks `EnableNFTables` experimental and defaults it to `false`. Its behavior should continue to be checked against the exact deployed Flannel release.
