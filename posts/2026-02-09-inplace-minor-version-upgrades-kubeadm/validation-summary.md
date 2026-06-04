# Validation Summary: How to Perform In-Place Kubernetes Minor Version Upgrades with kubeadm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubeadm
- kubectl
- kubelet
- etcd / etcdctl
- Debian/Ubuntu Kubernetes packages
- Kubernetes cluster addons including CNI plugins, metrics-server, and ingress-nginx

## Sources Consulted
- Kubernetes kubeadm upgrade documentation: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/
- Kubernetes kubeadm upgrade command reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-upgrade/
- Kubernetes Linux node upgrade documentation: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/upgrading-linux-nodes/
- Kubernetes kubeadm installation and package repository documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes release information: https://kubernetes.io/releases/
- Kubernetes version skew policy: https://kubernetes.io/releases/version-skew-policy/
- kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes ComponentStatus API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/component-status-v1/
- Kubernetes etcd backup documentation: https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- Kubernetes certificate management with kubeadm: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/

## Issues Found
- `kubectl version --short` is no longer listed in the current generated `kubectl version` reference. Changed it to `kubectl version`.
- `kubectl get componentstatuses` used the deprecated `ComponentStatus` API. Replaced it with `kubectl get --raw='/readyz?verbose'`, which Kubernetes documents for API server readiness checks.
- The post used Kubernetes 1.28.5 and Debian package suffix `-00`, but Kubernetes 1.28 is end-of-life and current `pkgs.k8s.io` package examples use the `1.36.x-*` package pattern. Updated the worked example to Kubernetes 1.36.1, the current 1.36 patch release as of validation, and added a note to use the latest patch shown by the package manager.
- The control plane and worker upgrade order did not match current kubeadm guidance. Updated the examples so `kubeadm upgrade apply` or `kubeadm upgrade node` happens before draining for the kubelet upgrade, and kept uncordon after kubelet restart.
- The worker automation script selected only nodes with a `node-role.kubernetes.io/worker` label, which is not guaranteed for kubeadm worker nodes. Updated it to select nodes that do not have the control-plane role label.
- Several shell snippets used angle-bracket placeholders for node names, which a shell treats as redirection. Replaced them with variables such as `CONTROL_PLANE_NODE` and `WORKER_NODE`.
- The failure handling section suggested downgrading with `kubeadm upgrade apply` as a rollback path. Replaced that with kubeadm's documented recovery approach: re-run kubeadm, retry with `--force` if needed, and inspect `/etc/kubernetes/tmp` backup directories.
- The addon examples pinned old third-party addon versions. Replaced them with version variables and guidance to choose validated compatible addon versions. Also clarified that kubeadm upgrades the default CoreDNS and kube-proxy addons.
- The certificate renewal section only mentioned `kubeadm upgrade apply` and suggested restarting kubelet after manual renewal. Updated it to include `kubeadm upgrade node` automatic renewal and to state that control plane static Pods must be restarted after manual renewal.

## Review Notes
The post is technically valid after fixes. The examples remain Linux/apt-focused and assume a kubeadm cluster using static control plane Pods and either local or external etcd, which matches the kubeadm upgrade documentation. Addon versions should still be chosen per-cluster based on each addon's compatibility matrix before production use.
