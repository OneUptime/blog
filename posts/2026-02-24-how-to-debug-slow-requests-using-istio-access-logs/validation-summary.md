# Validation Summary: How to Debug Slow Requests Using Istio Access Logs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy access logs
- Istio Telemetry API
- Kubernetes kubectl
- jq
- awk

## Sources Consulted
- Istio Envoy Access Logs documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Telemetry API access logging task: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio MeshConfig and Envoy file access log provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Envoy substitution formatter and access log command operators: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter
- Envoy access log format documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Envoy CEL attributes documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes.html
- Envoy CEL access log filter API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/access_loggers/filters/cel/v3/cel.proto
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/

## Issues Found
- The Telemetry slow-request filter used `response.duration`; Envoy's current CEL attribute for total completed request duration is `request.duration`, so the expression was changed to `request.duration > duration('1s')`.
- Several jq examples assumed custom JSON fields named `duration_ms` and `upstream_service_time_ms`; Istio's default JSON access log commonly uses `duration` and `upstream_service_time`, so the examples now support both field-name styles.
- The percentile jq command did not slurp multiple JSON log lines into one array before sorting; it now uses `jq -s`.
- The timing field explanation incorrectly implied `REQUEST_DURATION`, `RESPONSE_DURATION`, and `RESPONSE_TX_DURATION` are additive. The definitions were corrected to match Envoy's cumulative timing operators, and `REQUEST_TX_DURATION` plus retry-attempt logging were added to the custom format example.
- The network-latency explanation said inbound sidecar-to-upstream traffic is on the same node. For inbound sidecar traffic, the proxy forwards to the application container in the same pod, so the wording was corrected.
- The retry section said access logs show no indication of retries except `URX`. Istio's default log does not include retry counts, but Envoy exposes `%UPSTREAM_REQUEST_ATTEMPT_COUNT%` and attempted-host operators for custom formats; the text was updated.
- The CPU throttling command comment implied `kubectl top pod` checks throttling. It only shows current CPU and memory usage, so the post now says to confirm throttling with container throttling metrics.

## Review Notes
The local environment did not have `kubectl` installed, so kubectl syntax was validated against official Kubernetes reference documentation rather than local `--help` output. jq syntax for the revised examples was checked locally with jq 1.7 and sample JSON input.
