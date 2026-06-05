# Validation Summary: How to Monitor Kubernetes PersistentVolume Performance with OpenTelemetry

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector
- Kubernetes kubelet metrics and Summary API
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- OpenTelemetry kubeletstats receiver
- OpenTelemetry hostmetrics receiver
- OpenTelemetry Kubernetes attributes processor
- Prometheus-compatible alerting rules

## Sources Consulted
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector kubeletstats receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/kubeletstatsreceiver
- OpenTelemetry Collector kubeletstats receiver metric metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kubeletstatsreceiver/metadata.yaml
- OpenTelemetry Collector hostmetrics receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Collector hostmetrics disk scraper metric metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/internal/scraper/diskscraper/metadata.yaml
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- Kubernetes node metrics documentation: https://kubernetes.io/docs/reference/instrumentation/node-metrics/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics
- Prometheus OpenTelemetry guide: https://prometheus.io/docs/guides/opentelemetry/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Collector release information: https://github.com/open-telemetry/opentelemetry-collector-releases/releases

## Issues Found
- The post implied the kubeletstats receiver reads volume metrics from `/metrics/resource`. Updated the wording and diagram because kubeletstats reads kubelet summary data, while kubelet Prometheus metrics are a separate endpoint.
- The hostmetrics example used regular expression matching with glob-style patterns such as `sd*` and `/var/lib/kubelet/pods/*`. Changed them to valid regex patterns such as `sd.*` and `/var/lib/kubelet/pods/.*`.
- The hostmetrics example mounted only `/proc` but did not configure `root_path`. Updated the receiver config and DaemonSet to mount the host root at `/hostfs` with `root_path: /hostfs`, matching the official container deployment guidance.
- The Step 3 transform processor example tried to compute usage percent from metric names stored as datapoint attributes. That is not how OTTL datapoint context works, and kubeletstats does not emit capacity and available as datapoint attributes on the same point. Replaced it with a valid Kubernetes attributes processor example and clarified that it does not automatically map raw block devices to PVCs.
- The DaemonSet RBAC included `nodes/proxy` and broad PV/PVC/pod watch permissions but missed `nodes/pods` for kubeletstats extra metadata and the Kubernetes API permissions needed by `k8sattributes`. Adjusted the RBAC to match the documented receiver and processor requirements.
- The Collector image tag was `0.96.0`, which is outdated. Updated it to `0.153.0`, the latest official Collector contrib release found during review.
- The post described kubeletstats as providing used volume space directly. Updated the wording because the documented default volume metrics provide capacity and available bytes; used space can be computed from those values.
- The Prometheus alerting section did not mention that OTLP-to-Prometheus metric and label names depend on translation settings and resource attribute promotion. Added that caveat to prevent users from assuming the example names are universal.

## Review Notes
The corrected post is technically valid as a guide, but mapping node-level disk metrics to individual PVCs remains storage-driver-specific. Users may still need CSI-driver metrics, cloud-provider metadata, or backend-side joins to attribute raw disk latency to a specific PersistentVolume reliably.
