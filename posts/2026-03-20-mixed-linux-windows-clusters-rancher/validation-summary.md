# Validation Summary: How to Configure Mixed Linux and Windows Clusters in Rancher

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Rancher
- Kubernetes (mixed Linux/Windows clusters)
- kubectl (labels, taints, tolerations, nodeSelector)
- Flannel CNI (VXLAN backend)
- Kubernetes Namespaces and Services

## Sources Consulted
- Kubernetes well-known labels documentation: https://kubernetes.io/docs/reference/labels-annotations-taints/ (confirms `kubernetes.io/os` is automatically applied by kubelet)
- Kubernetes Windows scheduling guide: https://kubernetes.io/docs/concepts/windows/user-guide/ (confirms nodeSelector + taint/toleration pattern)
- Kubernetes Taints and Tolerations docs: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/ (confirms Equal/Exists operator semantics and NoSchedule effect)
- Rancher Windows Cluster docs: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/launch-kubernetes-with-rancher/use-windows-clusters (confirms Windows nodes are workers only and Flannel is the supported CNI for mixed clusters)
- kubectl reference: `kubectl label`, `kubectl taint`, `kubectl get nodes -L` syntax verified

## Issues Found
No technical issues found.

- The `kubernetes.io/os` label is correctly described as automatically applied by the kubelet.
- `kubectl taint nodes` syntax with multiple node names and `key=value:effect` is correct.
- `kubectl label node` and `kubectl get nodes -L` syntax is correct.
- Toleration YAML using `operator: Equal` with a `value` and using `operator: Exists` without a value both follow Kubernetes spec correctly.
- Namespace and Service YAML manifests are syntactically valid.
- The claim that Windows nodes can only be workers (not control plane / etcd) is accurate — Kubernetes does not support running control plane components on Windows.
- Flannel with VXLAN backend is supported on both Linux and Windows nodes (Windows support exists in modern Flannel; host-gw is an alternative).

## Review Notes
- The "Step 6: Resource Quotas by OS" section header references resource quotas, but the YAML shown only creates namespaces (not actual `ResourceQuota` objects). The inline comment clarifies this is namespace setup as a prerequisite for per-namespace quotas, so it is not technically incorrect — just slightly mismatched between header and content. Per review guidelines, no structural changes were made.
- Some Windows/Linux cluster setups prefer Flannel `host-gw` backend over VXLAN for performance reasons, but VXLAN is also supported and is a reasonable default; this is not an error.
- The custom label `windows-version=2022` is presented as user-defined for Windows Server 2022 targeting, which is fine. Note that Windows containers must match the host OS build version closely (process isolation), so version-targeting labels are a sensible practice.
