# Validation Summary: How to Migrate from Harness CD to Flux CD

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Harness CD
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository
- Kustomize overlays
- Flagger canary deployments
- GitOps pull request approval workflows

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization v1 API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `resume kustomization` documentation: https://fluxcd.io/flux/cmd/flux_resume_kustomization/
- Flagger canary documentation: https://docs.flagger.app/usage/how-it-works
- Flagger deployment strategy documentation: https://docs.flagger.app/main/usage/deployment-strategies
- Harness manual approval documentation: https://developer.harness.io/docs/platform/approvals/adding-harness-approval-stages/
- Harness deployment verification documentation: https://developer.harness.io/docs/continuous-delivery/verify/verify-deployments-with-the-verify-step

## Issues Found
- The HelmRelease example placed the HelmRepository in `flux-system` and the HelmRelease in `production`, but the `sourceRef` did not specify `namespace: flux-system`. Flux source references default to the HelmRelease namespace when omitted, so the example would look for the repository in `production`. Added `namespace: flux-system`.
- The Flagger Canary example omitted `spec.service.port`. Flagger's documented traffic-shifting canary examples include the service port so Flagger can generate the service/routing objects for the target workload. Added `service.port: 80`.

## Review Notes
The remaining Flux API versions and fields are current for Flux `source.toolkit.fluxcd.io/v1`, `helm.toolkit.fluxcd.io/v2`, and `kustomize.toolkit.fluxcd.io/v1`. The chart repository URL, chart name, and application values are illustrative placeholders rather than validated installable artifacts.
