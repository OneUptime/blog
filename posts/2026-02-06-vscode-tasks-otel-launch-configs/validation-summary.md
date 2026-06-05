# Validation Summary: How to Create Custom VS Code Tasks and Launch Configurations for

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Visual Studio Code tasks
- Visual Studio Code launch configurations
- OpenTelemetry
- OpenTelemetry Collector
- OpenTelemetry OTLP exporter configuration
- Node.js debugging
- Python OpenTelemetry auto-instrumentation
- debugpy
- Go debugging
- Jaeger
- Docker Compose

## Sources Consulted
- VS Code Tasks documentation: https://code.visualstudio.com/docs/debugtest/tasks
- VS Code Debug Configuration documentation: https://code.visualstudio.com/docs/debugtest/debugging-configuration
- VS Code Node.js Debugging documentation: https://code.visualstudio.com/docs/nodejs/nodejs-debugging
- VS Code Python Debugging documentation: https://code.visualstudio.com/docs/python/debugging
- debugpy configuration settings: https://github.com/microsoft/debugpy/wiki/Debug-configuration-settings
- OpenTelemetry JavaScript zero-code instrumentation: https://opentelemetry.io/docs/zero-code/js/
- OpenTelemetry Python zero-code configuration: https://opentelemetry.io/docs/zero-code/python/configuration/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Protocol Exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry zero-code instrumentation overview: https://opentelemetry.io/docs/concepts/instrumentation/zero-code/
- OpenTelemetry Go exporters documentation: https://opentelemetry.io/docs/languages/go/exporters/
- OpenTelemetry Collector Docker installation documentation: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector health check extension package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/healthcheckextension
- Jaeger deployment documentation: https://www.jaegertracing.io/docs/1.75/deployment/

## Issues Found
- The post said `runOn: folderOpen` makes the collector start automatically for every developer. VS Code requires a trusted workspace and asks the user to allow automatic tasks, so the text was updated to include that caveat.
- The Collector health check task used `/health`. The current health check extension defaults to `/`, so the command was changed to `curl -s http://localhost:13133/ | jq .`.
- The OTLP endpoint examples used port `4318` without setting the OTLP protocol. Since `4318` is the OTLP HTTP receiver, `OTEL_EXPORTER_OTLP_PROTOCOL` was added with `http/protobuf`.
- The Python debug configuration tried to launch `opentelemetry.instrumentation.auto_instrumentation` as a `debugpy` module, but the documented Python auto-instrumentation entrypoint is `opentelemetry-instrument`. The example was changed to a VS Code shell task that runs `opentelemetry-instrument python ${workspaceFolder}/app.py`, with a note about using `debugpy` attach for breakpoints.
- The Go section said Go does not have auto-instrumentation. OpenTelemetry now documents zero-code options for Go in some environments, so the text was narrowed to explain that the shown VS Code Go launch configuration assumes code-based tracing initialization.

## Review Notes
- The `docker-compose.otel.yml` file is referenced but not shown, so the tasks assume that file exposes OTLP HTTP on `4318`, Jaeger UI on `16686`, and the Collector health check extension on `13133`.
- The `View Jaeger UI` task uses `open` and `xdg-open`, which covers macOS and many Linux desktops but not Windows.
