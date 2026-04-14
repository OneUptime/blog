# Validation Summary: How to Send Dapr Traces to New Relic

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (distributed application runtime)
- New Relic (observability platform)
- OpenTelemetry Collector (OTLP exporter)
- Kubernetes (deployment target)
- NRQL (New Relic Query Language)
- NerdGraph API (New Relic GraphQL API)

## Sources Consulted
- Dapr source code (`pkg/config/configuration.go`) for OtelSpec struct definition and headers support — https://github.com/dapr/dapr/blob/master/pkg/config/configuration.go
- Dapr configuration test cases (`pkg/config/configuration_test.go`) for YAML headers format — https://github.com/dapr/dapr/blob/master/pkg/config/configuration_test.go
- Dapr documentation for tracing configuration and annotations — https://docs.dapr.io/operations/observability/tracing/otel-collector/
- Dapr annotations reference — https://docs.dapr.io/reference/arguments-annotations-overview/
- New Relic NRQL syntax and clauses documentation — https://docs.newrelic.com/docs/nrql/nrql-syntax-clauses-functions/
- New Relic CLI source code (`internal/` directory) for available commands — https://github.com/newrelic/newrelic-cli
- New Relic CLI README and command reference — https://github.com/newrelic/newrelic-cli/blob/main/README.md

## Issues Found

### 1. Missing `headers` field in Direct OTLP configuration
**What was wrong:** The Dapr Configuration for direct OTLP export to New Relic was missing the `headers` field. New Relic requires an `api-key` header for authentication, and Dapr's `OtelSpec` supports a `headers` field (`[]string` with `key=value` format). The original post's note incorrectly implied that Dapr could not pass custom headers, directing readers to use the OTel Collector as the only option for header injection.

**What was changed:** Added `headers: ["api-key=your-new-relic-license-key"]` to the direct OTLP Dapr Configuration YAML. Updated the note to clarify that while direct headers work, the OTel Collector approach is recommended for better secret management (environment variable substitution vs. plaintext in config).

**Why:** Without the `api-key` header, the direct OTLP configuration shown would result in authentication failures when sending traces to New Relic's OTLP endpoint.

### 2. Non-existent New Relic CLI command for alerts
**What was wrong:** The `newrelic alerts conditions create` command does not exist in the New Relic CLI. The CLI has no `alerts` module — its `internal/` directory contains modules for `apm`, `entities`, `nrql`, `synthetics`, `nerdgraph`, etc., but no `alerts` package. The flags shown (`--type baseline`, `--baseline-direction upper_only`) were also fabricated.

**What was changed:** Replaced the non-existent CLI command with a working `curl` request to New Relic's NerdGraph GraphQL API (`https://api.newrelic.com/graphql`), using the `alertsNrqlConditionStaticCreate` mutation to create an NRQL alert condition.

**Why:** The original command would fail with a "command not found" error. NerdGraph is the officially supported programmatic interface for managing New Relic alert conditions.

### 3. Secret creation command relocated
**What was wrong:** The `kubectl create secret` command for the New Relic license key was placed in the Direct OTLP section, but it is only needed for the OTel Collector approach (which uses `secretKeyRef` to inject the key as an environment variable).

**What was changed:** Moved the secret creation command to the OTel Collector section where it is actually used.

**Why:** The direct OTLP approach uses inline headers, not Kubernetes secrets. The secret is only referenced by the OTel Collector deployment's environment variable configuration.

## Review Notes
- The New Relic OTLP endpoint `otlp.nr-data.net:4317` is the US datacenter endpoint. EU datacenter users would need `otlp.eu01.nr-data.net:4317`. The post could mention this but it's not incorrect as-is.
- The NRQL queries are syntactically correct. The `ORDER BY` with `FACET` is valid NRQL (confirmed via official docs), though it's redundant here since FACET results default to descending order by the first SELECT field.
- The OTel Collector configuration correctly uses the `otlp/newrelic` named exporter with `tls.insecure: false`, which is appropriate for New Relic's TLS-required endpoint.
- All three Dapr annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/config`) are confirmed valid per official Dapr documentation.
