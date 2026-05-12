# Validation Summary: Resource Quota Enforcement with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2.x (kustomize-controller, notification-controller)
- Kubernetes (ResourceQuota, LimitRange)
- kubectl CLI
- Prometheus / Grafana (mentioned for monitoring, not configured)
- Slack notification provider (referenced)

## Sources Consulted
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Notification Controller Alerts: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification Controller Providers: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification Controller v1 API reference: https://fluxcd.io/flux/components/notification/api/v1/
- notification-controller CHANGELOG: https://github.com/fluxcd/notification-controller/blob/main/CHANGELOG.md

## Issues Found
- **Incorrect Flux Alert API version** (Step 4): The post used `apiVersion: notification.toolkit.fluxcd.io/v1` for the `Alert` resource. As of Flux notification-controller v1.8.4 (April 2026), only the `Receiver` kind has been promoted to `v1`; `Alert` and `Provider` remain at `v1beta3`. Applying the original manifest would fail with `no matches for kind "Alert" in version "notification.toolkit.fluxcd.io/v1"`. Corrected to `notification.toolkit.fluxcd.io/v1beta3`.

## Review Notes
- The ResourceQuota manifest uses correct quota field names (`requests.cpu`, `requests.memory`, `limits.cpu`, `limits.memory`, `pods`, `services`, `persistentvolumeclaims`, `secrets`, `configmaps`) and is valid against Kubernetes v1 core API.
- The LimitRange manifest correctly uses `default`, `defaultRequest`, `min`, `max` fields for `Container` type and `max.storage` for `PersistentVolumeClaim` type — both supported.
- The Flux Kustomization uses `kustomize.toolkit.fluxcd.io/v1`, which is GA and correct. `dependsOn` field with `name` is the correct shape.
- kubectl commands in Step 4 are syntactically correct and produce useful output.
- The README has a duplicated header block (title/author/tags/description appearing twice at the top). Per review guidelines this is structural rather than technical and was left untouched.
- Best-practice note about applying quotas to `kube-system` is debatable in production — strict quotas there can destabilize the control plane. The post softens this with "careful minimum values" but operators should be cautious. Not changed.
- `eventSeverity: error` and the `Kustomization` event source in the Alert spec are valid values for v1beta3.
- The Alert `summary` field is not used here, which is fine since it is slated for deprecation in the eventual v1 promotion.
