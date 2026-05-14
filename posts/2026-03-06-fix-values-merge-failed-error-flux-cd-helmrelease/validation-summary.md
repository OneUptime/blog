# Validation Summary: How to Fix 'values merge failed' Error in Flux CD HelmRelease

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Flux CD helm-controller
- Flux HelmRelease custom resource
- Helm values and chart schema validation
- Kubernetes ConfigMaps and Secrets
- kubectl, helm, flux CLI commands
- YAML configuration

## Sources Consulted
- Flux HelmRelease values documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux `flux reconcile helmrelease` command reference: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Flux `flux debug helmrelease` command reference: https://fluxcd.io/flux/cmd/flux_debug_helmrelease/
- Helm chart schema documentation: https://helm.sh/docs/topics/charts/
- Helm `helm template` command reference: https://helm.sh/docs/helm/helm_template/
- Kubernetes `kubectl apply` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The introduction described inline HelmRelease YAML syntax errors as a direct cause of helm-controller's `values merge failed` error. This was corrected because malformed HelmRelease YAML is rejected before helm-controller can reconcile the resource.
- The "Common Cause 1" section implied invalid inline YAML in `spec.values` would produce a values merge failure. This was clarified as a manifest parsing/apply-time problem that is commonly confused with a values merge failure.
- The schema validation section stated that values failing `values.schema.json` cause the merge itself to fail. This was corrected because Helm schema validation happens after Flux composes the final values.
- The merge-order section omitted Flux's documented `targetPath` caveat. A note was added that `targetPath` behaves like Helm `--set` and can overwrite previously set values, including inline values.
- The `optional` flag comments implied all missing or broken optional references are ignored. This was narrowed to Flux's documented behavior: only a not-found error for the referenced ConfigMap or Secret is ignored; missing keys, malformed values, target path errors, and transient errors still fail reconciliation.
- The conclusion was updated to distinguish true values merge failures from related manifest parsing and Helm schema validation failures.

## Review Notes
The CLI commands and HelmRelease field names are current and match official Flux, Helm, and Kubernetes documentation. The local environment did not have `kubectl`, `helm`, or `flux` installed, so command verification was performed against official command references rather than local `--help` output.
