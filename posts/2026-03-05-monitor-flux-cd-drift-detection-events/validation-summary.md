# Validation Summary: How to Monitor Flux CD Drift Detection Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux kustomize-controller
- Flux helm-controller
- Flux notification-controller
- Kubernetes events and kubectl
- Prometheus and PrometheusRule
- Grafana dashboards

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux HelmRelease drift detection documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Kubernetes field selector documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/

## Issues Found
- The post said drift correction depends on `force` or `prune`. Flux Kustomizations use server-side apply dry-run to detect and correct drift; `force` only controls replacement when immutable field patching fails, and `prune` controls deletion of stale resources. Updated the explanation.
- The post said kustomize-controller compares the last applied configuration with the live state. Flux documentation describes a server-side apply dry-run against the desired manifests. Updated the wording.
- Notification `Provider` and `Alert` examples used `notification.toolkit.fluxcd.io/v1`, but the current Provider and Alert API is `notification.toolkit.fluxcd.io/v1beta3`; `notification.toolkit.fluxcd.io/v1` is for Receiver. Updated all Provider and Alert snippets.
- The Slack provider example included a channel while using an incoming webhook secret. Flux's Slack bot examples use a channel with the Slack API address and token, while webhook-style providers can take the address from the secret. Removed the channel from the incoming webhook example.
- The Prometheus section presented `gotk_reconcile_condition` as a current Flux controller metric and used `rate`/`increase` on it. Current Flux docs describe controller reconciliation duration metrics, controller-runtime metrics, and Flux resource status through kube-state-metrics as `gotk_resource_info`. Replaced the queries with current metric names and clarified that there is no dedicated drift counter.
- The Grafana dashboard reference to ID 16714 was not supported by current official Flux docs. Replaced it with a reference to the official Flux monitoring example dashboards.
- The HelmRelease drift section implied Helm drift detection and correction always happen. Current Flux docs require `.spec.driftDetection.mode` to be `warn` or `enabled`, and correction only happens with `enabled`. Updated the text.
- The exception guidance said `kustomize.toolkit.fluxcd.io/ssa: Ignore` can ignore specific fields. Flux documents it as skipping an entire resource; field/path ignores are available under HelmRelease `.spec.driftDetection.ignore`. Updated the recommendation.

## Review Notes
- `kubectl` was not installed in the local environment, so kubectl syntax was checked against Kubernetes official documentation rather than local `--help` output.
- The Prometheus alert rule remains an activity heuristic, not a true drift detector. Events and logs remain the most accurate signal for drift details.
