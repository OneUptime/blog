# Validation Summary: Fix Flannel: Node Pod CIDR Not Assigned

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Kubernetes Nodes and Node IPAM
- Flannel with the Kubernetes subnet manager
- kubeadm cluster configuration
- kube-controller-manager node-CIDR allocation
- kube-proxy Service networking
- kubectl
- jq
- Linux routes and network interfaces

## Sources Consulted

- [Flannel v0.28.9 troubleshooting: Kubernetes Pod CIDRs](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/troubleshooting.md#kubernetes-specific)
- [Flannel v0.28.9 Kubernetes subnet-manager implementation](https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/subnet/kube/kube.go)
- [Flannel v0.28.9 Kubernetes manifest](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/kube-flannel.yml)
- [Flannel configuration reference](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/configuration.md)
- [Flannel backend reference](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/backends.md)
- [Kubernetes: `kubeadm init`](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/)
- [Kubernetes: kubeadm implementation details](https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/)
- [Kubernetes: kubeadm configuration API v1beta4](https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/)
- [Kubernetes: Reconfiguring a kubeadm cluster](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-reconfigure/)
- [Kubernetes: `kubeadm reset`](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-reset/)
- [Kubernetes: `kube-controller-manager` flags](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/)
- [Kubernetes: Node v1 API](https://kubernetes.io/docs/reference/kubernetes-api/core/node-v1/)
- [Kubernetes: `kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes: `kubectl patch`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/)
- [jq manual: `join` and `@tsv`](https://jqlang.org/manual/v1.6/)

## Issues Found

- The introduction said Flannel reads either `spec.podCIDR` or `spec.podCIDRs`. Current Flannel first requires `spec.podCIDR`, then uses `spec.podCIDRs` when that list is present, including for dual-stack ranges. Updated the explanation to match the implementation.
- The introduction and conclusion said Kubernetes node IPAM must allocate the range. Flannel only requires a valid Pod CIDR to be present on the Node; node IPAM is the normal source, but Kubernetes and Flannel also permit controlled manual assignment. Reworded both statements to make node IPAM the normal path rather than the only path.
- The initial `kubectl logs daemonset/kube-flannel-ds` command selected only one Pod from the DaemonSet by default and could miss the affected node. Changed it to use `-l app=flannel`, which retrieves logs from all matching Flannel Pods.
- The node-inventory `jq` command passed the `podCIDRs` array as a nested field to `@tsv`, causing jq to fail because TSV fields cannot themselves be arrays. Added `join(",")` so the CIDR list is rendered as a valid string field.

## Review Notes

- The kubeadm `v1beta4` configuration is current for Kubernetes 1.31 and later; the post appropriately tells readers to use a version-appropriate kubeadm API on older releases.
- Node Pod CIDRs can be assigned when empty but cannot be changed afterward through a normal Node update. The post's manual patch is therefore correctly limited to a missing-CIDR recovery case and includes the required matching `podCIDR` and `podCIDRs[0]` values.
- A complete Pod-network migration must also keep kube-proxy's `clusterCIDR` consistent when kube-proxy uses ClusterCIDR-based local-traffic detection. The post correctly treats an existing-cluster CIDR change as a planned migration rather than a Flannel-only repair.
- The `/16` to `/24` capacity calculation, controller-manager flag defaults, Flannel object names and labels, default `10.244.0.0/16` network, manual patch syntax, backend-specific interface guidance, and all five links in the post were verified.
