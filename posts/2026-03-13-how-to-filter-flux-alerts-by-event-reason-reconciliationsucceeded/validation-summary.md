# Validation Summary: How to Filter Flux Alerts by Event Reason ReconciliationSucceeded

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Flux CD
- Flux notification-controller
- Kubernetes custom resources
- Flux Alert and Provider resources
- Go regular expressions
- kubectl and flux CLI commands

## Sources Consulted
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Events documentation: https://fluxcd.io/flux/components/notification/events/
- Flux alerting guide: https://fluxcd.io/flux/monitoring/alerts/
- Flux notification-controller source, event alert matching: https://github.com/fluxcd/notification-controller/blob/main/internal/server/event_handlers.go
- Flux notification-controller Alert API type: https://github.com/fluxcd/notification-controller/blob/main/api/v1beta3/alert_types.go
- Flux kustomize-controller event emission source: https://github.com/fluxcd/kustomize-controller/blob/main/internal/controller/kustomization_controller.go

## Issues Found
- The post incorrectly used `notification.toolkit.fluxcd.io/v1` for Alert and Provider examples. Current Flux documentation uses `notification.toolkit.fluxcd.io/v1beta3` for Alert and Provider resources, while `notification.toolkit.fluxcd.io/v1` currently applies to Receiver resources. Updated all Alert and Provider snippets to `v1beta3`.
- The post claimed `inclusionList` filters by event reason and that the `ReconciliationSucceeded` reason appears in the event message. Flux events have separate `reason` and `message` fields, and notification-controller applies `inclusionList` to the event message only. Updated the explanation to state that Flux Alerts do not directly filter by reason and that `inclusionList` matches event messages.
- The original regex examples matched lowercase `reconciliation.*succeeded`, which would not reliably match current Kustomization success messages such as `Reconciliation finished...`, and would not reflect HelmRelease success messages that typically contain `succeeded`. Updated patterns to match `Reconciliation finished` or `succeeded`, with HelmRelease-only examples matching `succeeded`.
- Updated the verification wording so it no longer says the Alert matches `ReconciliationSucceeded` directly. It now states that the alert fires when the emitted event message matches the `inclusionList` pattern.

## Review Notes
The updated post is technically correct for message-based success filtering, but Flux Alert resources still cannot perform exact reason-field filtering. Future improvements could show controller-specific examples for Kustomization, HelmRelease, GitRepository, and OCIRepository messages because successful event text varies by Flux controller.
