# Validation Summary: How to Configure Efficient Reconciliation Intervals in Flux CD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Kubernetes custom resources
- GitOps reconciliation
- Flux source-controller, kustomize-controller, helm-controller, and notification-controller
- Prometheus and PromQL

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/

## Issues Found
- The post stated that every Flux resource has an `interval` field. Updated this to say most reconciled Flux resources have an interval, since resources such as Receivers and Alerts do not use reconciliation intervals in the same way.
- The reconciliation explanation implied every interval reconciliation performs drift detection. Updated the wording to distinguish source polling, Kustomization drift correction, and HelmRelease drift detection when explicitly enabled.
- The OCI HelmRepository example recommended tuning `interval`, but Flux documents that `.spec.interval` is ignored for OCI HelmRepository resources. Removed the interval recommendation and noted that OCIRepository is preferred for improved OCI chart support.
- The HelmRelease examples described drift detection without enabling it. Added `driftDetection.mode: enabled`, because HelmRelease drift detection defaults to disabled unless configured.
- The Alert example referenced a Kustomization named `app-source`, but the snippet defined `app-source` as a GitRepository. Updated the event source to `kind: GitRepository`.
- The Prometheus retry-loop alert used `gotk_reconcile_condition`, which is not documented as a Flux controller metric. Replaced it with the documented `gotk_resource_info` metric from kube-state-metrics and added a note about that dependency.
- The average reconciliation duration PromQL divided raw cumulative counters. Replaced it with rate-based sums over a time window.

## Review Notes
The interval recommendations are operational guidance rather than fixed Flux requirements. Actual API load varies by controller, resource count, manifest size, health checks, cache state, and Kubernetes API behavior, so the resource-impact section should be treated as an estimation model.
