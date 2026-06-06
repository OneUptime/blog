# Validation Summary: How to Monitor cert-manager Certificate Expiration, Issuance Latency,

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- cert-manager
- Kubernetes
- Prometheus metrics and PromQL
- OpenTelemetry Collector
- OpenTelemetry Collector Prometheus receiver
- OpenTelemetry Collector processors
- OTLP exporter

## Sources Consulted
- cert-manager Prometheus Metrics documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- cert-manager metrics package source documentation: https://pkg.go.dev/github.com/cert-manager/cert-manager
- cert-manager current metrics source: https://github.com/cert-manager/cert-manager/blob/master/pkg/metrics/metrics.go
- cert-manager certificate collector source: https://github.com/cert-manager/cert-manager/blob/master/internal/collectors/certificate_collector.go
- cert-manager Helm service template: https://github.com/cert-manager/cert-manager/blob/master/deploy/charts/cert-manager/templates/service.yaml
- cert-manager Helm deployment template: https://github.com/cert-manager/cert-manager/blob/master/deploy/charts/cert-manager/templates/deployment.yaml
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry Collector Kubernetes components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector filter processor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/filterprocessor
- Prometheus configuration documentation: https://prometheus.io/docs/operating/configuration/

## Issues Found
- The OpenTelemetry Collector Prometheus receiver treats `$` as environment-variable substitution in embedded Prometheus configuration. I changed relabel `replacement` values from `$1:9402` to `$$1:9402` so the Prometheus capture group is preserved.
- The static target used `cert-manager-controller.cert-manager.svc.cluster.local:9402`, but the cert-manager service template uses the release fullname, commonly `cert-manager`, for the controller metrics service. I changed the example target to `cert-manager.cert-manager.svc.cluster.local:9402`.
- The ACME failure alert used a non-existent `status_code` label and omitted a range selector for `rate()`. cert-manager exposes the ACME request counter with a `status` label, so I changed the query to `rate(certmanager_http_acme_client_request_count{status!="200"}[5m]) > 0`.
- The ACME latency alert described p99 as plain text rather than valid PromQL. cert-manager exposes `certmanager_http_acme_client_request_duration_seconds` as a summary with quantiles, so I changed it to `certmanager_http_acme_client_request_duration_seconds{quantile="0.99"} > 30`.
- The ready status description implied a single boolean metric. cert-manager emits one series for each ready-condition status (`True`, `False`, and `Unknown`), so I clarified that `condition="True"` should be used to check readiness.
- The ACME request duration description did not specify that the metric is a summary. I clarified that it is an ACME client request latency summary.

## Review Notes
The examples assume the OpenTelemetry Collector distribution includes the contrib `prometheus`, `filter`, and `transform` components. The static target example also assumes a conventional Helm release name of `cert-manager`; clusters using a different release name or PodMonitor-only setup may need a different service name or pod-based discovery.
