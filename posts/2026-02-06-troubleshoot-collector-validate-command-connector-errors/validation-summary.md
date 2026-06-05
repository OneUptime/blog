# Validation Summary: How to Troubleshoot the Collector validate Command Missing Pipeline Wiring

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- Collector connectors
- Spanmetrics connector
- Collector YAML configuration
- Docker
- Bash
- GitHub Actions

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry custom connector documentation: https://opentelemetry.io/docs/collector/extend/custom-component/connector/
- Spanmetrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- Count connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/countconnector/README.md
- Service Graph connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/servicegraphconnector/README.md
- Routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- Forward connector README: https://github.com/open-telemetry/opentelemetry-collector/tree/main/connector/forwardconnector
- `otel/opentelemetry-collector-contrib:0.121.0` Docker image help, `components`, `validate`, and startup behavior

## Issues Found
- The initial invalid configuration referenced `otlp` receiver and exporter components without defining them. Added minimal `receivers` and `exporters` sections so the example isolates the connector wiring issue.
- The post said bad connector wiring could silently lose data or panic at runtime. Testing `otel/opentelemetry-collector-contrib:0.121.0` showed that `validate` exits successfully, but Collector startup fails during pipeline build with a connector wiring error. Updated the runtime wording.
- The correct wiring example used `prometheusremotewrite`, while the integration test later scraped `http://localhost:8889/metrics`. Replaced the example exporter with the pull-based `prometheus` exporter and endpoint `0.0.0.0:8889`.
- The Docker integration test mounted config at `/etc/otelcol/config.yaml` but did not pass `--config`, while the contrib image defaults to its own config path. Added `--config /etc/otelcol/config.yaml`.
- The OTLP receiver snippets relied on the default `localhost` bind address, which would not be reachable through Docker port mapping from the host. Added `endpoint: 0.0.0.0:4317`.
- The connector type mapping table omitted `profiles` support for the count and forward connectors and described routing as `any`. Updated the table to match current official component docs.
- The validation script wording overstated what the grep-based script can prove. Clarified that it is a basic `spanmetrics` guardrail and that a YAML-aware checker is better for larger configs.

## Review Notes
- For `otel/opentelemetry-collector-contrib:0.121.0`, the connector type is `spanmetrics`; current upstream documentation notes that newer releases rename it to `span_metrics` and deprecate the old name.
- Verified with Docker that the mismatched connector config passes `validate` with exit status 0, while the corrected config passes `validate` and starts successfully.
