# Validation Summary: How to Diagnose Helm Controller Memory Leaks in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux Helm Controller
- Kubernetes
- Helm
- Prometheus/PromQL
- Go pprof
- kubectl
- Flux CLI

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm Controller options: https://fluxcd.io/flux/components/helm/options/
- Flux advanced debugging and pprof documentation: https://fluxcd.io/flux/gitops-toolkit/debugging/
- Flux CLI `flux get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI `flux check` documentation: https://fluxcd.io/flux/cmd/flux_check/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Helm `helm history` documentation: https://helm.sh/docs/helm/helm_history/

## Issues Found
- Corrected the `maxHistory` explanation. The post said unset `maxHistory` causes unlimited history accumulation, but Flux defaults `.spec.maxHistory` to `5`; unlimited history is configured with `maxHistory: 0`.
- Softened claims that increasing memory metrics or positive Prometheus derivatives "confirm" a memory leak. These symptoms support investigation, but heap profiles and correlation with controller activity are needed before confirmation.
- Corrected the `valuesFrom` recommendation. ConfigMaps keep HelmRelease objects smaller and easier to manage, but the controller still has to load and merge the values during reconciliation.
- Corrected the failed-upgrade section. Flux remediation and `cleanupOnFail` affect failed releases and newly created Kubernetes resources, not controller heap memory directly.
- Replaced `flux check --pre` in the update section with `flux check`; `--pre` is for pre-installation checks, while `flux check` validates installed component health.

## Review Notes
The commands and configuration snippets are broadly valid for current Flux HelmRelease `v2`, Kubernetes, Helm, Prometheus, and pprof usage. The direct `kubectl patch deployment` examples are operationally valid but should be treated as emergency changes in GitOps-managed clusters; persistent controller argument and resource changes should normally be made in the Flux installation or cluster manifests.
