# Validation Summary: How to Configure Service Mesh Observability in Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Istio
- Prometheus
- Prometheus Operator
- Grafana
- Jaeger
- Kiali
- Helm

## Sources Consulted
- Rancher Istio documentation: https://ranchermanager.docs.rancher.com/v2.9/integrations-in-rancher/istio
- Rancher Monitoring internals: https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting/how-monitoring-works
- Rancher persistent Grafana dashboards: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/create-persistent-grafana-dashboard
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio tracing with Jaeger: https://istio.io/latest/docs/tasks/observability/distributed-tracing/jaeger/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio sample add-ons README: https://raw.githubusercontent.com/istio/istio/release-1.29/samples/addons/README.md
- Istio Prometheus Operator sample: https://raw.githubusercontent.com/istio/istio/release-1.29/samples/addons/extras/prometheus-operator.yaml
- Istio Jaeger sample add-on: https://raw.githubusercontent.com/istio/istio/release-1.29/samples/addons/jaeger.yaml
- Kiali Helm installation guide: https://kiali.io/docs/installation/installation-guide/install-with-helm/
- Kiali CR reference: https://kiali.io/docs/configuration/kialis.kiali.io/
- Kiali namespace management: https://kiali.io/docs/configuration/namespace-management/
- Kiali Jaeger integration: https://kiali.io/docs/configuration/p8s-jaeger-grafana/tracing/jaeger/
- Prometheus Operator getting started: https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post used the deprecated `telemetry.istio.io/v1alpha1` API for the `Telemetry` resource. I updated it to `telemetry.istio.io/v1`, which is the current stable Istio API.
- The original Telemetry example mixed metrics and tracing, and its `randomSamplingPercentage: 1.0` comment incorrectly described that as 100% sampling. I split the flow so Step 2 configures metrics only, and Step 6 updates the mesh-wide Telemetry resource to add tracing with the correct 1% interpretation.
- The Istio scrape configuration referenced removed control-plane components such as Mixer, Galley, and Citadel, and it used a `ServiceMonitor` for sidecars where the current official sample uses a `PodMonitor`. I replaced Step 3 with the current official Istio Prometheus Operator example adapted for Rancher Monitoring’s `release: rancher-monitoring` label.
- The Kiali CR used `deployment.accessible_namespaces`, which Kiali 2.0 no longer supports, and it used deprecated connection fields for Grafana and tracing. I removed the unsupported field and switched the configuration to `grafana.internal_url`, `tracing.provider: jaeger`, and `tracing.internal_url`, which matches current Kiali documentation.
- The post installed Jaeger via the legacy Jaeger Operator and `jaegertracing.io/v1` custom resource. Jaeger v1 reached end-of-life on December 31, 2025, so I replaced that section with Istio’s current Jaeger add-on manifest, which deploys Jaeger v2 in `istio-system`.
- The Istio tracing example used legacy Zipkin tracing configuration under `meshConfig.defaultConfig.tracing.zipkin.address`. I updated it to the current Istio pattern: define a Jaeger OpenTelemetry extension provider in `IstioOperator`, then select that provider from a `Telemetry` resource.
- The Grafana dashboard import loop created unlabeled ConfigMaps in `cattle-monitoring-system`, which Rancher Monitoring will not auto-provision as persistent dashboards. I updated it to create labeled ConfigMaps (`grafana_dashboard=1`) in `cattle-dashboards`, which matches Rancher’s documented provisioning flow.
- The error-rate alert expression actually computed success rate and the annotation described it as error rate. I changed the PromQL to calculate 5xx error rate directly and updated the description accordingly.
- The Jaeger access example port-forwarded a service in the wrong namespace and with the wrong service name for the updated setup. I corrected it to `svc/tracing` in `istio-system`.

## Review Notes
- Rancher’s Istio integration can install Kiali by default, and Jaeger can be enabled during Istio installation. The post’s manual installation flow remains usable after the fixes, but enabling these add-ons during the initial Istio install is often simpler.
- The Istio Jaeger add-on used in the corrected post is explicitly intended for development or testing. Production Jaeger deployments should follow the Jaeger project’s current Kubernetes guidance and sizing recommendations.
