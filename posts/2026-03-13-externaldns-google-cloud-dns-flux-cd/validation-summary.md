# Validation Summary: Deploy ExternalDNS with Google Cloud DNS Using Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ExternalDNS
- Google Cloud DNS
- Google Kubernetes Engine
- Kubernetes Services and Ingresses
- Flux CD HelmRelease and Kustomization
- Helm
- Prometheus ServiceMonitor

## Sources Consulted
- ExternalDNS GKE tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/gke/
- ExternalDNS v0.14.2 provider flags and Google provider implementation: https://github.com/kubernetes-sigs/external-dns/tree/v0.14.2
- ExternalDNS Helm chart 1.14.5 values and templates: https://github.com/kubernetes-sigs/external-dns/tree/external-dns-helm-chart-1.14.5/charts/external-dns
- ExternalDNS annotations documentation: https://github.com/kubernetes-sigs/external-dns/blob/v0.14.2/docs/annotations/annotations.md
- Flux HelmRelease v2 documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization v1 documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Ingress v1 documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The Helm values used `provider: google-cloud-dns`, but ExternalDNS v0.14.x accepts the Google Cloud DNS provider as `google`. Changed the values to `provider.name: google`, matching the chart's documented provider field and ExternalDNS provider flag.
- The credentials secret example used a literal placeholder API key and the HelmRelease set a non-functional `PROVIDER_KEY` environment variable. Google Cloud DNS authentication uses Application Default Credentials, so the snippet now creates a secret from a service account JSON file, mounts it into the pod, and sets `GOOGLE_APPLICATION_CREDENTIALS`.
- The Google provider example did not set the Cloud DNS project. Added `--google-project=your-cloud-dns-project-id` through `extraArgs`, which is required when ExternalDNS cannot infer the desired project or when DNS is in a separate project.
- The post used `annotationFilter` as a chart value, but ExternalDNS Helm chart `1.14.x` does not expose that dedicated value. Moved it to `extraArgs` as `--annotation-filter=...`, which ExternalDNS v0.14.x supports.
- The metrics snippet used `metrics.serviceMonitor.enabled`, but the kubernetes-sigs ExternalDNS Helm chart exposes `serviceMonitor.enabled` at the top level. Updated the values accordingly.
- The Flux Kustomization health check targeted the Helm-rendered Deployment. Flux documentation recommends health-checking the `HelmRelease` resource when a Kustomization applies HelmRelease objects. Updated the health check to target `helm.toolkit.fluxcd.io/v2` `HelmRelease`.
- The HelmRelease file comment pointed to a single YAML file while the Flux Kustomization path pointed to a directory. Updated the comment to `clusters/production/apps/external-dns/helmrelease.yaml` so the example layout is internally consistent.

## Review Notes
- The tutorial uses ExternalDNS chart `1.14.x`, which maps to ExternalDNS app versions around `v0.14.x`; newer chart and app versions exist, but the examples remain valid for the stated range after the fixes above.
- For production GKE, Workload Identity is generally preferred over static service account keys, but the static credential flow shown is supported by the official ExternalDNS GKE documentation.
