# Validation Summary: How to Configure Resource Quotas with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes ResourceQuota
- Kubernetes namespaces and resource management
- Kustomize overlays and patches
- Flux CD Kustomization
- Flux notification-controller Alerts
- kubectl

## Sources Consulted
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes kubectl run generated reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kustomize patches reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux notification Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification API reference: https://fluxcd.io/flux/components/notification/api/

## Issues Found
- The Kustomize overlay examples used a single multi-document `patch.yaml` file with the current `patches` field. Kustomize documents `patches` as a list of patch entries, and path-based examples use separate patch files. I split the examples into one patch file per ResourceQuota and updated the overlay kustomizations accordingly.
- The Flux Alert example used `notification.toolkit.fluxcd.io/v1` for an Alert. Current Flux documentation lists Alert under `notification.toolkit.fluxcd.io/v1beta3`, so I changed the snippet to `v1beta3`.
- The Flux Alert example used `quota-team-*` as a partial wildcard. Flux documents exact object names or the full `*` wildcard, not glob-style prefixes. I changed the example to list `quota-team-alpha` and `quota-team-beta` explicitly.
- The verification command used `kubectl run --requests`, which is not present in the current generated `kubectl run` reference. I replaced it with a server-side dry-run Pod manifest applied from stdin.
- The troubleshooting note said any compute quota requires both requests and limits. Kubernetes requires explicit requests when `requests.cpu` or `requests.memory` are set, and explicit limits when `limits.cpu` or `limits.memory` are set. I updated the wording to match that behavior.

## Review Notes
Local `kubectl` and `flux` binaries were not installed in the workspace, so CLI verification was performed against the current official generated Kubernetes and Flux documentation instead of local `--help` output.
