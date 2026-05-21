# Validation Summary: How to Set Up Apache SkyWalking with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache SkyWalking OAP and UI
- Istio
- Envoy Access Log Service
- Envoy Metrics Service
- Kubernetes manifests
- Elasticsearch storage
- SkyWalking alarm configuration

## Sources Consulted
- Apache SkyWalking documentation: Observe Service Mesh through ALS: https://skywalking.apache.org/docs/main/latest/en/setup/envoy/als_setting/
- Apache SkyWalking documentation: Send Envoy metrics to SkyWalking with/without Istio: https://skywalking.apache.org/docs/main/v10.1.0/en/setup/envoy/metrics_service_setting/
- Apache SkyWalking 9.7.0 documentation: Alerting: https://skywalking.apache.org/docs/main/v9.7.0/en/setup/backend/backend-alarm/
- Apache SkyWalking documentation: UI setup: https://skywalking.apache.org/docs/main/v9.7.0/en/setup/backend/ui-setup/
- Apache SkyWalking documentation: Backend telemetry and health check: https://skywalking.apache.org/docs/main/v9.4.0/en/setup/backend/backend-telemetry/ and https://skywalking.apache.org/docs/main/latest/en/api/health-check/
- Istio documentation: Apache SkyWalking tracing: https://istio.io/latest/docs/tasks/observability/distributed-tracing/skywalking/
- Istio documentation: Envoy access logs: https://istio.io/latest/docs/tasks/observability/logs/access-log/

## Issues Found
- The diagram and introductory text described Istio metrics as coming through Prometheus. Updated this to Envoy Metrics Service, which matches the configuration used later in the post.
- The OAP deployment used `SW_ENVOY_METRIC_ALS_HTTP_ANALYSIS=default` and `SW_ENVOY_METRIC_ALS_TCP_ANALYSIS=default`. `default` is the receiver selector, not an ALS analyzer. Updated both to `mx-mesh`, one of SkyWalking's documented service mesh ALS analyzers.
- The OAP deployment exposed the Prometheus telemetry port and used `/healthcheck` in troubleshooting without enabling the relevant OAP modules. Added `SW_TELEMETRY=prometheus` and `SW_HEALTH_CHECKER=default`.
- The example used two OAP replicas without cluster coordination. Reduced the minimal example to one replica so it works as a standalone deployment.
- The ALS IstioOperator example did not explicitly enable Envoy ALS. Added `enableEnvoyAccessLogService: true`.
- The standalone SkyWalking tracing provider example defined an extension provider but did not select it. Added `defaultProviders.tracing` so Istio uses the SkyWalking provider by default.
- The Envoy Metrics Service example used a `tlsSettings` block that is not part of the documented SkyWalking setup. Replaced it with the documented `proxyStatsMatcher.inclusionRegexps` entries SkyWalking recommends for Envoy metrics.
- The alarm examples used obsolete `metrics-name`, `op`, `threshold`, and `count` style rules. Updated them to the SkyWalking 9.7 MQE `expression` based rule format.

## Review Notes
The post remains version-specific to SkyWalking 9.7.0. Newer SkyWalking 10.x releases are available, but the 9.7.0 configuration patterns used here are still documented for that version.
