# Validation Summary: How to Install RKE on Linux

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Rancher Kubernetes Engine (RKE/RKE1)
- Kubernetes
- Docker Engine
- SSH/OpenSSH
- Linux kernel sysctl settings
- kubectl
- Kubernetes Dashboard
- Helm

## Sources Consulted
- RKE overview: https://rke.docs.rancher.com/
- RKE requirements: https://rke.docs.rancher.com/os
- RKE installation guide: https://rke.docs.rancher.com/installation
- RKE node configuration reference: https://rke.docs.rancher.com/config-options/nodes
- RKE Kubernetes configuration options: https://rke.docs.rancher.com/config-options
- RKE recurring etcd snapshots: https://rke.docs.rancher.com/etcd-snapshots/recurring-snapshots
- RKE v1.8.13 release notes: https://github.com/rancher/rke/releases/tag/v1.8.13
- RKE v1.8 source defaults for cri-dockerd behavior: https://github.com/rancher/rke/blob/release/v1.8/cluster/defaults.go
- SUSE RKE1 v1.30 support matrix: https://www.suse.com/suse-rke1/support-matrix/all-supported-versions/rke1-v1-30/
- Docker Engine install documentation: https://docs.docker.com/engine/install/ubuntu/
- Kubernetes container runtimes documentation: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes Dashboard documentation: https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/
- Kubernetes Dashboard sample user documentation: https://github.com/kubernetes-retired/dashboard/blob/master/docs/user/access-control/creating-sample-user.md

## Issues Found
- RKE1 lifecycle was outdated. Added that RKE1 reached end of life on July 31, 2025 and changed the recommendation for new production clusters to RKE2 or K3s.
- Prerequisites listed stale OS versions and an inaccurate hardware minimum. Replaced them with support-matrix based OS/Docker guidance, Docker socket access, OpenSSH 7.0+, SSH TCP forwarding, and RKE's documented worker component minimum.
- Docker verification used `docker --version`, which only verifies the client version. Changed it to `docker version --format '{{.Server.Version}}'` and noted that the convenience script is suitable for lab/test use, not production.
- The sample `kubernetes_version` was `v1.28.8-rancher1-1`, which does not match the current RKE v1.8.13 release list. Updated the example to `v1.30.14-rancher1-1`.
- Node preparation applied bridge sysctls before loading `br_netfilter`. Moved module loading before `sysctl --system` and persisted it with `/etc/modules-load.d/rke.conf`.
- The optional Dashboard section used the old v2.7 raw manifest and `kubectl proxy` URL. Updated it to the current Helm-based install and `kubectl port-forward` flow, and marked Dashboard as deprecated and unmaintained.
- Added the RKE SSH tunneling requirement that `AllowTcpForwarding yes` remain enabled.

## Review Notes
This post is technically valid after fixes, but RKE1 should be treated as a legacy/maintenance path. The example still uses a single etcd node for simplicity; production clusters should use an HA etcd/control-plane topology, protect `cluster.yml`, `kube_config_cluster.yml`, and `cluster.rkestate`, and follow the current RKE/SUSE support matrix for exact OS, Docker, and Kubernetes combinations.
