# Validation Summary: How to Upgrade Kubernetes Control Plane Components with kubeadm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubeadm
- kubectl
- kubelet
- etcd and etcdctl/etcdutl
- Debian/Ubuntu Kubernetes packages
- Pluto
- Helm

## Sources Consulted
- Kubernetes kubeadm upgrade guide: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/
- Kubernetes kubeadm upgrade command reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-upgrade/
- Kubernetes Linux node upgrade guide: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/upgrading-linux-nodes/
- Kubernetes package repository migration guide: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/change-package-repository/
- Kubernetes version skew policy: https://kubernetes.io/releases/version-skew-policy/
- Kubernetes API health endpoint docs: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes ComponentStatus API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/component-status-v1/
- Kubernetes etcd operation and restore docs: https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- Pluto documentation: https://pluto.docs.fairwinds.com/advanced/
- Pluto quickstart: https://pluto.docs.fairwinds.com/quickstart/

## Issues Found
- Replaced `kubectl version --short` with `kubectl version` because `--short` is no longer valid in current kubectl versions.
- Replaced `kubectl get componentstatuses` with `kubectl get --raw='/readyz?verbose'` because ComponentStatus has been deprecated since Kubernetes v1.19 and API server readyz/livez endpoints are the documented health checks.
- Changed etcd snapshot commands to store the generated snapshot path in a variable and verify that exact file, avoiding wildcard expansion problems when multiple snapshots exist.
- Updated etcd client certificate examples to use kubeadm's `healthcheck-client` certificate/key for client operations against local etcd.
- Changed Debian package examples from the legacy `1.28.4-00` suffix to `1.28.4-*`, which works with the current `pkgs.k8s.io` package version suffixes.
- Added package repository minor-version updates before `apt-cache madison` and package installs, because `pkgs.k8s.io` uses a separate repository per Kubernetes minor version.
- Fixed the etcd health check command so `ETCDCTL_API=3` is set inside the container executed by `kubectl exec`.
- Replaced the nginx `/bin/bash` test pod command with a BusyBox command that does not assume bash is present in the image.
- Replaced the rollback example's `systemctl stop etcd` and deprecated `etcdctl snapshot restore` flow with a static-pod kubeadm restore flow using `etcdutl` and manifest movement.

## Review Notes
The post uses Kubernetes v1.28.4 as its worked example. That version is no longer a supported Kubernetes minor release as of the validation date, so readers should substitute a currently supported target minor and latest patch release when applying the guide.
