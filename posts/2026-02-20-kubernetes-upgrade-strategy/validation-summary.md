# Validation Summary: How to Safely Upgrade Kubernetes Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- kubeadm
- kubectl
- kubelet
- etcd / etcdctl
- Pluto
- Python
- Bash

## Sources Consulted
- Kubernetes kubeadm upgrade guide: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/
- Kubernetes version skew policy: https://kubernetes.io/releases/version-skew-policy/
- Kubernetes deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes kubeadm installation and package repository guide: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes 1.35 release page: https://kubernetes.io/releases/1.35/
- Pluto documentation: https://pluto.docs.fairwinds.com/advanced/

## Issues Found
- The examples used Kubernetes v1.28 through v1.31 and targeted v1.30, which are no longer current supported upstream minor releases on 2026-05-27. Updated the example path to v1.34 -> v1.35 -> v1.36 and the kubeadm/pluto target to v1.35.5.
- `kubectl version --short` is removed in newer kubectl releases. Replaced it with `kubectl version`.
- The custom deprecated API script checked API discovery endpoints, which shows served API resources rather than actual deprecated API usage. Reworked it to inspect the official `apiserver_requested_deprecated_apis` metric and report APIs removed by the target version.
- The deprecated API map incorrectly treated `flowcontrol.apiserver.k8s.io/v1beta3` as removed for v1.30. Updated the script to use removal metadata from API server metrics and fixed the replacement map for known removed APIs.
- The kubeadm package examples used legacy `1.30.0-00` package versions. Updated them to the current `pkgs.k8s.io` package version pattern and added `apt-mark unhold` / `apt-mark hold` steps consistent with Kubernetes documentation.
- The control plane upgrade example upgraded kubelet without first draining the node. Added drain and uncordon steps around the kubelet upgrade.
- The worker-node diagram said to upgrade kubectl on workers, while the script only upgraded kubeadm and kubelet. Updated the diagram to match the script and the usual worker-node requirements.
- The rollback plan suggested running `kubeadm upgrade apply` with the previous version. Replaced that with restoring previous manifests/configuration and reinstalling previous packages if they had already been upgraded.
- The rollback section described the etcd backup as the only reliable rollback mechanism. Reworded it as the critical rollback mechanism for control plane state, since kubeadm also writes local backup files during upgrades.

## Review Notes
The post is technically valid as a kubeadm-oriented upgrade guide. The commands still assume a Debian/Ubuntu package-managed cluster using the community `pkgs.k8s.io` repositories and stacked etcd paths under `/etc/kubernetes/pki/etcd`; managed Kubernetes services and external etcd topologies require provider-specific procedures.
