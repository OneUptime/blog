# Validation Summary: How to Validate Resolution of CIDRNotAvailable Errors with Calico and kubeadm

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- kubeadm
- Calico
- Calico IPAM
- calicoctl
- kubectl
- Prometheus
- Bash

## Sources Consulted
- Kubernetes kubeadm config documentation: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-config/
- Kubernetes kubeadm configuration API reference for `networking.podSubnet`: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta3/
- Kubernetes reconfiguring kubeadm clusters documentation: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-reconfigure/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl create deployment` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Calico IPAM overview and `calicoctl ipam` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico IP pool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IP address management guide: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico IP pool configuration guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/configure-ip-pools

## Issues Found
- The post used `calicoctl ipam check`, but the current official Calico IPAM command reference lists `release`, `show`, and `configure`, not `check`. Removed that command and changed the validation to use `calicoctl ipam show` and `calicoctl ipam show --show-blocks`.
- The post required the first Calico IPPool CIDR to exactly match kubeadm's pod subnet. Calico documentation allows multiple IP pools and recommends pools be within the Kubernetes pod CIDR, so the check now validates all Calico pools as subnets of the kubeadm pod subnet.
- The post treated missing `Node.spec.podCIDR` values as an unconditional failure. Calico documentation notes that Calico IPAM does not use Kubernetes node CIDR allocations and that `--allocate-node-cidrs=false` can be used to avoid `CIDRNotAvailable` events, so the node CIDR validation now depends on the remediation strategy.
- The test pod cleanup used the broad selector `-l run`, which could delete unrelated pods created by `kubectl run`. The commands now apply and select `app.kubernetes.io/name=cidr-test`, so cleanup is limited to validation pods.
- The cleanup command used `--grace-period=0` without `--force`. Current `kubectl run` reference notes that a zero grace period can only be used with force deletion, so `--force` was added.
- The troubleshooting section referenced `ipam check` output and `calicoctl ipam release` for leaked addresses. This was replaced with guidance based on `calicoctl ipam show --show-blocks` because `ipam check` is not in the current official command reference.

## Review Notes
The monitoring command is intentionally environment-specific because Prometheus labels, namespace, and endpoint access vary by installation. The post already notes that the Prometheus URL should be adjusted.
