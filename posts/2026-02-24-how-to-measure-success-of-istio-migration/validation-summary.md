# Validation Summary: How to Measure Success of Istio Migration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Kubernetes
- Prometheus and PromQL
- Grafana
- Kiali
- Envoy sidecars

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Envoy Statistics: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio Visualizing Your Mesh with Kiali: https://istio.io/latest/docs/tasks/observability/kiali/
- Istio Authentication Policy: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio Distributed Tracing Overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio Configure Trace Sampling: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus histograms and summaries: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The baseline command comment said it was recording error rates, but the command records pod CPU and memory usage with `kubectl top`. Changed the comment to "Record current resource usage."
- The sidecar injection shell example used `security.istio.io/tlsMode=istio` to count total pods and compared that with injected pods across all namespaces, which could produce an incorrect injection rate. Changed it to count pods and sidecars within namespaces labeled for Istio injection, including both `istio-injection=enabled` and `istio.io/rev`.
- The control-plane error query used `pilot_xds_push_errors`, which is not listed in current Istio metrics. Replaced it with `pilot_total_xds_internal_errors` and `pilot_total_xds_rejects`.
- The mTLS coverage query used raw counters and included source-side reports, where Istio documents `connection_security_policy` as `unknown`. Changed it to use a 5-minute rate window and `reporter="destination"`.
- The plaintext-check command used `istioctl proxy-config listeners -n production` without a required pod or workload target and did not reliably identify plaintext traffic. Replaced it with a Prometheus query for destination-side requests whose `connection_security_policy` is not `mutual_tls`.
- The distributed tracing section claimed the command measured the percentage of requests that generate traces, but it only checks Envoy stats. Updated the text and added a check for configured `randomSamplingPercentage`.
- The resource overhead PromQL examples used `container_cpu_usage_seconds_total` directly, which is a cumulative counter. Changed CPU usage examples to use `rate(...[5m])`.

## Review Notes
The remaining PromQL examples are valid patterns but may need label adjustments for a specific cluster's metric pipeline, especially if kube-state-metrics, cAdvisor, or Istio telemetry labels have been customized.
