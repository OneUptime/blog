# Validation Summary: Deploy ExternalDNS with Azure DNS Using Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ExternalDNS
- Azure DNS
- Azure Workload Identity
- Flux CD
- Kubernetes
- Helm
- kubectl
- DNS

## Sources Consulted
- ExternalDNS Azure DNS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/azure/
- ExternalDNS Helm chart documentation: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- ExternalDNS annotations documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ExternalDNS sources documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/about/
- ExternalDNS providers documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/providers/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization API documentation: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The Azure DNS credential example used a generic `key` value in a Kubernetes Secret and injected it through a non-standard `PROVIDER_KEY` environment variable. Updated the example to create an `azure.json` file and store it in a secret named `external-dns-azure`, matching the ExternalDNS Azure provider documentation.
- The HelmRelease used `provider: azure-dns`, but the current ExternalDNS chart expects `provider.name: azure`, and scalar `provider: <name>` is deprecated. Updated the provider configuration accordingly.
- The Helm chart version was pinned to `1.14.x`, while the current ExternalDNS chart documentation lists `1.20.0`. Updated the example to `1.20.x` and adjusted values to the current chart schema.
- The Azure Workload Identity requirements were missing from the prerequisites and Helm values. Added the service account annotation, service account label, and pod label required by the ExternalDNS Azure DNS Helm guidance.
- The metrics configuration used `metrics.serviceMonitor.enabled`, but the current chart exposes `serviceMonitor.enabled` at the top level. Updated the values block.
- The Flux Kustomization health check targeted the Helm-rendered Deployment. Updated it to health check the `HelmRelease`, which is the resource applied by that Kustomization and is the Flux-recommended pattern for Kustomizations containing HelmRelease objects.
- The HelmRelease file path did not match the Kustomization path. Updated the file comment to place the HelmRelease under `clusters/production/apps/external-dns/`.

## Review Notes
The examples assume Azure Workload Identity. A service-principal-based setup is still possible with ExternalDNS, but it would require a different `azure.json` content and secret-handling flow.
