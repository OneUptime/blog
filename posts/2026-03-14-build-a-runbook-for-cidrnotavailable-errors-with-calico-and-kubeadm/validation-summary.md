# Validation Summary: Building a Runbook for CIDRNotAvailable Errors in Calico and kubeadm

## Status
validated

## Post Type
Troubleshooting guide / operational runbook

## Technologies Covered
- Kubernetes
- kubeadm
- kube-controller-manager node CIDR allocation
- Calico
- Calico IPAM
- calicoctl
- kubectl

## Sources Consulted
- Kubernetes kubeadm init reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes kube-controller-manager reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Calico IP address management documentation: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The introduction incorrectly described CIDRNotAvailable as an error caused by Calico being unable to find a CIDR block. Updated it to explain that CIDRNotAvailable is a Kubernetes node CIDR allocator event, while Calico IPAM allocates pod IPs from Calico IPPools and does not use `Node.spec.podCIDR`.
- The initial diagnosis commands only checked events in `calico-system`, which could miss Kubernetes node CIDR allocation events. Updated the event query to search all namespaces for CIDRNotAvailable events and added node pod CIDR and Calico IPPool checks.
- The RBAC example combined `kubectl auth can-i create ...` with `--list`, which is not valid usage. Replaced it with a valid single-action permission check and a separate `--list` command filtered for Calico resources.
- Replaced event sorting by `.lastTimestamp` with `.metadata.creationTimestamp` in updated examples to avoid relying on the legacy event timestamp field.

## Review Notes
The remaining commands are syntactically valid according to Kubernetes and Calico CLI references. Some operational details remain environment-specific, such as whether Calico runs in `calico-system` or `kube-system`, and whether `calicoctl` is configured to access the cluster datastore.
