# Validation Summary: kube-apiserver Static Pod Keeps Restarting: Recover It with `crictl` When `kubectl` Is Unavailable

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- kubeadm
- kube-apiserver
- kubelet
- Static Pods and mirror Pods
- Container Runtime Interface (CRI)
- crictl
- containerd and CRI-O
- systemd journal tooling
- OpenSSL certificate inspection

## Sources Consulted
- [Kubernetes: Debugging Kubernetes nodes with crictl](https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/)
- [Kubernetes: Static Pods](https://kubernetes.io/docs/concepts/workloads/pods/static-pods/)
- [Kubernetes: Create static Pods](https://kubernetes.io/docs/tasks/configure-pod-container/static-pod/)
- [Kubernetes: Configuring each kubelet in your cluster using kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/kubelet-integration/)
- [Kubernetes: kubeadm implementation details](https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/)
- [Kubernetes: Reconfiguring a kubeadm cluster](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-reconfigure/)
- [Kubernetes: Local files and paths used by the kubelet](https://kubernetes.io/docs/reference/node/kubelet-files/)
- [Kubernetes: Kubernetes API health endpoints](https://kubernetes.io/docs/reference/using-api/health-checks/)
- [Kubernetes: PKI certificates and requirements](https://kubernetes.io/docs/setup/best-practices/certificates/)
- [Kubernetes SIG Node: cri-tools crictl documentation](https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md)

## Issues Found
No technical issues found.

## Review Notes
The commands and explanations are consistent with current official guidance. In particular, the post correctly warns that non-dot backup files in the static Pod manifest directory are processed regardless of extension, that stopping a static Pod container or deleting its mirror Pod does not transfer ownership away from kubelet, and that `127.0.0.1` must be present in the API server certificate SANs when it is used as the explicit TLS endpoint. Runtime service names and socket paths remain distribution-specific, as the post notes.
