# Validation Summary: How to Configure Pod CIDR Range for IPv4 in a Kubernetes Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubeadm
- kube-controller-manager
- kubectl
- CNI networking
- Flannel
- Calico
- IPv4 CIDR planning

## Sources Consulted
- Kubernetes kubeadm configuration API v1beta4: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Kubernetes `kubeadm init` reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes kubeadm implementation details: https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/
- Kubernetes `kube-controller-manager` reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes kubelet reference (`max-pods`): https://kubernetes.io/docs/reference/generated/kubelet
- Kubernetes blog on kubeadm v1beta4 deprecating v1beta3: https://kubernetes.io/blog/2024/08/23/kubernetes-1-31-kubeadm-v1beta4/
- Flannel official repository deployment instructions: https://github.com/flannel-io/flannel
- Calico configuration docs for manifests: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/config-options
- Calico `calico/node` configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico quickstart guide (current manifest version reference): https://docs.tigera.io/calico/latest/getting-started/kubernetes/quickstart

## Issues Found
1. **The kubeadm config example used deprecated API version `kubeadm.k8s.io/v1beta3`.** Updated the snippet to `kubeadm.k8s.io/v1beta4`, which is the current kubeadm configuration API documented by Kubernetes.

2. **The post presented `/24` node CIDRs and example node ranges as fixed outcomes instead of the default behavior.** Updated the wording to state that kubeadm configures the controller manager for per-node CIDR allocation when a Pod CIDR is supplied, and clarified that `/24` is the default IPv4 mask size rather than an invariant guarantee.

3. **The capacity calculation implied that a `/24` automatically means about 254 pods per node.** Clarified that a `/24` provides a 256-address node block with about 254 usable IPv4 addresses, but actual pod density also depends on kubelet `maxPods` (110 by default) and CNI behavior.

4. **The Flannel installation command was too broad for custom pod CIDRs and used a non-recommended manifest URL.** Updated it to Flannel's current recommended release manifest URL and added the required note that non-default pod CIDRs require editing the manifest network before applying it.

5. **The Calico instructions had the wrong sequence and used an outdated manifest version.** The original text told readers to apply `calico.yaml` first and only then set `CALICO_IPV4POOL_CIDR`, but Calico docs require matching the pod CIDR in the manifest before the first apply. Updated the instructions to download the manifest, edit `CALICO_IPV4POOL_CIDR`, and then apply it, and updated the referenced manifest version to the current release shown in Calico's latest docs.

## Review Notes
- Exact `spec.podCIDR` values assigned to individual nodes depend on node registration order and any custom controller-manager node CIDR mask settings.
- Current Calico documentation prefers operator-based installation for most environments. The post keeps the existing manifest-based approach, but the corrected instructions now match Calico's manifest customization guidance.
