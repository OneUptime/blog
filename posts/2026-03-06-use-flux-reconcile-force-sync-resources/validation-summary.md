# Validation Summary: How to Use flux reconcile to Force Sync Resources

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes
- Kustomize Controller
- Helm Controller
- Source Controller
- Flux image automation
- Prometheus metrics

## Sources Consulted
- Flux CLI reference: `flux reconcile` - https://fluxcd.io/flux/cmd/flux_reconcile/
- Flux CLI reference: `flux reconcile kustomization` - https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI reference: `flux reconcile helmrelease` - https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Flux CLI reference: `flux reconcile source helm` - https://fluxcd.io/flux/cmd/flux_reconcile_source_helm/
- Flux CLI reference: `flux get` and `flux get all` - https://fluxcd.io/flux/cmd/flux_get/ and https://fluxcd.io/flux/cmd/flux_get_all/
- Flux Kustomization API reference v1 - https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux HelmRelease documentation - https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Prometheus metrics documentation - https://fluxcd.io/flux/monitoring/metrics/

## Issues Found
- The introduction described Flux as reconciling only with a Git repository and said `flux reconcile` works for any Flux resource. I changed this to "configured sources" and "supported Flux resources" because Flux also supports sources such as Helm repositories, OCI repositories, and buckets, and the CLI only exposes reconcile subcommands for specific resource types.
- The HelmRelease `--force` examples described the flag as resetting a stuck release. I changed those examples to use `--reset` for resetting failure counts, and described `--force` as a one-off install or upgrade. This matches the current Flux CLI and HelmRelease documentation.
- The HelmRelease `--with-source` description said it refreshes the Helm repository first. I changed this to "reconciles the HelmRelease's source first" because the source may vary by HelmRelease configuration.
- The monitoring example used `flux get all -A -o json`, but current Flux CLI documentation for `flux get` / `flux get all` does not document an `-o json` output flag. I replaced it with `kubectl get` over Flux custom resources and `jq`.
- The monitoring metric list included `gotk_reconcile_condition`, which is not listed in the current Flux Prometheus metrics page. I changed it to `gotk_resource_info`, the documented custom resource readiness metric in the current monitoring guidance.

## Review Notes
The main reconcile commands, source commands, `--with-source`, `--timeout`, `--no-header`, Kustomization API fields, dependency field, and image automation reconcile commands align with the current Flux documentation. The broad "reconcile all" script remains a useful operational example, but it intentionally ignores missing optional resource categories by redirecting errors.
