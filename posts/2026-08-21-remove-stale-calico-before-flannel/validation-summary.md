# Validation Summary: Remove Stale Calico State Before Switching to Flannel

## Status

validated

## Post Type

Technical migration and troubleshooting guide

## Technologies Covered

- Kubernetes networking, node draining, Pod scheduling, kubelet, and Service proxies
- Calico CNI, Calico IPAM, host-local IPAM, Felix, operator-managed installations, and standard/eBPF data planes
- Flannel CNI, Kubernetes subnet manager, VXLAN, host-gw, and WireGuard backends
- Linux networking with iproute2, veth interfaces, routes, IPIP, VXLAN, iptables, nftables, and ipset
- CRI sandbox inspection with `crictl`
- Kubernetes NetworkPolicy

## Sources Consulted

- [Flannel installation and CNI requirements](https://github.com/flannel-io/flannel/blob/master/README.md)
- [Flannel backend reference](https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md)
- [Flannel Kubernetes integration](https://github.com/flannel-io/flannel/blob/master/Documentation/kubernetes.md)
- [Flannel configuration reference](https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md)
- [Flannel troubleshooting guide](https://github.com/flannel-io/flannel/blob/master/Documentation/troubleshooting.md)
- [Upstream Flannel Kubernetes manifest](https://github.com/flannel-io/flannel/blob/master/Documentation/kube-flannel.yml)
- [Flannel CNI plugin delegation](https://github.com/flannel-io/cni-plugin)
- [Calico IPAM behavior](https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses)
- [Calico CNI plugin configuration](https://docs.tigera.io/calico/latest/reference/configure-cni-plugins)
- [Calico eBPF data-plane enablement and reversal](https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf)
- [Calico Felix configuration](https://docs.tigera.io/calico/latest/reference/felix/configuration)
- [Calico Felix WireGuard cleanup implementation](https://github.com/projectcalico/calico/blob/master/felix/wireguard/wireguard.go)
- [Tigera migration-controller reversal procedure](https://docs.tigera.io/calico/latest/getting-started/kubernetes/flannel/migration-from-flannel#revert-migration)
- [Tigera operator installation-controller teardown implementation](https://github.com/tigera/operator/blob/master/pkg/controller/installation/core_controller.go)
- [Kubernetes cluster networking model](https://kubernetes.io/docs/concepts/cluster-administration/networking/)
- [Kubernetes node-drain procedure](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/) and [`kubectl drain` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/)
- [Kubernetes Pod node assignment](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/), [`kubectl run` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/), and [`kubectl wait` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)
- [Kubernetes network-plugin requirements](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/)
- [Kubernetes CRD deletion behavior](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/#delete-a-customresourcedefinition)
- [CNI host-local IPAM reference](https://www.cni.dev/plugins/current/ipam/host-local/#files) and [disk-backend implementation](https://github.com/containernetworking/plugins/blob/main/plugins/ipam/host-local/backend/disk/backend.go)
- [Official BusyBox container image](https://hub.docker.com/_/busybox)
- [Linux tunnel implementation](https://github.com/torvalds/linux/blob/master/net/ipv4/ip_tunnel.c) and [networking sysctl documentation](https://github.com/torvalds/linux/blob/master/Documentation/admin-guide/sysctl/net.rst)

## Issues Found

- The original sequence removed Calico before draining old-CNI workloads. It now requires draining all affected workloads while Calico CNI deletion calls can still succeed, then stopping Calico reconciliation before node-local cleanup.
- The uninstall advice could cause premature operator removal or cascading CRD deletion from a monolithic manifest. It now preserves CRDs, waits for operator-resource finalizers and managed-component teardown, and directs manifest installations to the release-specific removal flow.
- `kubectl drain --ignore-daemonsets` leaves DaemonSet pods, and the original sandbox check came after Calico removal. The guide now requires disabling or gating any remaining non-host-network owner and waiting for its sandbox deletion while kubelet and Calico CNI access still work, followed by a final runtime check before local cleanup.
- The host-local IPAM path was presented as fixed. It now explains that state is stored under `<dataDir>/<network-name>`, that `/var/lib/cni/networks` is only the default `dataDir`, and that both values must be confirmed from the old configuration.
- The original `ip link delete tunl0` command was incorrect because `tunl0` is the kernel IPIP fallback device rather than a Calico-owned tunnel. The command was removed and replaced with exact address/route cleanup or an applicable drained-node reboot procedure.
- Calico workload-interface discovery assumed an invariant `cali` prefix and printed peer suffixes, while `crictl pods` was implied to map veth devices to Pods. The guide now identifies the Felix-configurable prefix, strips peer suffixes, requires WorkloadEndpoint or network-namespace inspection for mapping, and covers WireGuard's configurable interface, policy rule, and routing table rather than deleting only a default-named device.
- The route example appeared after its interface had already been deleted. Route inspection and any exact deletion are now ordered before interface deletion, with an explanation that device deletion normally removes attached routes automatically.
- Netfilter inventory could miss orphaned state after an xtables backend change. The guide now calls out separate legacy, nft-backed xtables, native nftables, and ipset inventories when applicable.
- The Flannel prerequisite list treated `loopback` as an invariably external reference-plugin binary. It now reflects Kubernetes' allowance for the runtime to provide loopback internally or via the CNI loopback plugin.
- Flannel verification originally happened while kubelet was still stopped, so the DaemonSet could not install the CNI config or create backend state. The guide now accounts for an ungated DaemonSet, starts kubelet on the cleaned node, waits for both target-pod creation and readiness without a selector race, and only then verifies files and devices.
- The backend-device description assumed every Linux VXLAN setup uses `flannel.1` and described other backends imprecisely. It now ties the name to VNI 1, documents custom-VNI naming, and names the WireGuard devices separately.
- A single validation Pod could not test same-node Pod-to-Pod traffic, its fixed name would fail with `AlreadyExists` on the next node, and remote-node or cluster-service tests could run before their targets existed. The guide now creates two node-pinned Pods, waits for both, delays cross-node testing until two cleaned nodes are available, and removes all temporary targets. It also makes clear that Pod deletion only triggers CNI `DEL`, which must be verified in node logs and local state.
- Uncordoning each node immediately contradicted the declared full-cluster outage and allowed pending workloads onto a partially migrated cluster. Cleaned nodes now remain cordoned until every node is Flannel-ready; DNS and ClusterIP validation happens during controlled cluster-wide restoration.
- The Calico reverse-migration documentation link used an obsolete fragment and could be read as a universal uninstall procedure. The link now uses the current `#revert-migration` fragment and identifies its migration-controller scope.

## Review Notes

- The corrected post is intentionally a generic, full-outage workflow. Operators must still use a version-pinned Flannel release and the uninstall procedure for their exact Calico release and installation method.
- The scope is correctly limited to Linux, IPv4, and Calico's standard iptables/nftables data plane. eBPF, VPP, Windows, IPv6, and dual-stack installations require their mode-specific procedures.
- The upstream namespace, labels, paths, interface names, and default VXLAN VNI used by the verification commands may differ in distribution-managed deployments; the post now marks the assumptions that must be adapted.
