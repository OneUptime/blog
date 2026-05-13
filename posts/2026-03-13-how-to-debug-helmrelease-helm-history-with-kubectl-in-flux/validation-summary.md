# Validation Summary: How to Debug HelmRelease Helm History with kubectl in Flux

## Status
validated

## Post Type
Tutorial / Debugging guide

## Technologies Covered
- Flux CD Helm Controller
- Flux HelmRelease custom resources
- Kubernetes Secrets and Events
- kubectl
- Helm CLI
- GitOps troubleshooting

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux CLI `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI `flux reconcile helmrelease`: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Flux CLI `flux suspend helmrelease`: https://fluxcd.io/flux/cmd/flux_suspend_helmrelease/
- Flux CLI `flux resume helmrelease`: https://fluxcd.io/flux/cmd/flux_resume_helmrelease/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Helm v3 `helm history` reference: https://helm.sh/docs/v3/helm/helm_history/
- Helm v3 `helm get manifest` reference: https://helm.sh/docs/v3/helm/helm_get_manifest/
- Helm v3 `helm get values` reference: https://helm.sh/docs/v3/helm/helm_get_values/
- Helm v3 `helm rollback` reference: https://helm.sh/docs/v3/helm/helm_rollback/
- Helm release storage documentation: https://helm.sh/docs/v3/topics/kubernetes_apis/

## Issues Found
- The post described Flux-managed Helm releases as being stored in the release namespace. Flux stores Helm release information in `.spec.storageNamespace`, which defaults to the HelmRelease namespace. I updated the text to use "storage namespace" and explain the default.
- The Helm and Secret examples assumed that the Helm release name is the same as the HelmRelease name and that the storage namespace is `default`. Flux allows `.spec.releaseName` and `.spec.storageNamespace` to change those values. I added a clarification before the examples.
- The `--with-source` explanation specifically said it reconciles the HelmRepository source and ensures the latest chart version. Flux documents the flag as reconciling the HelmRelease source, which may not always be a HelmRepository and does not guarantee a newer chart exists. I changed the explanation to say it refreshes the source and chart artifact used by the release.

## Review Notes
The local environment did not have `kubectl`, `helm`, or `flux` installed, so CLI validation was performed against official generated command documentation rather than local `--help` output. The article's manual deletion of Helm release Secrets is technically possible but should remain a last-resort recovery action because it mutates Helm's stored state outside Flux and Helm.
