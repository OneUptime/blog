# Validation Summary: kubeadm Says "API Server Is Not Healthy": Check Kubelet, cgroups, etcd, and Static-Pod Logs

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- kubeadm
- kubelet
- Container Runtime Interface (CRI) and crictl
- Linux cgroups and systemd
- containerd and CRI-O
- Kubernetes static Pods
- kube-apiserver health endpoints and TLS
- etcd and etcdctl

## Sources Consulted
- [Kubernetes: Troubleshooting kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/troubleshooting-kubeadm/)
- [Kubernetes: kubeadm Implementation Details](https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/)
- [Kubernetes: Debugging Kubernetes nodes with crictl](https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/)
- [Kubernetes: Container Runtimes](https://kubernetes.io/docs/setup/production-environment/container-runtimes/)
- [Kubernetes: About cgroup v2](https://kubernetes.io/docs/concepts/architecture/cgroups/)
- [Kubernetes: Static Pods](https://kubernetes.io/docs/concepts/workloads/pods/static-pods/)
- [Kubernetes: Kubernetes API health endpoints](https://kubernetes.io/docs/reference/using-api/health-checks/)
- [Kubernetes: PKI certificates and requirements](https://kubernetes.io/docs/setup/best-practices/certificates/)
- [Kubernetes: kubeadm reset](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-reset/)
- [etcd: How to check cluster status](https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/)
- [cri-tools: crictl documentation](https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md)

## Issues Found
- The local readiness command connected to `127.0.0.1` without specifying a TLS identity. kubeadm does not include `127.0.0.1` in the API server certificate SANs by default, so the command could fail certificate verification even when the API server was healthy. Added `--tls-server-name=kubernetes`, using a DNS SAN that kubeadm includes by default while retaining the local TCP connection, and updated the explanation accordingly.

## Review Notes
- The cgroup guidance is version-aware and correctly notes both the systemd-driver requirement for cgroup v2 and newer CRI-based driver detection.
- Runtime socket paths and containerd configuration differ by installation and major version; the post appropriately labels the socket as an example and directs readers to the applicable runtime documentation.
- The `crictl`, `kubeadm`, `kubectl`, `openssl`, `ss`, and `etcdctl` command forms were checked and are current.
