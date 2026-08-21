# Validation Summary: Verify Linux Forwarding Before Blaming Flannel

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Kubernetes pod and Service networking
- Flannel v0.28.9, including VXLAN, host-gw, WireGuard, iptables mode, and experimental native nftables mode
- Linux bridge netfilter (`br_netfilter`)
- IPv4 and IPv6 forwarding sysctls
- iptables, ip6tables, xtables-nft compatibility, and nftables
- firewalld
- Linux reverse-path filtering (`rp_filter`)
- kubectl JSONPath and `kubectl exec`
- tcpdump and Linux route inspection

## Sources Consulted
- Flannel v0.28.9 release: https://github.com/flannel-io/flannel/releases/tag/v0.28.9
- Flannel README (`br_netfilter` and kubeadm 1.30 note): https://github.com/flannel-io/flannel/blob/v0.28.9/README.md
- Flannel configuration (`EnableNFTables` and `--iptables-forward-rules`): https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/configuration.md
- Flannel startup and traffic-manager selection source: https://github.com/flannel-io/flannel/blob/v0.28.9/main.go
- Flannel iptables traffic-manager source: https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/trafficmngr/iptables/iptables.go
- Flannel native nftables traffic-manager source: https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/trafficmngr/nftables/nftables.go
- Flannel backend defaults and Raspberry Pi VXLAN package note: https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/backends.md
- Flannel VXLAN interface implementation: https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/backend/vxlan/vxlan.go
- Upstream Flannel Kubernetes manifest and Helm templates: https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/kube-flannel.yml, https://github.com/flannel-io/flannel/blob/v0.28.9/chart/kube-flannel/templates/daemonset.yaml, https://github.com/flannel-io/flannel/blob/v0.28.9/chart/kube-flannel/templates/config.yaml
- Kubernetes commit removing kubeadm's bridge-netfilter preflight checks: https://github.com/kubernetes/kubernetes/commit/75238e592d624ad57cdf700c1bb42a8e5366bcb2
- Kubernetes container-runtime networking prerequisites: https://kubernetes.io/docs/setup/production-environment/container-runtimes/#enable-ipv4-packet-forwarding
- Kubernetes Service debugging and virtual-IP behavior: https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/, https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes kubectl JSONPath and exec references: https://kubernetes.io/docs/reference/kubectl/jsonpath/, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes safe node drain and DaemonSet behavior: https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/, https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Linux kernel bridge-netfilter, IP forwarding, and reverse-path-filtering documentation: https://docs.kernel.org/networking/bridge.html#netfilter, https://docs.kernel.org/networking/ip-sysctl.html
- RFC 3704, ingress filtering for multihomed networks: https://www.rfc-editor.org/rfc/rfc3704.html
- nftables reference manual: https://netfilter.org/projects/nftables/manpage.html
- iptables and xtables-nft manuals: https://man7.org/linux/man-pages/man8/iptables.8.html, https://man7.org/linux/man-pages/man8/xtables-nft.8.html
- procps `sysctl --system` precedence: https://man7.org/linux/man-pages/man8/sysctl.8.html
- systemd `modules-load.d` reference: https://man7.org/linux/man-pages/man5/modules-load.d.5.html
- firewalld concepts and command reference: https://firewalld.org/documentation/concepts.html, https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The diagnostic sequence referred only to a ClusterIP and inferred a Service-layer problem from generic direct Pod-IP connectivity. Kubernetes Service forwarding matches an IP, port, and protocol, while an ICMP ping does not prove that the backend `targetPort` is listening. The sequence now compares ready EndpointSlice backends at their target port with the Service's ClusterIP and port while keeping the protocol and application path consistent.
- The Flannel inspection commands hard-coded names that are correct for the upstream manifest and documented Helm installation but are not guaranteed for customized or distribution-managed installations. The post now scopes those names to the upstream defaults and tells readers to adjust them when necessary.
- The reverse-path-filtering check covered only the underlay interface. A VXLAN flow can also arrive on the tunnel interface after decapsulation, and Linux uses the maximum numeric `rp_filter` value from `conf/all` and the ingress interface. The command and explanation now require checking every actual ingress interface and explain why an interface value of `0` is ineffective while `all=1`.
- `lsmod` does not show functionality compiled directly into the kernel. The post now identifies the bridge-netfilter sysctl file as the direct functional signal and avoids treating an absent `lsmod` row as conclusive.
- `/etc/modules-load.d/*.conf` is a systemd boot mechanism rather than a universal Linux persistence interface. The persistence instruction is now explicitly scoped to systemd-based hosts.
- The packet-generation example assumed that the selected container includes `ping`. The post now states that prerequisite.
- Cordoning prevents new scheduling but does not evict existing workloads. The reboot verification step now directs readers to follow the cluster's safe drain and node-maintenance procedure.
- The Flannel startup wording could imply that the implementation validates the bridge sysctl value. It actually checks only for the applicable `/proc/sys/net/bridge/` file when native nftables mode is disabled. The post now calls this a startup presence check; its separate sysctl section correctly verifies that the value is `1` when required.

## Review Notes
- The review used Flannel v0.28.9, released on 2026-08-07, plus current master as of 2026-08-21. The files relevant to this post were unchanged between the release tag and reviewed master commit.
- Flannel's documented `EnableNFTables` default remains `false`, and native nftables mode remains marked experimental. The current startup presence check is correctly gated by `!EnableNFTables`.
- `--iptables-forward-rules` remains enabled by default. The current iptables manager creates `FLANNEL-FWD` source/destination accepts, and the selected native nftables manager creates equivalent accept rules in its own base chains.
- The statement that `nft -a` displays handles rather than adding counters is correct. Flannel's current native nftables forward rules contain no `counter` statement.
- The `cni0`, `flannel.1`, UDP 8472, and `flannel-v6.<VNI>` examples are correct for the qualified default Linux bridge plus VXLAN setup. The post appropriately tells readers to adapt them for other backends and custom settings.
- The iptables, nft, sysctl, kubectl, iproute2, tcpdump, and firewalld commands were checked for current syntax. The external links in the post resolve to the intended official documentation.
