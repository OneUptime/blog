# Validation Summary: How to Deploy External Secrets Operator with Flux HelmRelease

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux HelmRelease
- Flux Kustomization
- Kubernetes
- Helm
- External Secrets Operator
- Prometheus ServiceMonitor

## Sources Consulted
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- External Secrets Operator getting started documentation: https://external-secrets.io/latest/introduction/getting-started/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator API specification: https://external-secrets.io/latest/api/spec/
- External Secrets Operator Helm chart source: https://github.com/external-secrets/external-secrets/tree/main/deploy/charts/external-secrets
- External Secrets Operator CRD bundle source: https://github.com/external-secrets/external-secrets/tree/main/deploy/crds

## Issues Found
- The HelmRelease used `version: "0.x.x"`, which was not a concrete pinned chart version and no longer matches the current External Secrets Operator chart series. Changed it to `version: "2.4.1"` based on the current official chart metadata.
- The Flux Kustomization example was named `clusters/my-cluster/external-secrets/kustomization.yaml`, which conflicts with the Kustomize config filename for the same reconciled path. Changed the example location to `clusters/my-cluster/external-secrets.yaml` so the Flux Kustomization CR can reconcile the directory of plain manifests.
- The Flux Kustomization health checks targeted the Helm-managed Deployments directly. Flux documentation recommends checking the HelmRelease when a Kustomization contains HelmRelease objects, so the example now health-checks the `external-secrets` HelmRelease.
- The expected CRD list was incomplete for current External Secrets Operator releases. Added `clusterpushsecrets.external-secrets.io`, `pushsecrets.external-secrets.io`, and noted that generator CRDs are also installed.
- The dry-run `ExternalSecret` example used the deprecated `external-secrets.io/v1beta1` API. Updated it to the current GA `external-secrets.io/v1` API.
- The best-practice note about Flux health checks referred to checking both ESO Deployments. Updated it to match the corrected HelmRelease health check.

## Review Notes
- The `serviceMonitor.enabled: true` value is valid for the chart, but it only creates a usable ServiceMonitor when the Prometheus Operator CRD is present in the cluster.
- The ESO chart currently defaults `installCRDs` to `true`, but keeping the value explicit in GitOps configuration is technically valid.
