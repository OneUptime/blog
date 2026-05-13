# Validation Summary: How to Deploy WikiJS Documentation with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Wiki.js
- Flux CD
- Kubernetes
- Helm and HelmRelease
- Kustomize
- Bitnami PostgreSQL Helm chart
- NGINX Ingress

## Sources Consulted
- Wiki.js official website and feature list: https://js.wiki/
- Wiki.js Helm chart repository index: https://charts.js.wiki/index.yaml
- Wiki.js Helm chart 2.2.24 values and README from https://charts.js.wiki/charts/wiki-2.2.24.tgz
- Wiki.js Helm chart 3.0.0 values and README from https://charts.js.wiki/charts/wiki-3.0.0.tgz
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux CLI `get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Bitnami PostgreSQL Helm chart values: https://github.com/bitnami/charts/blob/main/bitnami/postgresql/values.yaml
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The post claimed the official Wiki.js Helm chart supports PostgreSQL, MySQL, and SQLite backends. Wiki.js supports several database backends, but the Helm chart configuration reviewed here is PostgreSQL-focused. Updated the wording to distinguish application support from chart support.
- The PostgreSQL HelmRelease referenced a `bitnami` HelmRepository that was never declared. Added the Bitnami Helm repository to Step 2.
- The Wiki.js HelmRelease used unsupported `db.*` values. The pinned chart range (`>=2.2.0 <3.0.0`) expects external PostgreSQL settings under `postgresql.postgresqlHost`, `postgresql.postgresqlPort`, `postgresql.postgresqlDatabase`, `postgresql.postgresqlUser`, `postgresql.existingSecret`, and `postgresql.existingSecretKey`. Updated the snippet accordingly.
- The Ingress snippet used `ingress.ingressClassName`, but the Wiki.js chart uses `ingress.className`. Updated the value key.
- The Wiki.js snippet included unsupported top-level `persistence` and `config` values for the selected chart version. Removed those settings.
- The Flux Kustomization example used `clusters/my-cluster/wikijs/kustomization.yaml` for a Flux custom resource while also pointing Flux at that same directory. That filename is reserved for Kustomize configuration in the target path. Added a Kustomize `kustomization.yaml` listing the local resources and moved the Flux Kustomization custom resource example to `clusters/my-cluster/wikijs-kustomization.yaml`.
- The best-practices section mentioned a Wiki.js MeiliSearch module, but current official Wiki.js materials do not document MeiliSearch as a built-in search module. Reworded the recommendation to use a dedicated search module such as Elasticsearch.

## Review Notes
The guide still uses imperative `kubectl create namespace` and `kubectl create secret` commands for bootstrap simplicity. For a stricter GitOps setup, these would usually be committed as declarative manifests or managed with a secret-management workflow such as SOPS, Sealed Secrets, or External Secrets.
