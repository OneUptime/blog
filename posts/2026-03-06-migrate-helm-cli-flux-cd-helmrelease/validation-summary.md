# Validation Summary: How to Migrate from Helm CLI to Flux CD HelmRelease

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Flux CD
- Flux Helm Controller
- Flux Source Controller
- Flux Notification Controller
- Helm
- Kubernetes
- Kustomize
- GitOps

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Manage Helm Releases guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux HelmRelease component documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux `get helmreleases` CLI reference: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux `reconcile helmrelease` CLI reference: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1 and v1beta3: https://fluxcd.io/flux/components/notification/api/v1/ and https://fluxcd.io/flux/components/notification/api/v1beta3/
- Helm `helm list` documentation: https://helm.sh/docs/v3/helm/helm_list/
- Helm `helm get values` documentation: https://helm.sh/docs/helm/helm_get_values/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The post said Flux automatically handles rollbacks and drift correction as a general behavior. Updated the wording to clarify that rollback policies are configured behavior and drift correction is optional.
- The `valuesFrom` ConfigMap example placed the ConfigMap in `flux-system` while the `HelmRelease` was in `ingress-nginx`. Flux values references must refer to ConfigMaps or Secrets in the same namespace as the `HelmRelease`, so the ConfigMap namespace was changed to `ingress-nginx`.
- The verification commands used `flux get helmrelease my-app -o yaml`, but the documented Flux status command is `flux get helmreleases` and is not the right tool for fetching the resource manifest. Changed that example to `kubectl get helmrelease my-app -n default -o yaml`.
- The command for producing JSON from HelmReleases used `flux get helmreleases -A -o json`, but the documented Flux status command does not expose that JSON output flag. Changed it to `kubectl get helmreleases -A -o json`.
- The Alert example used `notification.toolkit.fluxcd.io/v1` for `kind: Alert`, but current Flux documentation lists Alert under `notification.toolkit.fluxcd.io/v1beta3`; the v1 API reference currently covers Receiver. Updated the API version to `v1beta3`.
- The Alert example used deprecated `.spec.summary`. Changed it to `.spec.eventMetadata.summary`.
- The Alert example used `namespace: "*"` in `eventSources`. Flux documentation supports `name: "*"` for all objects of a kind in a specific namespace, not a wildcard namespace. Replaced it with explicit namespace entries for the namespaces used in the article.

## Review Notes
The examples use the older `.spec.chart.spec.sourceRef` HelmRelease style, which is still documented and valid. Flux also supports `.spec.chartRef` for referencing existing chart artifacts, but changing the examples was not necessary for correctness.
