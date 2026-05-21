# Validation Summary: How to Integrate Istio with Apache SkyWalking

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Istio
- Apache SkyWalking
- SkyWalking Helm chart
- SkyWalking Satellite
- Kubernetes
- Envoy Access Log Service
- Envoy Metrics Service
- Istio Telemetry API

## Sources Consulted
- Istio Apache SkyWalking integration documentation: https://istio.io/latest/docs/ops/integrations/skywalking/
- Istio Telemetry API documentation: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio MeshConfig / ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Apache SkyWalking ALS documentation: https://skywalking.apache.org/docs/main/latest/en/setup/envoy/als_setting/
- Apache SkyWalking Envoy metrics service documentation: https://skywalking.apache.org/docs/main/v10.1.0/en/setup/envoy/metrics_service_setting/
- Apache SkyWalking Helm chart documentation: https://github.com/apache/skywalking-helm
- Apache SkyWalking backend setup documentation: https://skywalking.apache.org/docs/main/v10.2.0/en/setup/backend/backend-setup/
- Apache SkyWalking alerting documentation: https://skywalking.apache.org/docs/main/latest/en/setup/backend/backend-alarm/
- Apache SkyWalking Satellite Kubernetes deployment documentation: https://skywalking.apache.org/docs/skywalking-satellite/next/en/setup/examples/deploy/kubernetes/readme/

## Issues Found
- The Helm install commands used the older Apache JFrog Helm repository and omitted required chart values for current releases. Updated the examples to use the current OCI chart, explicit chart version, OAP/UI image tags, and a supported storage backend.
- The quick test install used `oap.storageType=memory`, which is not a current SkyWalking Helm storage option. Replaced it with a supported BanyanDB-based install and added an external Elasticsearch example.
- The Istio SkyWalking tracing provider example did not set a default tracing provider. Added `meshConfig.defaultProviders.tracing` so traces are sent to the configured SkyWalking provider by default.
- The Satellite Kubernetes Deployment used unverified environment variables and a floating `latest` image tag. Replaced it with the Helm-supported `satellite.enabled=true` path documented by SkyWalking.
- The metrics collection section showed an invalid OAP Prometheus fetcher ConfigMap for scraping Istio metrics directly. Replaced it with the documented Envoy Metrics Service configuration through Istio `meshConfig.defaultConfig.envoyMetricsService`.
- The alert rules used older `metrics-name`, `op`, `threshold`, and `count` fields. Updated them to the current MQE `expression`-based alarm rule syntax.

## Review Notes
The ALS-based service mesh observability examples are version-sensitive. SkyWalking still documents ALS integration, but current Istio tracing configuration is provider-based through `meshConfig.extensionProviders` and `Telemetry` resources. The post now reflects those distinctions.
