# Validation Summary: How to Filter Flux Alerts by Event Reason DependencyNotReady

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux notification-controller Alert and Provider resources
- Flux Kustomization and HelmRelease dependencies
- Kubernetes Events
- kubectl
- Flux CLI

## Sources Consulted
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux CLI `flux suspend kustomization` documentation: https://fluxcd.io/flux/cmd/flux_suspend_kustomization/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux kustomize-controller source for `DependencyNotReady` event behavior: https://github.com/fluxcd/kustomize-controller/blob/main/internal/controller/kustomization_controller.go
- Flux helm-controller source for `DependencyNotReady` event behavior: https://github.com/fluxcd/helm-controller/blob/main/internal/controller/helmrelease_controller.go
- Flux notification-controller source for Alert message filtering: https://github.com/fluxcd/notification-controller/blob/main/internal/server/event_handlers.go

## Issues Found
1. **Incorrect Notification API version**: The post used `notification.toolkit.fluxcd.io/v1` for Alert and Provider examples. Current Flux documentation exposes Alert and Provider in `notification.toolkit.fluxcd.io/v1beta3`; the v1 notification API reference currently documents Receiver. Updated all Alert and Provider snippets to `v1beta3`.

2. **Alert filters matched the reason string instead of the message**: The post used `.*DependencyNotReady.*` in `inclusionList` and `exclusionList`, but Flux Alert filters are evaluated against the event message content, not the Kubernetes Event reason. Updated the regex examples to match dependency-not-ready message text emitted by kustomize-controller and helm-controller.

3. **Progressing/retry filter examples matched likely reason strings instead of messages**: The retry-noise example used `ProgressingWithRetry` and `Progressing` patterns, but Alert filtering is message-based. Replaced those with a message-oriented `retrying` pattern.

4. **Unreliable test procedure**: The post suggested suspending a dependency to force a `DependencyNotReady` event. A suspended resource may keep its previous Ready condition, so this is not a reliable way to make the dependent object see an unready dependency. Updated the test to temporarily patch the dependency to an invalid path, reconcile the dependent object, then restore the original path and reconcile again.

5. **Overbroad wording about filtering by reason**: The article implied `inclusionList` directly filters by the `DependencyNotReady` reason. Updated wording to clarify that Flux Alerts filter dependency-not-ready event messages corresponding to that reason, while `kubectl --field-selector reason=DependencyNotReady` can be used to inspect Kubernetes Events by reason.

## Review Notes
- The `eventMetadata.summary` guidance is current: Flux documents `.spec.summary` as deprecated and recommends `.spec.eventMetadata.summary` or object annotations instead.
- The Microsoft Teams Provider example uses the supported `msteams` provider type and the Secret `address` key, which Flux documents as overriding `.spec.address`.
- The Kustomization dependency example is valid for `kustomize.toolkit.fluxcd.io/v1`.
