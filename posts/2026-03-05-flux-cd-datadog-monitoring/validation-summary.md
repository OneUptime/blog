# Validation Summary: How to Configure Flux CD with Datadog for Monitoring

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- Datadog Agent Autodiscovery
- Datadog OpenMetrics integration
- Datadog dashboards and monitors
- Flux notification-controller Datadog provider

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Datadog Kubernetes Prometheus and OpenMetrics metrics collection documentation: https://docs.datadoghq.com/containers/kubernetes/prometheus/
- Datadog OpenMetrics integration documentation: https://docs.datadoghq.com/integrations/openmetrics/
- Datadog OpenMetrics example configuration: https://raw.githubusercontent.com/DataDog/integrations-core/master/openmetrics/datadog_checks/openmetrics/data/conf.yaml.example
- Datadog Prometheus/OpenMetrics metric mapping guide: https://docs.datadoghq.com/integrations/guide/prometheus-metrics/
- Datadog distribution metrics documentation: https://docs.datadoghq.com/metrics/distributions/
- Datadog monitor API documentation: https://docs.datadoghq.com/api/latest/monitors/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- controller-runtime reconcile metric documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/internal/controller/metrics

## Issues Found
- The Datadog Autodiscovery annotation examples omitted `init_config`. Datadog's documented AD Annotations v2 format includes `init_config`, so it was added to each OpenMetrics annotation payload.
- The P95 Datadog queries used a distribution metric without mentioning that Datadog percentile aggregations must be enabled for that distribution metric. Added this requirement before the dashboard queries and to the duration spike monitor note.
- The requeued reconciliation dashboard query used the cumulative counter directly while the surrounding reconciliation widgets use rates. Updated it to use `.as_rate()` so the widget represents requeue rate rather than an ever-growing counter value.

## Review Notes
- The Flux controller metrics endpoint, port, metric names, Datadog OpenMetrics counter naming without `_total`, Flux Datadog Provider fields, and `kubectl apply -k` usage match current official documentation.
- The Datadog API endpoint shown is for the US1 site. Other Datadog sites should use their site-specific API host.
