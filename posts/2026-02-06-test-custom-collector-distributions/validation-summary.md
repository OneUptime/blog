# Validation Summary: How to Test Custom Collector Distributions Before Production Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Builder
- OpenTelemetry Collector configuration
- OpenTelemetry Collector debug exporter
- telemetrygen
- Docker Compose
- Kubernetes Deployments
- GitHub Actions
- Go unit testing

## Sources Consulted
- OpenTelemetry Collector Builder documentation: https://opentelemetry.io/docs/collector/extend/ocb/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector troubleshooting documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector overview and component stability documentation: https://opentelemetry.io/docs/collector/
- OpenTelemetry hostmetrics receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry telemetrygen README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/telemetrygen/README.md
- telemetrygen CLI help from `ghcr.io/open-telemetry/opentelemetry-collector-contrib/telemetrygen:latest`
- OpenTelemetry Collector Contrib CLI help and config validation from `ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:latest`
- Go package documentation for `go.opentelemetry.io/collector/consumer/consumertest`: https://pkg.go.dev/go.opentelemetry.io/collector/consumer/consumertest
- Kubernetes container command and args documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- GitHub Actions `setup-go` documentation: https://github.com/actions/setup-go

## Issues Found
- The Docker Compose integration example described `telemetrygen` as a mock OTLP backend. `telemetrygen` is a telemetry generator, and the example configured it to sleep rather than receive data. I removed the mock backend service and clarified that the integration test verifies output through the Collector debug exporter.
- The Compose example included a container healthcheck that assumed the custom collector image contained `curl`. I removed that image-specific assumption because the script already checks the exposed health endpoint from the host.
- The load-test script described `--rate` as a total spans-per-second setting, but telemetrygen applies `--rate` per worker. I changed the script to compute a per-worker rate from the target total rate.
- The load-test script used `docker stats otel-collector` without defining that container name. I added `container_name: otel-collector` to the Compose example so the later memory check has a matching container name.
- The Kubernetes canary Deployment mounted `/etc/otel/config.yaml` but did not explicitly pass that config path to the collector. I added `args: ["--config=/etc/otel/config.yaml"]`.
- The GitHub Actions workflow used Go `1.22` with `builder@latest`. Current OpenTelemetry Collector Builder examples use newer Go tooling, and `setup-go` supports explicit `1.25` syntax, so I updated the workflow to `go-version: '1.25'`.
- The CI workflow started Docker Compose before running an integration script that also starts and stops Compose. I changed the CI step to run the script directly.

## Review Notes
The Collector config examples validated successfully with the current `opentelemetry-collector-contrib:latest` image. The telemetrygen flags used in the post are present in the current telemetrygen image. The debug exporter log-string checks are plausible for smoke integration tests, but a future improvement would be to use a purpose-built test receiver or inspect exported OTLP payloads for stronger assertions.
