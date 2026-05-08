# Validation Summary: Preventing CIDRNotAvailable Errors in Calico and kubeadm

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- kubeadm
- Calico Open Source
- Calico IPAM
- calicoctl
- kubectl

## Sources Consulted
- Calico documentation: Get started with IP address management, https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico documentation: calicoctl validate, https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico documentation: calicoctl apply, https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: IPPool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl node status, https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Kubernetes documentation: Creating a cluster with kubeadm, https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
- Kubernetes documentation: Node status, https://kubernetes.io/docs/reference/node/node-status/

## Issues Found
- The introduction incorrectly described `CIDRNotAvailable` as a Calico IPAM allocation failure. Updated it to explain that the event comes from Kubernetes node CIDR allocation and that Calico IPAM does not use `Node.spec.podCIDR` allocations.
- The `calicoctl apply -f ... --dry-run` examples used an unsupported `calicoctl apply` flag. Replaced them with the documented `calicoctl validate -f ...` command for offline resource validation.
- The prevention checks did not include the Kubernetes controller-manager settings involved in node CIDR allocation. Added a command to inspect `allocate-node-cidrs` and `cluster-cidr`.
- The monitoring examples did not directly check for `CIDRNotAvailable` events. Added a `kubectl get events -A --field-selector reason=CIDRNotAvailable` command.

## Review Notes
The IPPool fields shown in the YAML example (`cidr`, `blockSize`, `ipipMode`, `natOutgoing`, and `disabled`) are valid for current Calico Open Source documentation. The `calico-system` namespace is correct for common operator-based Calico installations, but manifest-based installations may use `kube-system`; that is an operational caveat rather than a technical error in this post.
