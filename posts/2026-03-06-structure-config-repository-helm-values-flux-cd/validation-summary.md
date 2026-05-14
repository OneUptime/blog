# Validation Summary: How to Structure Config Repository for Helm Values in Flux CD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Flux CD
- Flux HelmRelease
- Flux HelmRepository
- Flux Kustomization
- Helm
- Kustomize
- Kubernetes ConfigMaps and Secrets

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Helm releases guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux CLI `flux get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Helm `helm get values` documentation: https://helm.sh/docs/v3/helm/helm_get_values/
- Helm `helm list` documentation: https://helm.sh/docs/helm/helm_list/

## Issues Found
- The Bitnami `HelmRepository` used `type: oci` with the HTTP chart repository URL `https://charts.bitnami.com/bitnami`. Flux expects OCI HelmRepository URLs to use an OCI registry URL such as `oci://...`, so I removed `type: oci`.
- The repository layout listed `helm-releases.yaml`, but the examples use Kustomize overlays and Flux Kustomization manifests. I updated the layout to list `kustomization.yaml` and `flux-kustomization.yaml`.
- The PostgreSQL `valuesFrom` explanation said inline values have the lowest precedence. Flux merges `valuesFrom` entries in order and then merges inline `spec.values` over them, so I corrected the comment to state that inline values override `valuesFrom`.
- The PostgreSQL ConfigMap example was labeled `credentials-configmap.yaml` while containing non-sensitive base values. I renamed the example path to `base-values-configmap.yaml`.
- The cluster Kustomize overlays referenced a PostgreSQL HelmRelease that depends on `postgresql-base-values`, but did not include the ConfigMap manifest that creates it. I added `base-values-configmap.yaml` to the staging and production resources.
- The ingress-nginx production values comment described a pod disruption budget, but the YAML configured autoscaling. I corrected the comment.
- The Flux command for a single HelmRelease used the singular resource form. The official Flux command is `flux get helmreleases`, so I updated it to `flux get helmreleases ingress-nginx -n ingress-system`.
- The Helm verification section described `helm get values` as rendered values. Helm documents `helm get values` as release values and `--all` as including computed values, so I corrected the wording and added a `--all` example.

## Review Notes
- The examples use Flux `helm.toolkit.fluxcd.io/v2`, `source.toolkit.fluxcd.io/v1`, and `kustomize.toolkit.fluxcd.io/v1`, which are current API versions in Flux documentation.
- Flux documentation now recommends OCI-based Helm charts with `OCIRepository` and `chartRef` for production in some cases, but the `HelmRepository` plus `spec.chart` pattern shown in this post remains documented and valid for HTTP/S Helm repositories.
