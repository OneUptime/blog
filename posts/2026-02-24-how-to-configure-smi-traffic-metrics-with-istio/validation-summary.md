# Validation Summary: How to Configure SMI Traffic Metrics with Istio

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Istio
- Service Mesh Interface (SMI)
- SMI Traffic Metrics
- Kubernetes API aggregation / APIService
- Prometheus
- Helm
- kubectl

## Sources Consulted
- SMI Traffic Metrics specification: https://github.com/servicemeshinterface/smi-spec/blob/main/apis/traffic-metrics/v1alpha1/traffic-metrics.md
- SMI Metrics adapter repository and README: https://github.com/servicemeshinterface/smi-metrics
- SMI Metrics Istio adapter documentation: https://github.com/servicemeshinterface/smi-metrics/blob/main/docs/istio.md
- SMI Metrics Istio chart configuration: https://github.com/servicemeshinterface/smi-metrics/blob/main/chart/istio.yaml
- SMI Metrics Istio Mixer-era manifests: https://github.com/servicemeshinterface/smi-metrics/blob/main/chart/templates/crds.yaml
- Istio Prometheus integration docs: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio installation profiles docs: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio 1.8 change notes: https://istio.io/latest/news/releases/1.8.x/announcing-1.8/change-notes/
- Istio 1.8 upgrade notes: https://istio.io/latest/news/releases/1.8.x/announcing-1.8/upgrade-notes/

## Issues Found
- The post is based on the archived SMI Metrics adapter and archived SMI specification repositories. This makes the guide unsuitable as a current 2026 Istio tutorial.
- The SMI Metrics Istio adapter depends on Mixer-era Istio telemetry. Its Istio documentation says Istio must be installed with Mixer, and its chart emits `config.istio.io/v1alpha2` `instance`, `handler`, and `rule` resources. Istio 1.8 removed Mixer-related services, CRDs, and functionality, so these resources are not supported by current Istio.
- The adapter installation command in the post points to `https://raw.githubusercontent.com/servicemeshinterface/smi-metrics/master/deploy/adapter.yaml`, which returns 404. The upstream README documents Helm templating instead.
- The post states that the Istio `demo` profile includes Prometheus by default. Current Istio documentation installs Prometheus separately with the sample addon manifest.
- The adapter configuration snippet uses flags such as `--prometheus-url` and `--metrics-window`; the adapter binary exposes flags for `--config`, `--log-level`, `--admin-port`, `--api-port`, `--tls-cert-file`, and `--tls-private-key`, while Prometheus URL is configured through the YAML config.
- The post describes querying current Istio metrics through SMI, but the adapter's Istio queries expect custom `istio_smi_requests_total` and `istio_smi_request_duration_seconds_bucket` metrics, not the current standard Istio metrics such as `istio_requests_total` and `istio_request_duration_milliseconds`.

## Review Notes
This post should be removed or replaced with a different current observability guide. It cannot be made correct with small edits because the central integration path relies on unsupported Istio Mixer functionality.
