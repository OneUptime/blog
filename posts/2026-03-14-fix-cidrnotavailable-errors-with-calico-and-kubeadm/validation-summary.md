# Validation Summary: Fixing CIDRNotAvailable Errors in Calico and kubeadm

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes
- kubeadm
- kube-controller-manager node CIDR allocation
- Calico Open Source
- Calico IPAM
- Calico IPPool, Node, and BlockAffinity resources
- kubectl
- calicoctl

## Sources Consulted
- Kubernetes kube-controller-manager reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes kubeadm configuration API reference: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta3/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Calico IPAM overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IP pool migration guide: https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico calicoctl command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl IPAM reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico node decommissioning guide: https://docs.tigera.io/calico/latest/operations/decommissioning-a-node
- Calico BlockAffinity resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/blockaffinity

## Issues Found
- The introduction described CIDRNotAvailable as a Calico allocation error. Current Calico documentation states that Calico IPAM does not use Kubernetes `Node.spec.podCIDR`, and Kubernetes documents node CIDR allocation through kube-controller-manager. The introduction was corrected to identify CIDRNotAvailable as a Kubernetes node CIDR allocator event while still noting that Calico IPPool problems can cause related pod IP and connectivity failures.
- The post recommended changing the CIDR of an existing Calico IPPool with `calicoctl apply`. Calico's documented migration flow creates a new pool, disables the old pool, recreates pods so they receive addresses from the new pool, and then removes the old pool. The example was updated to follow that flow.
- The post did not check kube-controller-manager node CIDR allocation settings, which are central to CIDRNotAvailable events. A command was added to inspect `--allocate-node-cidrs`, `--cluster-cidr`, and `--node-cidr-mask-size`.
- The additional pool example did not warn that the pool should be non-overlapping and covered by the Kubernetes cluster CIDR and kube-proxy cluster CIDR configuration. This caveat was added to avoid unexpected NAT and routing behavior, and the example was marked as dependent on a cluster CIDR that covers both shown ranges.
- The post instructed readers to delete BlockAffinity resources manually. Calico documents BlockAffinity as IPAM-managed, with get/list/watch operations only in the referenced resource documentation. The cleanup step was changed to remove stale Calico Node resources using the documented node decommissioning command.
- The recovery checklist used `calicoctl ipam check`, which is not listed in the current Calico Open Source IPAM command reference. It was replaced with `calicoctl ipam show --show-blocks`.

## Review Notes
- The Calico namespace can differ by installation method. The post uses `calico-system`, which is correct for common operator-based installs, but manifest-based installs may use `kube-system`.
- `calicoctl node status` must be run on a host running the Calico node instance, according to the Calico command reference.
- `kubectl delete pod -A --all` is disruptive; it is technically part of Calico's documented migration workflow, but production users should plan a controlled rollout where possible.
