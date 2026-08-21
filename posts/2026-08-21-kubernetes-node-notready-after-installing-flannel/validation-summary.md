# Validation Summary: Why a Kubernetes Node Stays NotReady After Installing Flannel

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Kubernetes node conditions, Events, Pod CIDR allocation, and EndpointSlices
- kubeadm and kube-controller-manager node CIDR allocation
- Flannel and its Kubernetes subnet manager, VXLAN backend, and DaemonSet
- Container Network Interface (CNI) plugins and Container Runtime Interface (CRI) runtimes
- Linux bridges, `br_netfilter`, IP forwarding, routes, and host firewalls
- kube-proxy and Kubernetes Service virtual IPs

## Sources Consulted

- [Flannel README and installation requirements](https://github.com/flannel-io/flannel/blob/master/README.md)
- [Current upstream Flannel Kubernetes manifest](https://github.com/flannel-io/flannel/blob/master/Documentation/kube-flannel.yml)
- [Flannel Kubernetes deployment documentation](https://github.com/flannel-io/flannel/blob/master/Documentation/kubernetes.md)
- [Flannel troubleshooting guide](https://github.com/flannel-io/flannel/blob/master/Documentation/troubleshooting.md)
- [Flannel backend documentation](https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md)
- [Flannel configuration documentation](https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md)
- [Flannel CNI plugin repository](https://github.com/flannel-io/cni-plugin)
- [Flannel CNI v1.9.1-flannel3 subnet-file error handling](https://github.com/flannel-io/cni-plugin/blob/v1.9.1-flannel3/flannel.go#L280-L288)
- [Kubernetes network plugins documentation](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/)
- [Kubernetes Node status reference](https://kubernetes.io/docs/reference/node/node-status/)
- [Kubelet CRI `NetworkReady` handling in Kubernetes v1.36.4](https://github.com/kubernetes/kubernetes/blob/v1.36.4/pkg/kubelet/kubelet.go#L3260-L3267)
- [Kubernetes field selectors documentation](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)
- [Kubernetes container runtime prerequisites](https://kubernetes.io/docs/setup/production-environment/container-runtimes/)
- [Kubernetes kubeadm cluster creation guide](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/)
- [Kubernetes 1.30 changelog](https://github.com/kubernetes/kubernetes/blob/v1.30.0/CHANGELOG/CHANGELOG-1.30.md)
- [Kubernetes Service virtual IP and proxy documentation](https://kubernetes.io/docs/reference/networking/virtual-ips/)
- Kubernetes command references: [`kubectl run`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/), [`kubectl wait`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/), [`kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), [`kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/), and [`kubectl rollout status`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/)
- [containerd CRI plugin configuration](https://github.com/containerd/containerd/blob/main/docs/cri/config.md)
- [Linux kernel IPv4 sysctl documentation](https://docs.kernel.org/networking/ip-sysctl.html)

## Issues Found

- The post treated all Flannel and data-plane failures as causes of a NotReady node. A missing or invalid CNI configuration can make the CRI runtime report `NetworkReady=false` and keep the node NotReady, but later CNI execution, VXLAN, forwarding, or firewall failures can occur while the node remains Ready. The introduction, description, and conclusion now make that distinction.
- CNI initialization was attributed partly to kubelet, and the recovery instructions suggested restarting kubelet to clear cached CNI state. On Kubernetes 1.24 and later, the CRI runtime loads CNI configuration and invokes plugin binaries, while kubelet polls the runtime's network status. The ownership language was corrected and the misleading kubelet restart procedure was replaced with runtime-specific diagnostics and reload guidance.
- The Node-only Event query could not find pod sandbox creation failures, and it sorted by the legacy Event `lastTimestamp` field. A separate cluster-wide `FailedCreatePodSandBox` query was added, with instructions to correlate affected Pods to the node, and both queries now sort by `metadata.creationTimestamp`.
- The `subnet.env` diagnostic used only an older error string and implied that a missing file was the sole cause. It now includes the current error text and covers missing, unreadable, and malformed subnet files.
- The Flannel init-container description called the installed artifact the Flannel binary, which could be confused with `flanneld`. It now identifies that artifact as the Flannel CNI plugin executable. The explanation of `Init:ImagePullBackOff` was also corrected to distinguish image retrieval failures from init-container copy failures.
- The kubeadm 1.30 claim described a removed `br_netfilter` module preflight check. Kubernetes 1.30 specifically removed kubeadm's preflight checks for the bridge netfilter sysctl values, so the text now names the two checks accurately.
- The host validation list could imply that the Node Pod CIDR and `FLANNEL_SUBNET` strings should be identical. It now explains the normal gateway-address form, such as a `10.244.3.0/24` Pod CIDR corresponding to `FLANNEL_SUBNET=10.244.3.1/24`.
- The warning against “different” cluster Pod ranges could incorrectly reject a valid dual-stack configuration. It now requires Flannel and Kubernetes to use matching ranges within each address family and identifies Flannel's `IPv6Network` setting.
- The cross-node test used an angle-bracket placeholder that the shell would interpret as input redirection and did not wait for the pods to become Ready. It now waits for both pods, reads the destination Pod IP with JSONPath, quotes it, and explicitly uses the requested container command.
- The destructive-recovery warning assumed that draining always removes every CNI-attached pod. It now requires confirming that none remain before deleting bridges, routes, or IPAM state.
- The recovery command used DaemonSet-wide rollout status as proof that a deleted node-local pod had been recreated. Pod deletion does not create a new rollout revision, so that command can return before observing the replacement or be held up by another unhealthy node. It was replaced with a watch scoped to the affected node.

## Review Notes

- The remaining commands, flags, JSONPath expressions, field selectors, configuration paths, sysctls, and networking explanations were checked against the listed official sources. The revised shell snippets also passed a syntax check, and the `kubectl run` shape was verified with client-side dry runs.
- The upstream `master` manifest reviewed here used Flannel v0.28.9 and the v1.9.1-flannel3 CNI plugin. Because `master` links can change, the post's advice to download and use a version-pinned manifest remains important.
