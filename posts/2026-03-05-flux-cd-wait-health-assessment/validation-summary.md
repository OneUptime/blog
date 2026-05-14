# Validation Summary: How to Understand Flux CD Wait and Health Assessment

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux Kustomization API
- Flux HelmRelease API
- Kubernetes health and readiness status
- kstatus health assessment
- Flux CLI and kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux CLI `get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes sigs cli-utils kstatus package documentation: https://pkg.go.dev/sigs.k8s.io/cli-utils/pkg/kstatus

## Issues Found
- `spec.wait` and `spec.healthChecks` were described as additive. Flux documentation states that when `wait: true` is set, `spec.healthChecks` is ignored. I changed the explicit health check example to use `wait: false` and updated the explanation to describe the correct interaction.
- The explicit health check example used an Ingress health check. Flux Kustomization documentation lists supported built-in health check kinds and does not include Ingress. I replaced it with a HelmRelease health check, which is documented as supported.
- The custom resource health explanation implied every custom resource is assessed only by `Ready=True`. I narrowed the wording to kstatus-compatible resources and noted that kstatus can use the `Ready` condition for resources without type-specific rules.
- The Service readiness row was too absolute. I changed it to describe kstatus current-state behavior without implying every Service is always ready merely because it exists.
- The debugging command `flux get kustomization app -o wide` did not match current Flux CLI documentation. I changed it to `flux get kustomizations --namespace flux-system`.
- The HelmRelease example implied the wait behavior was configured by remediation fields. I added explicit `disableWait: false` fields under install and upgrade to show the documented wait setting.

## Review Notes
The examples use current Flux API versions for Kustomization (`kustomize.toolkit.fluxcd.io/v1`) and HelmRelease (`helm.toolkit.fluxcd.io/v2`). Helm upgrade remediation defaults can vary by retry configuration; the post's explicit `remediateLastFailure: true` example is valid.
