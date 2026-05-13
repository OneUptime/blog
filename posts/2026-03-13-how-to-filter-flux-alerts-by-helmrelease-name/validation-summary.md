# Validation Summary: How to Filter Flux Alerts by HelmRelease Name

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux notification-controller
- Flux Alert and Provider custom resources
- Flux helm-controller and HelmRelease resources
- Kubernetes YAML manifests
- Slack incoming webhooks
- Flux CLI
- kubectl

## Sources Consulted
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux alerts monitoring guide: https://fluxcd.io/flux/monitoring/alerts/
- Flux CLI `flux reconcile helmrelease` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Flux CLI `flux get alerts` documentation: https://fluxcd.io/flux/cmd/flux_get_alerts/
- Flux CLI `get_alert.go` source for output columns: https://github.com/fluxcd/flux2/blob/main/cmd/flux/get_alert.go
- Flux notification-controller Alert CRD source for printer columns: https://github.com/fluxcd/notification-controller/blob/main/config/crd/bases/notification.toolkit.fluxcd.io_alerts.yaml

## Issues Found
- The Alert and Provider examples used `notification.toolkit.fluxcd.io/v1`, but the current Flux Alert and Provider API is `notification.toolkit.fluxcd.io/v1beta3`. Updated all Alert and Provider manifests to use `v1beta3`.
- The prerequisites claimed Flux CD v2.0 or later, which does not match the `v1beta3` Alert and Provider API used in the corrected examples. Updated the prerequisite to Flux CD v2.6 or later.
- The Slack provider example mixed a legacy incoming webhook secret with a `channel` field. The official legacy incoming webhook example uses the webhook `address` in the Secret and no `channel` field. Removed `channel`.
- The verification command used `kubectl get alerts` with an output table that no longer matches current `v1beta3` Alert CRD printer columns. Updated the command to `flux get alerts -n flux-system` and corrected the expected output columns and ready message.

## Review Notes
- Cross-namespace `eventSources` are valid, but platform administrators can disable cross-namespace selectors with `--no-cross-namespace-refs=true`; the post's cross-namespace example assumes that flag is not enabled.
- `eventSeverity: info` forwards both informational and error events, while `eventSeverity: error` forwards only error events, matching the current Flux documentation.
