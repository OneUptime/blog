# Validation Summary: How to Filter Flux Alerts by Namespace

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux notification-controller
- Kubernetes custom resources
- Flux Alert and Provider resources
- Flux CLI
- kubectl
- Slack and PagerDuty notification routing

## Sources Consulted
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux `flux get alerts` CLI documentation: https://fluxcd.io/flux/cmd/flux_get_alerts/
- Flux `flux reconcile kustomization` CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux notification-controller CRDs: https://github.com/fluxcd/notification-controller/tree/main/config/crd/bases

## Issues Found
- The Alert and Provider examples used `notification.toolkit.fluxcd.io/v1`, but the current Flux notification-controller documentation and CRDs use `notification.toolkit.fluxcd.io/v1beta3` for Alert and Provider resources. Updated all Flux notification API snippets to `v1beta3`.
- The prerequisite said "Flux CD v2.0 or later", which could imply old Flux installations using earlier notification API versions. Updated it to require a current Flux CD release to align with the `v1beta3` examples.
- The verification command used `kubectl get alerts -n flux-system` with a sample `READY` / `STATUS` table. The Flux monitoring documentation recommends `flux get alerts` for alert acknowledgement/status. Updated the command to `flux get alerts --namespace flux-system` and adjusted the sample output.
- The verification note said only the production alert should fire after reconciliation, but the production example uses `eventSeverity: error`, so a successful reconciliation may not fire that alert. Clarified that matching depends on both event source and severity filters.
- The troubleshooting section described Alert namespace "visibility" in broad terms. Updated it to reflect the documented `--no-cross-namespace-refs=true` controller flag, which prevents Alerts from referencing event sources in other namespaces.

## Review Notes
The namespace filtering behavior, wildcard `name: '*'` usage, source resource kinds, event severity values, Provider `secretRef` usage, and `flux reconcile kustomization --namespace` command were verified against official Flux documentation and are technically correct after the changes above.
