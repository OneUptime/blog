# Validation Summary: How to Deploy Cilium with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository resources
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- Hubble
- Kubernetes Ingress

## Sources Consulted
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Installation using Helm: https://docs.cilium.io/en/latest/installation/k8s-install-helm/
- Cilium Kubernetes Ingress Support: https://docs.cilium.io/en/stable/network/servicemesh/ingress/
- Cilium Layer 3 Policies: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium Deny Policies: https://docs.cilium.io/en/stable/security/policy/deny/
- Cilium Kubernetes Policy Constructs: https://docs.cilium.io/en/stable/security/policy/kubernetes/
- Cilium Troubleshooting: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The Helm values used `k8sServiceHost: "kubernetes.default.svc.cluster.local"` while enabling kube-proxy replacement. Cilium requires `k8sServiceHost` and `k8sServicePort` to point to a Kubernetes API endpoint reachable from the nodes, so the example now uses an explicit placeholder for a node-reachable API server address.
- The DNS-aware policy selected CoreDNS with unprefixed Cilium label keys. Updated the example to use the Cilium Kubernetes label form shown in the official DNS policy examples.
- The cluster-wide egress deny policy used `toCIDR` with an `exceptCIDRs` field. Cilium CIDR exceptions are expressed with `toCIDRSet` entries using `cidr` and `except`, so the policy was corrected.
- The cluster-wide namespace selector used an unprefixed namespace key. Updated it to `"k8s:io.kubernetes.pod.namespace"` to match Cilium's documented label selector form.
- Several verification and troubleshooting commands used the in-cluster Cilium agent as if it exposed the host-side Cilium CLI. Updated in-pod agent commands to use `cilium-dbg`, and changed the connectivity test to run via the local `cilium connectivity test` CLI.
- Added the Cilium CLI to the prerequisites because the corrected connectivity test command depends on it.
- The Cilium operator log command used a label selector that is not the current documented default for operator selection. Updated it to `io.cilium/app=operator`.

## Review Notes
- The Flux `dependsOn` example assumes a separate Flux Kustomization named `cilium-helm` exists for installing the Cilium HelmRelease. That is a valid pattern, but the post does not show that companion Kustomization.
- The chart version is pinned to the Cilium 1.16 minor stream. The examples reviewed are still compatible with the documented fields, but future updates should consider moving the version constraint to the current supported Cilium minor version used by the target cluster.
