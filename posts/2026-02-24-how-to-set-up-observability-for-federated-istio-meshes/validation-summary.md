# Validation Summary: How to Set Up Observability for Federated Istio Meshes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio Telemetry API
- Istio distributed tracing
- Jaeger
- OpenTelemetry Protocol (OTLP)
- Prometheus federation
- PromQL
- Envoy access logs
- Kiali
- Kubernetes

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Configure tracing with Telemetry API: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- Istio Configure trace sampling: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio Distributed Tracing FAQ: https://istio.io/latest/about/faq/distributed-tracing/
- Istio Distributed Tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio Envoy access logs: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Configure access logs with Telemetry API: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Monitoring Multicluster Istio with Prometheus: https://istio.io/latest/docs/ops/configuration/telemetry/monitoring-multicluster-prometheus/
- Prometheus federation documentation: https://prometheus.io/docs/prometheus/latest/federation/
- Jaeger deployment documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- Kiali multi-cluster documentation: https://kiali.io/docs/configuration/multi-cluster/
- Kiali CR reference: https://kiali.io/docs/configuration/kialis.kiali.io/

## Issues Found
- Updated Istio Telemetry resources from `telemetry.istio.io/v1alpha1` to `telemetry.istio.io/v1`, which is the current stable API shown in Istio's Telemetry reference.
- Corrected the tracing configuration to enable tracing in `meshConfig` and avoid setting legacy `defaultConfig.tracing.sampling` at the same time as `randomSamplingPercentage` in the Telemetry API. Istio's sampling guide presents these as separate approaches.
- Corrected the trace propagation explanation. Istio proxies forward trace headers to applications, but applications must propagate headers from inbound to outbound requests for spans to be joined into one trace.
- Added the missing B3 propagation headers `x-b3-flags` and `b3`, which Istio documents for Zipkin/B3 propagation.
- Removed the VirtualService example that attempted to preserve trace context by setting `x-forwarded-client-cert`; that does not propagate trace headers and `destination.host: "*.local"` is not a valid general routing target.
- Replaced the Kiali ConfigMap example with a current Kiali CR example and noted the need for Kiali remote cluster secrets or the `kiali-multi-cluster-secret`. Current Kiali multi-cluster setup is driven by remote kubeconfig secrets mounted by the Kiali Operator.

## Review Notes
- The Jaeger all-in-one deployment is suitable as a lightweight example, but production deployments should use persistent storage and a scalable deployment model rather than the default in-memory all-in-one setup.
- The Prometheus federation pattern, Istio standard metric names, and PromQL labels used in the dashboard examples align with current Istio and Prometheus documentation, assuming the clusters are installed with distinct `global.multiCluster.clusterName` values.
