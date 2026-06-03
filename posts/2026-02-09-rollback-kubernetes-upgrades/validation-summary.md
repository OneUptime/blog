# Validation Summary: How to Rollback Kubernetes Upgrades When Issues Are Detected

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- kubeadm
- kubectl
- kubelet
- etcd and etcdctl
- Amazon EKS managed node groups and add-ons
- CoreDNS, kube-proxy, Calico, and metrics-server
- Bash scripting

## Sources Consulted
- Kubernetes kubeadm upgrade documentation: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/
- Kubernetes version skew policy: https://kubernetes.io/releases/version-skew-policy/
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes ComponentStatus API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/component-status-v1/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes package repository migration guide: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/change-package-repository/
- etcd disaster recovery guide: https://etcd.io/docs/v3.4/op-guide/recovery/
- AWS CLI EKS create-nodegroup reference: https://docs.aws.amazon.com/cli/latest/reference/eks/create-nodegroup.html
- Amazon EKS UpdateNodegroupVersion API reference: https://docs.aws.amazon.com/eks/latest/APIReference/API_UpdateNodegroupVersion.html
- Amazon EKS add-on update guide: https://docs.aws.amazon.com/eks/latest/userguide/updating-an-add-on.html

## Issues Found
- Fixed the API server metrics grep pattern so the shell command searches for `code="5` safely with single quotes instead of relying on an escaped quote in an unquoted shell token.
- Corrected the managed control plane rollback claim. Managed Kubernetes control planes generally cannot be rolled back by restoring etcd directly because users do not have access to provider-managed etcd; the post now says to contact provider support or recreate from backups.
- Replaced the self-managed control plane rollback script's `systemctl stop/start kube-apiserver`, `kube-controller-manager`, and `kube-scheduler` flow with a kubeadm static pod manifest restore flow. kubeadm manages those control plane components as static pods and creates backup manifest directories under `/etc/kubernetes/tmp` during upgrades.
- Replaced `kubectl version --short` with `kubectl version`, because the `--short` flag is no longer available in current kubectl versions.
- Updated Kubernetes apt package version examples from the legacy `-00` suffix to the current `pkgs.k8s.io` package suffix `-1.1`, and added comments noting that the apt repository must point to the matching Kubernetes minor version.
- Corrected the etcd restore command to run `etcdctl snapshot restore` with `sudo env ETCDCTL_API=3`, added an `--initial-cluster-token`, and noted that HA etcd restores must restore each member from the same snapshot with member-specific peer settings.
- Replaced post-restore control plane `systemctl restart` commands with a kubelet restart for static pod based control planes.
- Corrected the EKS managed node group rollback example. The original example created a new managed node group at Kubernetes 1.28 after a 1.29 upgrade, but AWS documents that managed node groups cannot be rolled back to earlier Kubernetes or AMI versions and new managed node groups must use the cluster's Kubernetes version.
- Replaced the deprecated Kubernetes API `/healthz` check with `/readyz` in the automated rollback monitor.
- Replaced deprecated `kubectl get componentstatuses` validation with an API server `/readyz` readiness check because the ComponentStatus API is deprecated in Kubernetes v1.19 and later.

## Review Notes
The examples remain illustrative and still require environment-specific values such as node names, etcd peer URLs, AWS IAM roles, subnet IDs, add-on versions, and Kubernetes package repository configuration. The guide should be treated as a runbook template rather than a copy-paste rollback procedure for every cluster topology.
