# Validation Summary: How to Use Go Auto SDK for Zero-Code OpenTelemetry Instrumentation

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry Go Automatic Instrumentation
- Go
- eBPF
- OpenTelemetry Operator
- Kubernetes
- Docker
- OTLP exporter configuration

## Sources Consulted
- OpenTelemetry Go Automatic Instrumentation README: https://github.com/open-telemetry/opentelemetry-go-instrumentation
- OpenTelemetry Go Automatic Instrumentation getting started guide: https://github.com/open-telemetry/opentelemetry-go-instrumentation/blob/main/docs/getting-started.md
- OpenTelemetry Go Automatic Instrumentation configuration guide: https://github.com/open-telemetry/opentelemetry-go-instrumentation/blob/main/docs/configuration.md
- OpenTelemetry Go Automatic Instrumentation compatibility matrix: https://github.com/open-telemetry/opentelemetry-go-instrumentation/blob/main/COMPATIBILITY.md
- OpenTelemetry Go Automatic Instrumentation design notes: https://github.com/open-telemetry/opentelemetry-go-instrumentation/blob/main/docs/how-it-works.md
- OpenTelemetry Operator auto-instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry SDK environment variable specification: https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/configuration/sdk-environment-variables.md
- OpenTelemetry SDK configuration documentation: https://opentelemetry.io/docs/languages/sdk-configuration/general/

## Issues Found
- The installation instructions referenced a non-current release asset and binary name. Updated the instructions to build `otel-go-instrumentation` from the official repository and install that binary.
- The CLI examples used unsupported flags such as `--pid`, `--service-name`, `--endpoint`, `--verbose`, and `--supported-versions`. Replaced them with current environment variables and CLI behavior, including `OTEL_GO_AUTO_TARGET_PID`, `OTEL_GO_AUTO_TARGET_EXE`, `OTEL_LOG_LEVEL`, and `otel-go-instrumentation -h`.
- The post claimed Go auto-instrumentation provided metrics collection. Current OpenTelemetry Go auto-instrumentation provides tracing instrumentation, so the claim was narrowed to distributed tracing and observability.
- The configuration example used non-standard `OTEL_SERVICE_VERSION` and `OTEL_DEPLOYMENT_ENVIRONMENT` variables. Replaced them with `OTEL_RESOURCE_ATTRIBUTES` entries.
- The instrumentation scope listed goroutine tracking as an instrumentation target and omitted supported kafka-go instrumentation. Replaced that item with kafka-go client instrumentation.
- The Kubernetes Operator example was missing the required Go target executable annotation. Added `instrumentation.opentelemetry.io/otel-go-auto-target-exe` and clarified the required privileged root sidecar behavior.
- The Docker example downloaded and ran the wrong binary. Updated it to copy `/otel-go-instrumentation` from the official auto-instrumentation image and run it with the current target PID environment variable.
- The limitations section incorrectly stated that stripped Go binaries are unsupported. Corrected it to reflect official support for stripped binaries, subject to supported Go and library versions.
- Troubleshooting examples referenced unsupported commands and environment variables, including `OTEL_GO_AUTO_DISABLE_INSTRUMENTATIONS`. Replaced them with current log-level, target, and binary-inspection commands.
- Several Go snippets had unused imports that would prevent compilation. Removed unused imports and added basic benchmark error handling.
- The Kubernetes security example used an invalid standalone `SecurityContext` object and non-current privilege guidance. Replaced it with a valid pod example that applies `privileged: true` and `runAsUser: 0` to the auto-instrumentation container.
- The future coverage section listed Kafka as future support even though kafka-go is already supported. Updated the wording to describe expansion beyond the currently supported libraries.

## Review Notes
The OpenTelemetry Go auto-instrumentation project is still marked work in progress upstream, and compatibility changes over time. Future reviews should re-check the supported Go versions, library versions, container image tags, and Operator injection requirements before publication.
