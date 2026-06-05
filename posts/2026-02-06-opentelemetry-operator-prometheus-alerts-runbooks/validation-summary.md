# Validation Summary: How to Use OpenTelemetry Operator Prometheus Alerts Runbooks

## Status
validated

## Post Type
Technical guide / runbook

## Technologies Covered
- OpenTelemetry Operator
- OpenTelemetry Collector
- Kubernetes
- Prometheus and PrometheusRule
- Alertmanager
- kube-state-metrics
- kubectl

## Sources Consulted
- OpenTelemetry Operator for Kubernetes documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Operator Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/operator/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector memory limiter processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/memorylimiterprocessor
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- kube-state-metrics project documentation: https://github.com/kubernetes/kube-state-metrics

## Issues Found
- The post said the OpenTelemetry Operator generates the alerts. I changed this to clarify that teams define Prometheus alerting rules for the operator and managed collectors.
- The metrics overview implied that operator metrics cover managed collector status directly. I corrected this to distinguish operator controller-runtime metrics, Collector internal telemetry, and kube-state-metrics workload status.
- The operator-down alert only used `absent(up{...} == 1)`, which would miss scrape targets that exist but report `up == 0`. I updated it to alert on both `up == 0` and absent targets.
- The reconciliation alert only matched the Collector controller while the text discussed both OpenTelemetryCollector and Instrumentation resources. I updated the selector and description to cover both.
- The collector readiness alert only covered StatefulSet-mode collectors. I updated it to include Deployment, StatefulSet, and DaemonSet workload metrics.
- The Collector exporter failure counters used OTLP metric names without the Prometheus `_total` suffix. I updated the alert expressions to use the Prometheus counter names.
- The memory alert could divide by a zero memory limit. I added a positive-limit guard.
- The queue saturation alert could divide by a zero queue capacity. I added a positive-capacity guard and corrected the label matching.
- The backend connectivity command used HTTP against port 4317, which is normally the OTLP gRPC port. I replaced it with a TCP connectivity check from a temporary BusyBox pod.
- The memory limiter example described `spike_limit_percentage` as the resume threshold and used `70`, which is not how the processor defines the field. I corrected the comments and changed the value to `20`.

## Review Notes
I could not run `kubectl` or `promtool` locally because they are not installed in this workspace, so command and PromQL validation was performed by static review against official documentation.
