# Validation Summary: How to Configure the Health Check Extension in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector health_check extension
- OpenTelemetry Collector internal telemetry
- Kubernetes liveness, readiness, and startup probes
- Docker Compose health checks
- HAProxy HTTP health checks
- Prometheus scraping and alerting

## Sources Consulted
- OpenTelemetry Collector health_check extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/healthcheckextension
- OpenTelemetry Collector health_check extension config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/internal/healthcheck/internal/http/config.go
- OpenTelemetry Collector healthcheckv2 extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/healthcheckv2extension
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/debugexporter
- Kubernetes probe documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Docker Compose services reference for healthcheck: https://docs.docker.com/reference/compose-file/services/
- HAProxy configuration manual: https://docs.haproxy.org/2.8/configuration.html

## Issues Found
- The post described separate `/health/alive` and `/health/ready` endpoints. The current legacy `health_check` extension exposes one configurable HTTP path, defaulting to `/`. Updated the architecture diagram and wording.
- The post claimed the legacy extension monitors receivers, processors, exporters, pipeline health, component readiness, and aggregated pipeline health. The official docs warn that `check_collector_pipeline` does not work as expected and recommend not using it. Updated the explanation and removed pipeline-checking configuration from examples.
- The basic Collector example used the deprecated `logging` exporter and `loglevel`. Replaced it with the current `debug` exporter and `verbosity`.
- Several snippets used `check_collector_pipeline` and an invalid `exporter_recovery_threshold` setting. Removed these unsupported or not-recommended fields.
- The multi-extension example configured `prometheus` as an extension and enabled it under `service.extensions`. Prometheus exposure for collector internal metrics is configured under `service.telemetry.metrics.readers`, not as a `prometheus` extension. Updated the example.
- The multi-extension example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Replaced it with the current pull reader Prometheus configuration.
- Kubernetes and Docker examples mounted a config at `/etc/otelcol/config.yaml` without passing that config path to the collector process. Added explicit `--config=/etc/otelcol/config.yaml` arguments.
- The Docker Compose health check assumed `curl` is available in the collector container. Added a caveat that the image must include `curl` or an equivalent HTTP client.
- The Kubernetes NetworkPolicy example implied kubelet probe traffic can generally be selected via the `kube-system` namespace. Updated the example to target monitoring/proxy pods and note that kubelet probe traffic is CNI-dependent.
- The monitoring section implied Prometheus was scraping the health check endpoint. Updated it to describe scraping collector internal metrics and aligned the alert job label.
- The troubleshooting and conclusion sections still implied health checks would detect pipeline/exporter failures. Updated them to recommend collector internal telemetry for pipeline/exporter failure detection.

## Review Notes
The post is now accurate for the documented legacy `health_check` extension behavior. Future versions may shift toward component-status-based health through the healthcheck v2 behavior or feature gate, so this article should be revisited if the legacy extension migration completes.
