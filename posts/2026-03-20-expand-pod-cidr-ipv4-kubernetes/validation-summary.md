# Validation Summary: How to Expand the Pod CIDR Range for IPv4 in an Existing Kubernetes Cluster

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Calico
- Calico IPAM
- Flannel
- IPv4 pod networking

## Sources Consulted
- Kubernetes `kube-controller-manager` reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes kubeadm dual-stack support: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/dual-stack-support/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IPAM overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico multiple IP pools documentation: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico IP pool migration documentation: https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico IP pool block size change procedure: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico `calicoctl patch` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico `calicoctl` Kubernetes datastore configuration: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Flannel official repository README: https://github.com/flannel-io/flannel

## Issues Found
- The post implied that adding a second Calico IPv4 pool expands the Kubernetes cluster Pod CIDR itself. I corrected the wording to make clear that additional Calico pools must remain within the existing Kubernetes cluster CIDR, and that growing the cluster CIDR itself requires a planned migration or rebuild.
- The Calico `IPPool` manifest used `apiVersion: crd.projectcalico.org/v1`, while current Calico resource documentation uses `apiVersion: projectcalico.org/v3`. I updated the manifest to the documented API version.
- The Calico `IPPool` example set both `vxlanMode` and `ipipMode`. Current Calico documentation states these fields cannot be set at the same time, so I removed `ipipMode`.
- The original secondary pool example used `10.245.0.0/16` without constraining the Kubernetes cluster CIDR. I added an explicit example where the cluster CIDR is `10.244.0.0/15`, making the old and new pools valid non-overlapping subsets.
- The post said new pods would automatically draw from whichever pool had addresses available. I corrected this to reflect Calico's documented pool-selection behavior: allocations depend on eligible pools, selectors, and annotations, and existing pods are not moved automatically.
- The `kube-controller-manager --cluster-cidr` guidance incorrectly presented comma-separated IPv4 CIDRs as a supported expansion path. I replaced that with the documented dual-stack form and clarified that this syntax is for IPv4 plus IPv6, not multiple IPv4 Pod CIDRs.
- The Flannel guidance suggested editing the ConfigMap to include both CIDRs or a larger supernet. Flannel's official documentation describes a single pod network CIDR, so I replaced that advice with a migration/rebuild caveat instead of an unsupported live-edit instruction.
- The "larger supernet" migration example created an overlapping Calico pool (`10.244.0.0/14`) over an existing pool. Calico documents that temporary migration pools must not overlap existing ones, so I replaced that section with a valid non-overlapping migration flow.
- The verification command used `calicoctl ipam show --summary`, but current `calicoctl ipam show` documentation does not include a `--summary` flag. I replaced it with `calicoctl ipam show`.
- I added an operator-specific caveat noting that operator-managed Calico installations should update the `Installation` resource instead of creating `IPPool` objects directly.

## Review Notes
- The post is now technically sound for Calico-based clusters that already have a Kubernetes cluster CIDR large enough to contain the additional pool.
- The post does not provide a generic in-place expansion path for single-stack IPv4 clusters using other CNIs, because the official Kubernetes and Flannel documentation do not describe one.
- The examples remain cluster-specific by necessity; operators should confirm their kube-proxy `--cluster-cidr`, Calico installation mode, and current pool layout before applying changes.
