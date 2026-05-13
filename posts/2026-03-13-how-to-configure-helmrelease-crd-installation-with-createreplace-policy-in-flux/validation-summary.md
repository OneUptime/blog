# Validation Summary: How to Configure HelmRelease CRD Installation with CreateReplace Policy in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Helm Controller
- HelmRelease API
- HelmRepository API
- Helm charts and CRDs
- Kubernetes CRDs
- kube-prometheus-stack
- cert-manager
- kubectl

## Sources Consulted
- Flux HelmRelease guide: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Helm chart CRD documentation: https://helm.sh/docs/topics/charts/#custom-resource-definitions-crds
- kube-prometheus-stack chart README: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/README.md
- kube-prometheus-stack chart metadata: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/Chart.yaml
- kube-prometheus-stack values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager continuous deployment and GitOps documentation: https://cert-manager.io/docs/installation/continuous-deployment-and-gitops/

## Issues Found
- The original cert-manager example claimed Flux would manage CRDs with `CreateReplace` while setting `installCRDs: false`. This was inaccurate because Flux's `install.crds` and `upgrade.crds` policies apply to CRDs from the Helm chart CRD lifecycle, while current cert-manager documentation uses chart values such as `crds.enabled: true` to render and manage CRDs. I replaced the main example with kube-prometheus-stack and added a cert-manager caveat.
- The HelmRepository and verification commands were tied to the incorrect cert-manager example. I updated them to use the Prometheus Community Helm repository and kube-prometheus-stack CRDs.
- The introductory Helm behavior claim was too broad. I clarified that Helm's install-only CRD behavior applies to CRDs in the chart `crds/` directory.
- The conclusion incorrectly listed cert-manager as a representative `CreateReplace` example. I narrowed the conclusion to charts whose CRDs are bundled through Helm's CRD lifecycle.

## Review Notes
Could not run local `kubectl --help` checks because `kubectl` is not installed in this environment. The `kubectl get`, `kubectl describe`, and JSONPath usage shown in the post are standard Kubernetes CLI patterns and were reviewed conceptually against Kubernetes command behavior.
