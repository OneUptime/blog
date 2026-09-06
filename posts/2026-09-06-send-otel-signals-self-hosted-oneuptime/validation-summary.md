# Validation Summary: How to Send OpenTelemetry Signals to Self-Hosted OneUptime

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Self-hosted OneUptime 12.0.33 and telemetry ingestion keys
- OpenTelemetry SDKs, Collector, OTLP/HTTP, OTLP/gRPC, JSON and protobuf
- YAML, shell environment variables, and curl
- TLS, Kubernetes Secrets, systemd credentials, batching and memory protection

## Sources Consulted
- [OneUptime OpenTelemetry integration](https://oneuptime.com/docs/en/telemetry/open-telemetry)
- [OneUptime Kubernetes telemetry agent](https://oneuptime.com/docs/en/telemetry/kubernetes-agent)
- [OneUptime 12.0.33 ingestion routes and validation endpoint](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Telemetry/API/OTelIngest.ts)
- [OneUptime 12.0.33 authentication middleware](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Middleware/TelemetryIngest.ts)
- [OneUptime 12.0.33 payload decoder](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Telemetry/Utils/OtelPayloadDecoder.ts)
- [OneUptime 12.0.33 settings menu](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Dashboard/src/Pages/Settings/SideMenu.tsx)
- [OneUptime 12.0.33 ingestion-key model](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Models/DatabaseModels/TelemetryIngestionKey.ts)
- [Collector configuration](https://opentelemetry.io/docs/collector/configuration/)
- [OTLP HTTP exporter options](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md)
- [Collector changelog](https://github.com/open-telemetry/opentelemetry-collector/blob/main/CHANGELOG.md)
- [Memory limiter processor](https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md)
- [Collector TLS settings](https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md)
- [Collector resiliency](https://opentelemetry.io/docs/collector/resiliency/)
- [Collector internal telemetry](https://opentelemetry.io/docs/collector/internal-telemetry/)
- [OTLP exporter specification](https://opentelemetry.io/docs/specs/otel/protocol/exporter/)
- [OTLP specification](https://opentelemetry.io/docs/specs/otlp/)
- [curl manual](https://curl.se/docs/manpage.html)
- [systemd execution environment and credentials manual source](https://github.com/systemd/systemd/blob/main/man/systemd.exec.xml)

## Issues Found
1. **Incorrect invalid-token response:** The post claimed ingestion endpoints silently return 200 for invalid tokens. The 12.0.33 authentication middleware returns an authentication error (401) for missing or invalid tokens. Corrected this and explained that 401 is non-retryable under OTLP/HTTP. Retained the separate validation request and verification of stored samples.
2. **Deprecated exporter name:** Current Collector documentation marks `otlphttp` as a deprecated alias of `otlp_http`. Updated the exporter definition and all three pipeline references, with a compatibility note for older releases.
3. **Secret delivery mismatch:** The YAML reads an environment variable, but systemd credentials and mounted container secrets expose files. Clarified that the launcher must load file-based secrets into the Collector process environment for this example.
4. **Ambiguous direct-export instructions:** Explicitly retained HTTP/protobuf and clarified that standard generic OTLP/HTTP endpoint variables append signal paths, while signal-specific endpoint variables require complete URLs. This avoids treating path construction as discretionary SDK behavior.

## Review Notes
- Verified the OneUptime release tag against the official Git remote: `12.0.33` resolves to `bccf2519397d334a40cda3c5c87a5d7e29f35ed5`. Inspected that tagged source from the adjacent local OneUptime repository.
- Confirmed the settings navigation, ingestion-token header, three signal routes, GET validation route, and JSON/protobuf format handling. The general OneUptime Collector example favors JSON; the tagged implementation also handles protobuf.
- Reviewed the receiver ports, memory limiter fields and ordering, batch processor, exporter encoding, environment substitution, pipeline references, TLS trust, and queue-loss guidance against upstream documentation.
- All four official documentation links resolve to the intended resources. The example hostnames are placeholders and were not contacted.
- Checked shell syntax and parsed the validation JSON. This is a documentation and source review, not an end-to-end deployment test: no live OneUptime endpoint, ingestion credential, or specific Collector binary was supplied.
- Applications still require configured instrumentation and exporters; environment variables alone do not generate telemetry. Collector component availability and internal metric names depend on the chosen distribution and release.
