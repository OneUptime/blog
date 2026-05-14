# Validation Summary: How to Set Up Cross-Cluster Service Discovery with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm
- Submariner
- Kubernetes Multi-Cluster Services API
- Istio multi-cluster service mesh
- kubectl
- istioctl

## Sources Consulted
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Helm releases guide: https://fluxcd.io/flux/guides/helmreleases/
- Submariner Helm deployment documentation: https://submariner.io/operations/deployment/helm/
- Submariner usage and Lighthouse service discovery documentation: https://submariner.io/operations/usage/
- Submariner latest release metadata: https://github.com/submariner-io/submariner/releases/tag/v0.24.0
- Kubernetes SIG Multicluster ServiceExport documentation: https://multicluster.sigs.k8s.io/api-types/service-export/
- Istio multi-primary multi-network installation guide: https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio multicluster troubleshooting guide: https://istio.io/latest/docs/ops/diagnostic-tools/multicluster/
- Istio deployment models documentation: https://istio.io/latest/docs/ops/deployment/deployment-models/
- Istio latest release metadata: https://github.com/istio/istio/releases/tag/1.29.2

## Issues Found
- The Submariner broker HelmRelease used outdated chart version `0.17.x` and broker values that do not match the current Helm deployment flow. Updated the chart version to `0.24.x` and removed misplaced broker `serviceDiscovery` / `globalnet` values.
- The Submariner member HelmRelease referenced a `HelmRepository` in the `submariner-operator` namespace without creating that namespace or repository. Added both resources to the snippet.
- The Submariner member values were missing required/current Helm values for the IPsec PSK and Lighthouse service accounts, and `globalnet` was under the wrong section. Added `ipsec.psk`, moved `globalnet` under `broker`, and added Lighthouse service account creation values.
- The comment for `natEnabled` incorrectly described it as the number of gateway nodes. Updated it to reflect that it controls NAT behavior between gateways.
- The Istio example used EOL chart version `1.21.x` and installed only `istiod`. Updated the examples to `1.29.x`, added the required `base` HelmRelease, and made `istiod` depend on `istio-base`.
- The Istio `global.multiCluster.enabled` and `PILOT_ENABLE_CROSS_CLUSTER_WORKLOAD_ENTRY` values were not part of the current documented multi-primary Helm install path. Removed them from the snippet.

## Review Notes
The examples remain illustrative and use placeholder credentials, API endpoints, and Flux substitutions. In production, remote cluster credentials and Submariner broker tokens should be managed with a secret management workflow such as SOPS, External Secrets, or Sealed Secrets rather than committed as literal values.
