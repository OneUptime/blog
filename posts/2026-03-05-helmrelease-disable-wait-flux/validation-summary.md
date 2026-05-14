# Validation Summary: How to Configure HelmRelease disableWait in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux HelmRelease API
- Helm
- Kubernetes
- GitOps

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI documentation for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Helm install command documentation: https://docs.helm.sh/docs/helm/helm_install/

## Issues Found
- The verification command used `flux get helmrelease my-app`, but the official Flux CLI documentation uses the plural `flux get helmreleases` subcommand. Updated the command to `flux get helmreleases -n default`, matching the namespace used by the examples.

## Review Notes
- The HelmRelease fields `spec.install.disableWait`, `spec.upgrade.disableWait`, `spec.install.disableWaitForJobs`, and `spec.upgrade.disableWaitForJobs` are valid in the current Flux v2 API.
- Current Flux documentation also exposes `.spec.waitStrategy` for controlling how resources are waited on after Helm actions. The post remains technically correct without covering that separate advanced option.
