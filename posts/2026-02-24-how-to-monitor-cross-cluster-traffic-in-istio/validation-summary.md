# Validation Summary: How to Monitor Cross-Cluster Traffic in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Prometheus and PromQL
- Thanos
- Grafana
- Kiali
- Jaeger / Zipkin
- OpenTelemetry Collector

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Zipkin tracing configuration: https://istio.io/latest/docs/tasks/observability/distributed-tracing/zipkin/
- Istio trace sampling and Telemetry API: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Prometheus federation: https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus releases: https://github.com/prometheus/prometheus/releases
- Thanos sidecar documentation: https://thanos.io/v0.7/components/sidecar/
- Thanos releases: https://github.com/thanos-io/thanos/releases
- Grafana dashboard and panel documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/
- Kiali multi-cluster documentation: https://kiali.io/docs/configuration/multi-cluster/
- Kiali CR reference: https://kiali.io/docs/configuration/kialis.kiali.io/
- OpenTelemetry Collector configuration: https://opentelemetry.io/docs/collector/configuration/

## Issues Found
- The custom Prometheus Envoy scrape job selected the `istio-proxy` container and then replaced `__address__` with only a port number from an annotation. That would not produce a valid host:port target. Changed the scrape job to match Istio's documented proxy metrics port name pattern, `.*-envoy-prom`.
- The Istiod scrape job only matched the service name and did not restrict scraping to Istiod's documented `http-monitoring` endpoint port. Updated the relabel rule to match `istiod;http-monitoring`.
- The Prometheus and Thanos sidecar example used older image tags. Updated them to current release tags available at validation time.
- The Grafana panel snippet used the older string datasource form. Updated it to the current dashboard JSON object form with datasource type and uid.
- The Istio tracing snippet used legacy `values.global.tracer.zipkin.address` configuration. Replaced it with a current `meshConfig.extensionProviders` Zipkin provider plus a `telemetry.istio.io/v1` Telemetry resource that enables the provider and sets sampling.

## Review Notes
- The PromQL metric names and labels used for Istio request, latency, TCP bytes, source cluster, and destination cluster are consistent with Istio standard metrics.
- The federation example is consistent with Prometheus federation documentation, including `/federate`, `honor_labels`, and `match[]`.
- The Kiali multi-cluster CR snippet uses explicit remote cluster secret references, which remains valid, although current Kiali docs also support and commonly recommend auto-discovered multi-cluster secrets.
