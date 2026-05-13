# Validation Summary: How to Test Flux HelmRelease with flux debug helmrelease

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Flux CLI
- Flux HelmRelease
- Kubernetes
- Helm
- HelmRepository
- ConfigMaps and Secrets

## Sources Consulted
- Flux CLI documentation for `flux debug helmrelease`: https://fluxcd.io/flux/cmd/flux_debug_helmrelease/
- Flux CLI documentation for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI documentation for `flux get sources helm`: https://fluxcd.io/flux/cmd/flux_get_sources_helm/
- Flux CLI documentation for `flux reconcile helmrelease`: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Flux CLI documentation for `flux export helmrelease`: https://fluxcd.io/flux/cmd/flux_export_helmrelease/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux CLI v2.7.0 `--help` output for `debug helmrelease`, `get helmrelease`, and `get source helm`

## Issues Found
- `flux debug helmrelease podinfo -n default` was described as showing status output, but current Flux documentation shows status output behind `--show-status`. Updated status-debug examples to include `--show-status`.
- `flux get helmrelease podinfo -n default -o yaml` used an unsupported Flux `-o yaml` flag. Replaced it with `kubectl get helmrelease podinfo -n default -o yaml`.
- The post said HelmRelease YAML status includes "last attempted values"; the API exposes revision and config/value digests, not the raw attempted values. Updated the wording to "last attempted revision and config digest."
- The post said `--show-values` includes chart default values. Flux documents it as merging values from `valuesFrom` and inline `values`; Helm chart defaults are applied later during rendering. Updated the explanation.
- `flux get source helm podinfo -n flux-system -o yaml` used the unsupported Flux `-o yaml` flag. Replaced it with `kubectl get helmrepository podinfo -n flux-system -o yaml`.
- The Helm template section claimed it showed exactly what resources Flux would create or update. Tightened the wording to say it inspects manifests Helm would render, because Flux-specific behavior such as post-rendering or cluster-dependent rendering can affect the final applied result.

## Review Notes
The Flux CLI confirmed `helmrelease` is a valid alias for `helmreleases`, and `source helm` is accepted as an alias path for `sources helm`. The `flux debug helmrelease` command is currently documented as preview/under development, so future Flux releases may change its behavior.
