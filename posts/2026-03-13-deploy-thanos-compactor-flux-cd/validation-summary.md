# Validation Summary: Deploy Thanos Compactor with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository CRDs
- Thanos Compactor
- Bitnami Thanos Helm chart
- S3 object storage
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Thanos Compactor documentation: https://thanos.io/tip/components/compact.md/
- Thanos object storage documentation: https://thanos.io/tip/thanos/storage.md/
- Bitnami Thanos chart values: https://github.com/bitnami/charts/blob/main/bitnami/thanos/values.yaml
- Bitnami Thanos chart compactor Deployment template: https://github.com/bitnami/charts/blob/main/bitnami/thanos/templates/compactor/deployment.yaml
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The Helm chart version constraint used Bitnami Thanos chart `>=13.0.0 <14.0.0`, which is outdated for the current Bitnami chart series. Updated it to `>=17.0.0 <18.0.0`.
- `existingObjstoreSecret` and `existingObjstoreSecretItems` were nested under `compactor`, but the Bitnami Thanos chart defines them as top-level values. Moved them under `values` so the compactor receives the object-store configuration.
- The mounted object-store file path was `objstore.yaml`; the Bitnami chart documents custom secret item paths as `objstore.yml`. Updated the mounted path to `objstore.yml`.
- `compactor.serviceMonitor.enabled` is not a Bitnami Thanos chart value. Replaced it with `metrics.enabled: true` and `metrics.serviceMonitor.enabled: true`.
- The Flux health check targeted a `StatefulSet`, but the Bitnami chart renders the compactor as a `Deployment` when it is not configured as a CronJob. Updated the health check kind to `Deployment`.
- Added `fullnameOverride: thanos` so the rendered compactor Deployment name matches the health check name `thanos-compactor`.

## Review Notes
The Thanos compactor flags, retention flag concepts, S3 object-store configuration shape, single-replica behavior, downsampling explanation, and `thanos_compact_halted` monitoring guidance were consistent with the official Thanos documentation. The YAML snippets were parsed successfully after the fixes.
