# Validation Summary: How to Monitor Flux CD Image Scan Results

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux image-reflector-controller
- Kubernetes Custom Resources
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- Grafana
- Flux notification-controller

## Sources Consulted
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux custom Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/custom-metrics/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux CLI documentation for `flux get image policy`: https://fluxcd.io/flux/cmd/flux_get_images_policy/

## Issues Found
- The post claimed Flux exposes a built-in `gotk_image_repository_last_scan_tag_count` metric. Flux documents tag count as `.status.lastScanResult.tagCount`; resource status fields are exported to Prometheus through kube-state-metrics custom resource metrics, not by the Flux controller by default. Updated the Prometheus section and Grafana tag count example accordingly.
- The post used `gotk_reconcile_condition` queries and treated condition metrics as freshness timestamps. Current Flux monitoring documentation describes `gotk_resource_info` from kube-state-metrics for resource readiness and histogram components for reconcile duration. Replaced the readiness, scan success, and alert PromQL examples.
- The notification manifests used `notification.toolkit.fluxcd.io/v1` for Provider and Alert. Current Flux documentation uses `notification.toolkit.fluxcd.io/v1beta3` for these resources. Updated both manifests.
- The ImageRepository CLI output description said the output shows the latest tag, but the shown output and Flux docs expose latest tag samples in `.status.lastScanResult.latestTags`, not in that table. Corrected the wording.

## Review Notes
The guide is technically relevant and useful. The remaining examples assume a Flux monitoring setup that exports `gotk_resource_info` via kube-state-metrics, matching the Flux monitoring example. For deeper dashboards, a future post could include the kube-state-metrics custom metric configuration needed to graph ImageRepository tag counts directly.
