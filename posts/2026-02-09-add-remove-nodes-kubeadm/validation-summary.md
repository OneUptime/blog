# Validation Summary: How to Add and Remove Nodes from a Running Kubernetes Cluster with kubeadm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubeadm
- kubelet
- kubectl
- etcd / etcdctl
- Debian/Ubuntu apt package repositories

## Sources Consulted
- Kubernetes documentation: Installing kubeadm - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes documentation: kubeadm token - https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-token/
- Kubernetes documentation: kubeadm join - https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-join/
- Kubernetes documentation: kubeadm init phase upload-certs - https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init-phase/
- Kubernetes documentation: Creating Highly Available Clusters with kubeadm - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/
- Kubernetes documentation: kubeadm configuration v1beta4 - https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Kubernetes documentation: kubectl drain - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes documentation: kubeadm reset - https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-reset/
- Kubernetes documentation: Operating etcd clusters for Kubernetes - https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- etcd documentation: How to Add and Remove Members - https://etcd.io/docs/v3.7/tasks/operator/how-to-deal-with-membership/

## Issues Found
- The node prerequisite list omitted unique `product_uuid`, which kubeadm's installation prerequisites call out alongside hostname and MAC address. Added `product_uuid`.
- The apt install snippet omitted `gpg` and did not create `/etc/apt/keyrings`, both of which are needed on some supported Debian/Ubuntu releases. Added `gpg` and the keyring directory creation command.
- The package repository example was pinned to Kubernetes `v1.28`, which is outdated for a current 2026 validation. Updated the example to use a `KUBERNETES_MINOR=v1.36` variable matching the current official installation docs.
- The kubelet enable command did not start kubelet immediately. Updated it to `systemctl enable --now kubelet`, matching the official optional kubelet startup command.
- Several kubeadm token examples used invalid token-shaped placeholders such as `abc123.xyz789` and `xyz.abc`. Replaced them with `abcdef.0123456789abcdef`, the documented bootstrap token format.
- The custom kubelet configuration example passed a bare `KubeletConfiguration` to `kubeadm join --config` while also mixing CLI flags. kubeadm join expects a kubeadm `JoinConfiguration` when using `--config`, with additional config objects separated by `---`. Replaced the snippet with a valid multi-document kubeadm join config.
- The optional reset cleanup omitted CNI configuration, which `kubeadm reset` explicitly does not remove. Added `/etc/cni/net.d/` cleanup to the optional cleanup steps.
- The "Delete all terminating pods" command only handled the current namespace despite claiming all pods. Updated it to use `--all-namespaces` and pass namespaces to `kubectl delete`.
- The etcd member removal troubleshooting command used `etcdctl member remove --force`, which is not documented for etcdctl member removal. Replaced it with a retry through a healthy etcd endpoint using the same TLS options.

## Review Notes
The commands are broadly accurate for kubeadm-managed clusters, but operators should still match the `KUBERNETES_MINOR` repository to the existing cluster's minor version and respect Kubernetes version-skew policy when adding nodes.
