# Validation Summary: Fix a `cni0` Address That Differs From the Flannel Subnet

## Status

validated

## Post Type

Kubernetes troubleshooting guide

## Technologies Covered

- Kubernetes Nodes, Pod CIDRs, Pod scheduling, and node draining
- Flannel and its Kubernetes subnet manager
- Container Network Interface (CNI)
- CNI bridge plugin and the `cni0` Linux bridge
- CNI `host-local` IPAM
- Container Runtime Interface (CRI) and `crictl`
- containerd CNI configuration selection
- Linux `ip`, `bridge`, `find`, `grep`, `jq`, and systemd commands

## Sources Consulted

- [Flannel CNI plugin documentation and configuration reference](https://github.com/flannel-io/cni-plugin)
- [Flannel CNI Linux delegation implementation](https://github.com/flannel-io/cni-plugin/blob/main/flannel_linux.go)
- [Flannel subnet-file generation](https://github.com/flannel-io/flannel/blob/master/pkg/subnet/subnet.go)
- [Flannel configuration and dual-stack documentation](https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md)
- [Current upstream Flannel Kubernetes manifest](https://github.com/flannel-io/flannel/blob/master/Documentation/kube-flannel.yml)
- [Flannel Kubernetes integration](https://github.com/flannel-io/flannel/blob/master/Documentation/kubernetes.md)
- [CNI bridge plugin documentation](https://www.cni.dev/plugins/current/main/bridge/)
- [CNI bridge plugin implementation](https://github.com/containernetworking/plugins/blob/main/plugins/main/bridge/bridge.go)
- [CNI host-local IPAM documentation](https://www.cni.dev/plugins/current/ipam/host-local/)
- [CNI host-local disk backend implementation](https://github.com/containernetworking/plugins/blob/main/plugins/ipam/host-local/backend/disk/backend.go)
- [CNI specification](https://github.com/containernetworking/cni/blob/main/SPEC.md)
- [Kubernetes `kubectl drain` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/)
- [Kubernetes guide to safely draining a node](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/)
- [Kubernetes field-selector reference](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)
- [Kubernetes Pod assignment with `nodeName`](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [Kubernetes `kubectl run` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/)
- [Kubernetes `kubectl wait` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)
- [Kubernetes `kubectl exec` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)
- [`crictl` documentation](https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md)
- [containerd/go-cni configuration loading and ordering](https://github.com/containerd/go-cni/blob/main/opts.go)
- [Linux bridge command manual](https://man7.org/linux/man-pages/man8/bridge.8.html)
- [Official BusyBox image tags](https://github.com/docker-library/official-images/blob/master/library/busybox)

## Issues Found

- The `jq` state-directory resolver treated an explicit empty `ipam.dataDir` as a filesystem-root path such as `/cbr0`. The host-local implementation treats an empty string as unset and falls back to `/var/lib/cni/networks/<network-name>`. Both resolver blocks now normalize an empty or absent `dataDir` to `/var/lib/cni/networks` before appending the CNI network name, preventing inspection or movement of the wrong directory.

## Review Notes

The reviewed commands and claims are correct for the current upstream Linux Flannel configuration using the delegated bridge plugin with `host-local` IPAM. Distribution-specific installations can use different namespaces, CNI filenames, runtime endpoints, or kubelet service names; the post already calls out the relevant variations. For IPv6 checks, `ip -6` can also display link-local or other non-overlapping addresses, so readers should compare the global bridge address and prefix corresponding to `FLANNEL_IPV6_SUBNET`. No deprecated Kubernetes APIs or CLI options were found, and the warning that `crictl` fallback endpoint probing is deprecated is current.
