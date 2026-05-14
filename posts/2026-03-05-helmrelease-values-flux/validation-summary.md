# Validation Summary: How to Configure HelmRelease Values in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux Helm Controller
- Flux CLI
- Kubernetes
- Helm
- HelmRelease custom resources
- YAML

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI `reconcile helmrelease` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Helm `show values` command documentation: https://helm.sh/docs/helm/helm_show_values/
- Helm `template` command documentation: https://helm.sh/docs/helm/helm_template/
- Bitnami NGINX chart documentation on Artifact Hub: https://artifacthub.io/packages/helm/bitnami/nginx/15.0.1

## Issues Found
- The Bitnami NGINX 15.x example used `service.port`, but Bitnami NGINX chart 15.x renamed this value to `service.ports.http`. Updated the example to use `service.ports.http: 80`.
- The merge-order explanation said inline `spec.values` always has the highest priority. Flux documents an exception: a `valuesFrom` entry with `targetPath` overwrites prior values, including inline values at that path. Added this caveat.
- The post suggested `flux reconcile helmrelease nginx --dry-run -n default`, but the current Flux CLI documentation for `flux reconcile helmrelease` does not include a `--dry-run` flag. Replaced it with a valid reconcile command and adjusted the surrounding text.

## Review Notes
- The remaining HelmRelease API examples use the current `helm.toolkit.fluxcd.io/v2` API and match Flux's documented `spec.values` and `spec.valuesFrom` behavior.
- The `helm show values` and `helm template` commands use documented Helm flags.
