# Validation Summary: How to Troubleshoot Helm Controller Pod Crashes in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux
- Flux Helm Controller
- Kubernetes
- kubectl
- Helm
- HelmRelease custom resources

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm Controller options: https://fluxcd.io/flux/components/helm/options/
- Flux CLI `flux get helmreleases` reference: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux install manifest from official flux2 release artifacts: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
- Helm Kubernetes secrets storage driver source: https://github.com/helm/helm/blob/main/pkg/storage/driver/secrets.go
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post said Helm keeps 10 revisions by default for Flux HelmReleases. Flux HelmRelease `spec.maxHistory` defaults to 5, so the text was corrected.
- The Helm secret inspection command referenced the `meta.helm.sh/release-name` annotation, which is not how Helm release storage secrets identify releases. Helm storage secrets use labels such as `owner=helm`, `name`, `status`, and `version`, so the command was changed to print those labels and the encoded release data length.
- The guidance for deleting corrupted Helm storage secrets was too broad. The text now warns that deleting the current deployed revision can make Helm lose track of existing resources.
- The failed Helm tests section implied the controller enters a tight crash loop. Flux normally records failed/remediating release state and retries according to reconciliation and remediation behavior, so the wording was corrected.
- The CRD size section implied large CRDs directly crash the controller. The wording was adjusted to state that they cause Kubernetes API or etcd size-limit reconciliation failures and can contribute to memory pressure.
- The post said to use `crds: Skip` directly in the HelmRelease spec. Flux defines CRD policies under `spec.install.crds` and `spec.upgrade.crds`, so the text was corrected.

## Review Notes
The kubectl log, rollout, patch, and Flux status commands are syntactically valid. The JSON patch for the memory limit assumes a standard Flux install where the helm-controller container already has resource limits; official Flux install manifests include those limits.
