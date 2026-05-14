# Validation Summary: How to Use HelmRelease for Deploying MetalLB with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux HelmRelease
- Flux HelmRepository
- Kubernetes Services
- Kubernetes kube-proxy
- Helm
- MetalLB
- Prometheus Operator ServiceMonitor and PrometheusRule
- BGP

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB usage documentation: https://metallb.io/usage/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB Helm chart values and templates: https://github.com/metallb/metallb/tree/v0.15.3/charts/metallb

## Issues Found
- The HelmRelease example placed the HelmRelease object in `metallb-system` while relying on `install.createNamespace: true`. Flux can create the Helm target namespace, but the namespace containing the HelmRelease object must already exist. Changed the HelmRelease namespace to `flux-system` and added `spec.targetNamespace: metallb-system`.
- The HelmRelease example used `install.atomic` and `upgrade.atomic`, which are Helm CLI options but not valid fields in the Flux HelmRelease v2 install or upgrade schema. Removed both fields.
- The MetalLB chart values enabled `prometheus.serviceMonitor.enabled` while leaving the default `prometheus.rbacPrometheus: true` without setting `prometheus.namespace` and `prometheus.serviceAccount`. The chart requires those values when creating Prometheus RBAC. Added example values for the common kube-prometheus service account in the `monitoring` namespace.
- The Service example used the older `metallb.universe.tf/loadBalancerIPs` annotation. Current MetalLB documentation uses `metallb.io/loadBalancerIPs`. Updated the annotation.
- The verification command checked the HelmRelease in `metallb-system`; after correcting the HelmRelease namespace, updated it to check `flux-system`.
- Added a prerequisite note that clusters enforcing Pod Security Admission must allow privileged pods in the MetalLB namespace, matching MetalLB's Helm installation requirements for the speaker component.

## Review Notes
- The MetalLB CRD examples use current API versions: `IPAddressPool`, `L2Advertisement`, and `BGPAdvertisement` at `metallb.io/v1beta1`, and `BGPPeer` at `metallb.io/v1beta2`.
- The Helm chart version constraint `"0.x"` is a broad SemVer constraint. It is valid for Flux/Helm-style chart selection, but production GitOps repositories may prefer a narrower tested version range or exact chart version.
