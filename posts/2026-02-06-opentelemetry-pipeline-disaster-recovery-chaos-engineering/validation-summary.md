# Validation Summary: How to Test Your OpenTelemetry Pipeline Disaster Recovery Plan

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector internal telemetry
- Kubernetes NetworkPolicy
- Kubernetes kubectl
- LitmusChaos
- Python
- Prometheus metrics exposition
- GNU coreutils df

## Sources Consulted
- OpenTelemetry Collector internal telemetry: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector resiliency: https://opentelemetry.io/docs/collector/resiliency/
- LitmusChaos pod-delete experiment documentation: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-delete/
- LitmusChaos experiment configuration specification: https://litmuschaos.github.io/litmus/experiments/concepts/chaos-resources/chaos-experiment/configuration-specification/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- GNU coreutils df help output and documentation: https://www.gnu.org/software/coreutils/

## Issues Found
- The NetworkPolicy example was described as directly blocking collector traffic to the backend on port 4317. Kubernetes NetworkPolicy is allow-list based, so the example actually isolates egress for the selected pods and permits traffic matching the egress rules. I updated the description and comments to say it allows egress to all destinations except the backend subnet, and removed the port restriction so the example is a clearer backend-subnet partition.
- The metrics script tracked `otelcol_processor_dropped_spans`, which is not listed as a current OpenTelemetry Collector internal telemetry metric. I replaced it with `otelcol_exporter_enqueue_failed_spans_total`, which reflects spans that failed to enter the exporter queue.
- The metrics script used non-Prometheus counter names such as `otelcol_exporter_send_failed_spans`. The default Collector Prometheus endpoint appends `_total` to summation metrics, so I updated the tracked counter names to their default Prometheus form.
- The metrics parser overwrote repeated labeled time series and read the last field on each sample line. I changed it to sum matching series and read the sample value field, which works for Prometheus text lines with or without an optional timestamp.
- The CI check grepped for `dropped_spans{`, which does not match a current Collector internal metric. I changed it to sum `otelcol_exporter_enqueue_failed_spans_total` and fail when that value is nonzero.

## Review Notes
The `kubectl` command forms are valid according to the Kubernetes reference, although `kubectl` was not installed in the local environment for live command help checks. The Litmus `pod-delete` ChaosEngine API version and environment variables matched the current LitmusChaos documentation consulted. The disk-fill example uses GNU `df --output=avail`, which is valid for GNU coreutils but is not portable to non-GNU `df` implementations.
