# Validation Summary: How to Troubleshoot Missing Telemetry in OneUptime from Collector to Dashboard

## Status
validated

## Post Type
Technical troubleshooting guide with Collector YAML configuration and shell commands.

## Technologies Covered
- OneUptime telemetry ingestion, explorers, dashboards, and ingestion keys
- OpenTelemetry SDKs, Collector pipelines, OTLP/HTTP, and OTLP/gRPC
- ClickHouse telemetry storage
- Docker Compose and Kubernetes
- curl, HTTP authentication headers, and TLS

## Sources Consulted
- [OneUptime OpenTelemetry integration](https://oneuptime.com/docs/en/telemetry/open-telemetry): ingestion headers, self-hosted endpoint, and signal pipelines.
- [OneUptime Kubernetes agent troubleshooting](https://oneuptime.com/docs/en/telemetry/kubernetes-agent): validation endpoint and silent HTTP 200 responses for unknown or revoked ingestion tokens.
- [OneUptime Cursor integration](https://oneuptime.com/docs/en/telemetry/cursor): explicit confirmation of binary protobuf support over OTLP/HTTP.
- [OneUptime dashboard variables and filters](https://oneuptime.com/docs/en/dashboards/variables): attribute filters, defaults, and dashboard time ranges.
- [OneUptime architecture](https://oneuptime.com/docs/en/self-hosted/architecture): ingestion services and ClickHouse storage for logs, metrics, and traces.
- [OneUptime Docker Compose installation](https://oneuptime.com/docs/en/installation/docker-compose): deployment configuration and config.env.
- [OpenTelemetry Collector configuration](https://opentelemetry.io/docs/collector/configuration/): component definitions, pipeline activation, environment expansion, and configuration validation.
- [OpenTelemetry Collector troubleshooting](https://opentelemetry.io/docs/collector/troubleshooting/): debugging individual pipeline boundaries and payload inspection.
- [OpenTelemetry Collector internal telemetry](https://opentelemetry.io/docs/collector/internal-telemetry/): receiver, processor, exporter, and queue diagnostics.
- [OpenTelemetry OTLP HTTP exporter](https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/otlphttpexporter): current component name, deprecated alias, and appended per-signal paths.
- [OpenTelemetry debug exporter](https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/debugexporter): default basic output versus detailed payload output.
- [OTLP exporter specification](https://opentelemetry.io/docs/specs/otel/protocol/exporter/): ports, protocols, endpoint semantics, headers, and TLS.
- [OpenTelemetry tracing SDK specification](https://opentelemetry.io/docs/specs/otel/trace/sdk/): sampling, buffering, ForceFlush, and shutdown.
- [Docker Compose CLI](https://docs.docker.com/reference/cli/docker/compose/), [logs](https://docs.docker.com/reference/cli/docker/compose/logs/), and [config](https://docs.docker.com/reference/cli/docker/compose/config/): --env-file, logs --since, and config --services.
- [curl manual](https://curl.se/docs/manpage.html): -i, -H, and default HTTP GET behavior.
- Supplementary local OneUptime source inspection: App/FeatureSet/Telemetry/API/OTelIngest.ts, App/FeatureSet/Telemetry/Utils/OtelPayloadDecoder.ts, Common/Models/DatabaseModels/Project.ts, and docker-compose YAML files in the sibling oneuptime checkout. These corroborate token validation, protobuf decoding, project retention settings, and service names; the checkout was not treated as a pinned release.

## Issues Found
1. **Deprecated exporter identifier.** Replaced `otlphttp/oneuptime` with `otlp_http/oneuptime` in both the pipeline and exporter definition. The current upstream exporter documentation marks `otlphttp` as a deprecated alias.
2. **Incomplete configuration context and overstated startup logging.** The fragments reference receiver and processor definitions supplied elsewhere, and startup logs do not guarantee an inventory of every configured component. Clarified that the fragments belong in a complete configuration and replaced the logging claim with startup-error inspection and the documented `otelcol validate --config=collector.yaml` command.
3. **Debug exporter verbosity omitted.** Basic output reports batch counts, so it cannot reliably reveal the unique record marker. Specified `verbosity: detailed` for payload inspection while preserving the existing precautions about sensitive output.
4. **Inconsistent Compose environment loading.** Added `--env-file config.env` to the service-discovery command so it resolves the same deployment configuration as the adjacent ps and logs commands.

## Review Notes
- The central OneUptime-specific claim is documented: an unknown or revoked token can produce a successful ingestion HTTP status while data is dropped, so direct token validation is necessary. Token validation alone does not prove that storage or querying works.
- The general OneUptime integration page still shows a JSON-only comment, but the newer Cursor documentation explicitly confirms binary protobuf ingestion, corroborated by the local decoder. The exporter's default protobuf encoding was therefore retained.
- The post specifies no software versions. Current upstream documentation was used; older Collector builds may require the former exporter alias, and older self-hosted OneUptime releases may not provide the validation route.
- All five documentation links in the post resolved to the intended resources. The example oneuptime.example.com address is a deployment placeholder.
- Pipeline wiring, SDK endpoint semantics, flushing, internal metrics, storage diagnostics, retention, and dashboard filtering were reviewed against the listed sources. The YAML is intentionally partial and requires the surrounding deployment configuration.
- Shell examples were checked for Bash syntax. No live telemetry was sent and no deployment was started; endpoint acceptance, network connectivity, and actual dashboard results require the reader's configured environment.
