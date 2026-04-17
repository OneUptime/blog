# Validation Summary: How to Migrate from Datadog to OneUptime

## Status
validated

## Post Type
Migration guide / Tutorial

## Technologies Covered
- Datadog (Agent, APM, dd-trace, ddtrace, Log Management, Synthetics, Monitor API)
- OneUptime (Infrastructure Agent, Telemetry/OTLP ingestion, Logs Management, Status Pages, On-Call)
- OpenTelemetry (Collector, SDK for Node.js and Python, OTLP HTTP exporter, auto-instrumentation, filelog receiver)
- Fluentd / Fluent Bit (out_http output plugin)
- Docker / Docker Compose
- npm, pip package managers

## Sources Consulted
- OneUptime OpenTelemetry docs: https://oneuptime.com/docs/telemetry/open-telemetry (confirmed `https://oneuptime.com/otlp` base endpoint and `x-oneuptime-token` header)
- OneUptime Fluentd docs: https://oneuptime.com/docs/telemetry/fluentd (confirmed `https://oneuptime.com/fluentd/logs` endpoint and required headers including `x-oneuptime-service-name`)
- OneUptime Server Monitor docs: https://oneuptime.com/docs/monitor/server-monitor (confirmed actual install script URL)
- Cross-referenced patterns with existing OneUptime blog posts for OTLP endpoint conventions (SDKs use `/otlp/v1/<signal>`; Collector uses `/otlp` base)
- OpenTelemetry specification for `OTEL_EXPORTER_OTLP_ENDPOINT` env var behavior
- Datadog API reference for `https://api.datadoghq.com/api/v1/monitor` endpoint
- npm/PyPI package names: `dd-trace`, `ddtrace`, `@opentelemetry/sdk-node`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/auto-instrumentations-node`, `opentelemetry-api`, `opentelemetry-sdk`, `opentelemetry-exporter-otlp`, `opentelemetry-instrumentation`

## Issues Found
1. **Incorrect OneUptime infrastructure agent install URL.** The post used `https://oneuptime.com/agent/install.sh`, which does not exist. Per the official OneUptime server monitor docs, the actual command is `curl -sSL https://oneuptime.com/docs/static/scripts/infrastructure-agent/install.sh | sudo bash`, followed by `oneuptime-infrastructure-agent configure ...` and `... start`. Updated the snippet to use the correct URL and added the required configure/start steps so readers can actually get the agent running.

2. **Incomplete Fluentd configuration.** The Fluentd `out_http` block was missing the required `x-oneuptime-service-name` header (called out in OneUptime's Fluentd docs) and the explicit `content_type application/json` and `<format> @type json </format>` directives that the official example uses. Added these so the snippet matches OneUptime's documented, working configuration.

## Review Notes
- OTLP endpoints used in the post are consistent with the rest of the OneUptime blog: SDK exporters target `https://oneuptime.com/otlp/v1/traces` (path required by `OTLPTraceExporter`) and Collector exporters use `https://oneuptime.com/otlp` (signal path appended by the collector). Both forms verified.
- The `OTEL_EXPORTER_OTLP_ENDPOINT="https://oneuptime.com/otlp"` env var pattern in the Python section is correct; the OTLP HTTP spec defines that signal-specific paths are appended to the base when the env var is the generic `OTEL_EXPORTER_OTLP_ENDPOINT`.
- `opentelemetry-instrument` CLI is provided by the `opentelemetry-instrumentation` package, so the listed pip install set is sufficient. Some users may prefer `opentelemetry-distro` for default config, but this isn't required.
- The Fluentd `out_http` plugin's `endpoint` option (not `endpoint_url`) is correct for current Fluentd versions.
- The "Fluentd/Fluent Bit" heading is followed by only a Fluentd snippet; Fluent Bit users would need to use the `opentelemetry` output plugin pointing at `/otlp/v1/logs` instead. Not a technical error in what's shown, but readers using Fluent Bit will need to look elsewhere.
- Pricing claims (Datadog $0.10/GB ingestion + $1.70/GB retention; OneUptime $0.10/GB ingested) reflect publicly listed pricing at time of review but are subject to change — readers should verify current rates.
