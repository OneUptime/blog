# Validation Summary: How to Use the OpenTelemetry Log Viewer VS Code Extension

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Visual Studio Code extensions
- OpenTelemetry logs, traces, and trace context
- OpenTelemetry JavaScript SDK for Node.js
- OpenTelemetry Collector
- OTLP gRPC and OTLP HTTP
- Docker
- JSON Lines / JSONL log files

## Sources Consulted
- Visual Studio Marketplace: OpenTelemetry Log Viewer (`Tobias-Streng.vscode-opentelemetry-viewer`): https://marketplace.visualstudio.com/items?itemName=Tobias-Streng.vscode-opentelemetry-viewer
- VS Code extension command-line management: https://code.visualstudio.com/docs/configure/extensions/extension-marketplace
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resource docs: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript status page: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector troubleshooting docs for the debug exporter: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector contrib file exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/fileexporter
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/

## Issues Found
- The post described the extension as an OTLP receiver and trace/span tree viewer. The Marketplace documentation describes it as a viewer for OpenTelemetry logs in `.log` or `.jsonl` files, displayed in a filterable grid. Updated the post to describe local JSONL log inspection instead of live OTLP trace viewing.
- The extension install command used the wrong extension ID, `opentelemetry.otel-log-viewer`. Updated it to `Tobias-Streng.vscode-opentelemetry-viewer`.
- The installation section claimed the extension adds an activity bar icon and requires a restart. Updated it to match the documented toolbar button shown for `.log` and `.jsonl` files.
- The Node.js SDK example used `serviceName` directly in `NodeSDK`, which is not the current documented configuration style. Updated it to configure `service.name` through `resourceFromAttributes` and `ATTR_SERVICE_NAME`.
- The post used old semantic convention examples such as `http.method`, `http.url`, and `db.statement`. Updated examples to current names such as `http.request.method`, `url.full`, and `db.query.text`.
- The filtering example invented a query language expression (`service.name = ... AND status = ERROR`) not documented by the extension. Replaced it with a generic grid search example.
- The Collector example used a traces pipeline and described exporting traces for the extension. Updated it to a logs pipeline that writes JSON lines through the file exporter.
- The Docker mount path for the contrib Collector image was corrected to `/etc/otelcol-contrib/config.yaml`.
- The manual span example used numeric span status codes. Updated it to use `SpanStatusCode.OK` and `SpanStatusCode.ERROR` from `@opentelemetry/api`.

## Review Notes
- OpenTelemetry JavaScript logs support is still marked Development in the official language status page, so the post avoids depending on the JavaScript Logs SDK APIs directly and instead writes trace-correlated JSONL records for local inspection.
- The Collector file exporter is marked alpha for traces, metrics, and logs, but its documented JSON output is suitable for local debugging workflows.
