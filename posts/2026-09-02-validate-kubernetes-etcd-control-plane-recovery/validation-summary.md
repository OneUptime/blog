# Validation Summary: Validate Kubernetes Recovery with etcd and Control Plane Restore

## Status
validated

## Post Type
Technical disaster-recovery guide

## Technologies Covered

- Kubernetes control plane
- etcd 3.6 and 3.7
- kubeadm
- kubelet and static Pods
- etcdctl and etcdutl
- Kubernetes PKI, ServiceAccount signing, and encryption at rest
- CNI, CSI, CoreDNS, admission webhooks, and aggregated APIs

## Sources Consulted

- [Kubernetes: Operating etcd clusters](https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/)
- [etcd v3.7: Disaster recovery](https://etcd.io/docs/v3.7/op-guide/recovery/)
- [etcd v3.7: How to check cluster status](https://etcd.io/docs/v3.7/tasks/operator/how-to-check-cluster-status/)
- [etcd v3.7: API](https://etcd.io/docs/v3.7/learning/api/)
- [Kubernetes: kube-apiserver command-line reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/)
- [Kubernetes: kubeadm init](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/)
- [Kubernetes: PKI certificates and requirements](https://kubernetes.io/docs/setup/best-practices/certificates/)
- [Kubernetes: API health endpoints](https://kubernetes.io/docs/reference/using-api/health-checks/)

## Issues Found

- The snapshot-status explanation implied that `etcdutl snapshot status` performs an integrity check. Changed it to state that the command reads and reports snapshot metadata but is not, by itself, integrity verification; `etcdutl snapshot restore` verifies the integrity hash added by `etcdctl snapshot save`.

## Review Notes

- The `etcdctl` and `etcdutl` command division is correct for etcd 3.6 and 3.7: `etcdctl` creates an online snapshot, while `etcdutl` reports offline snapshot status and performs restore.
- The revision-bump and `--mark-compacted` guidance correctly follows etcd's Kubernetes-specific recovery recommendation. The bump remains intentionally deployment-specific.
- The minimal single-member restore is correctly limited to an etcd-only isolated test; a Kubernetes recovery must use the revision-handling form and an HA restore must specify deliberate membership.
- Endpoint hash results must be compared at the same hash revision, as the post states.
- The restore procedure appropriately distinguishes etcd-backed Kubernetes object metadata from PersistentVolume contents and other external state.
- Commands require version-matched binaries, valid TLS credentials, populated environment variables, and an isolated recovery environment; the post states these operational constraints.
