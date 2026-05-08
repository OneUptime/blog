# Validation Summary: How to Fix CIDRNotAvailable Errors with Calico and kubeadm

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- kubeadm
- kube-controller-manager
- Calico
- Calico IPPool
- Calico IPAM
- kubectl
- calicoctl

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IPAM overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl ipam release reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico change IP pool block size guide: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Kubernetes kube-controller-manager reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes kubeadm reconfiguration guide: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-reconfigure/
- Kubernetes kubeadm configuration reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-config/

## Issues Found
- The stale IPAM cleanup section used `calicoctl ipam check`, which is not listed in the current Calico Open Source `calicoctl ipam` command overview and is documented under Calico Enterprise. Changed the workflow to use `calicoctl ipam show --show-blocks`, `calicoctl ipam show --ip=<leaked-ip>`, and `calicoctl ipam release --ip=<leaked-ip>`, which are documented for Calico Open Source.
- The stale IPAM cleanup text referred to releasing "orphaned IPAM handles", but `calicoctl ipam release --ip` releases an IP address from Calico IPAM. Updated the wording to "leaked addresses".
- The block-size adjustment section deleted and recreated the pool directly. Calico's documented block-size migration workflow first creates a temporary non-overlapping pool, disables the original pool, recreates pods so allocations move, then recreates the original pool and migrates pods back. Updated the commands to reflect that safer documented sequence.

## Review Notes
- The IPPool YAML fields (`apiVersion`, `kind`, `cidr`, `ipipMode`, `natOutgoing`, `nodeSelector`, and `blockSize`) match the documented Calico IPPool schema.
- The kube-controller-manager flags `--allocate-node-cidrs`, `--cluster-cidr`, and `--node-cidr-mask-size` are valid Kubernetes flags. The kubeadm reconfiguration guide notes that kubeadm-managed control plane component changes must be reflected in static pod manifests under `/etc/kubernetes/manifests`.
- The example `kubectl delete pod -A --all` commands in the block-size workflow are intentionally disruptive and should only be run during the maintenance window already required by the post.
