# Validation Summary: How to Configure MetalLB with Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes Services and `kubectl`
- MetalLB
- Helm
- BGP and Layer 2 load balancing

## Sources Consulted
- MetalLB installation docs: https://metallb.io/installation/
- MetalLB configuration docs: https://metallb.io/configuration/
- MetalLB usage docs: https://metallb.io/usage/index.html
- MetalLB API reference: https://metallb.io/apis/
- MetalLB layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB BGP concepts: https://metallb.io/concepts/bgp/
- MetalLB release notes: https://metallb.io/release-notes/
- Rancher Helm Charts and Apps docs: https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/helm-charts-in-rancher
- Helm `install` command reference: https://docs.helm.sh/docs/helm/helm_install/
- Kubernetes Service docs: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post presented the Helm install path and the Rancher Apps install path as sequential steps. MetalLB should be installed once, so Step 3 was corrected to make the Rancher UI flow an alternative to the Helm CLI flow.
- The Rancher UI instructions skipped adding the MetalLB Helm repository. Rancher requires the repository to be added under `Apps > Repositories` before the chart is available in `Apps > Charts`, so that step was added.
- The Service examples used the deprecated `metallb.universe.tf/*` annotation prefix. They were updated to the current `metallb.io/*` prefix documented by MetalLB.

## Review Notes
- The rest of the CRD examples align with the current MetalLB CRD-based configuration model (`IPAddressPool`, `L2Advertisement`, `BGPPeer`, and `BGPAdvertisement`).
- Rancher renamed `Apps & Marketplace` to `Apps` in Rancher v2.6.5, so posts covering the full Rancher 2.6 range should account for both labels.
- Kubernetes deprecated `.spec.loadBalancerIP` in v1.24. This post already uses MetalLB's provider-specific annotation for requesting a specific IP, which is the preferred direction.
- If Pod Security Admission is enforced in the target cluster, MetalLB's docs note that the `metallb-system` namespace may need privileged pod-security labels for the speaker pod to run.
