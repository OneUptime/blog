# Validation Summary: How to Set Up Complete Monitoring Stack for Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Prometheus and Prometheus Operator
- kube-prometheus-stack
- Grafana
- Kiali
- Jaeger
- Alertmanager
- Helm

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Grafana integration documentation: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio Jaeger tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/jaeger/
- Istio trace sampling documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Kiali Helm installation documentation: https://kiali.io/docs/installation/installation-guide/install-with-helm/
- Kiali Prometheus configuration documentation: https://kiali.io/docs/configuration/p8s-jaeger-grafana/prometheus/
- Kiali Jaeger tracing configuration documentation: https://kiali.io/docs/configuration/p8s-jaeger-grafana/tracing/jaeger/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Kubernetes service discovery configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Jaeger Operator for Kubernetes documentation: https://www.jaegertracing.io/docs/1.76/deployment/operator/

## Issues Found
- The PodMonitor for Envoy sidecars did not explicitly select the Istio proxy metrics port and included a no-op annotation relabeling rule. Updated it to scrape the `http-envoy-prom` container port at `/stats/prometheus`, matching Istio's current Envoy metrics guidance.
- The Kiali Helm command used `external_services.tracing.url`, which is no longer the current Kiali tracing configuration field. Updated it to enable tracing with provider `jaeger`, `use_grpc=true`, and `external_services.tracing.internal_url`.
- The Jaeger Operator install commands referenced raw files from the repository `main` branch. Updated the example to use the official versioned release manifest installation pattern.
- The Istio tracing example used legacy Zipkin-style `defaultConfig.tracing.zipkin.address` configuration for Jaeger. Updated it to define a Jaeger OpenTelemetry extension provider and enable it with the Telemetry API.
- The sampling explanation referred to `sampling: 10`; updated it to `randomSamplingPercentage: 10`, the current Telemetry API field for percentage-based trace sampling.

## Review Notes
- The post remains a high-level production-oriented guide. Real production deployments should pin chart/operator versions, configure authentication and TLS for dashboards and telemetry services, and size Prometheus and Jaeger storage based on traffic volume and retention requirements.
