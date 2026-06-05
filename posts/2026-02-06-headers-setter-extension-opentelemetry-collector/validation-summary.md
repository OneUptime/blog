# Validation Summary: How to Configure the Headers Setter Extension in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- Headers Setter Extension
- Collector authentication extensions
- OTLP HTTP exporter
- Batch processor metadata handling
- Collector YAML configuration

## Sources Consulted
- OpenTelemetry Collector Headers Setter Extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/headerssetterextension
- Headers Setter Extension config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/headerssetterextension/config.go
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector authentication configuration README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configauth/README.md
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector extensions registry: https://opentelemetry.io/docs/collector/components/extension/

## Issues Found
- The original post said enabling `headers_setter` in `service.extensions` automatically applies headers to all exporters. Changed examples and explanation to show that exporters must reference the extension with `auth.authenticator`.
- The original post described unsupported settings including `refresh_interval`, `token_refresh`, `propagation`, `transforms`, `secrets`, `logging.redact_headers`, `cache`, `batch_optimization`, custom metrics, `condition`, `value_type`, `override`, and `merge`. Removed or replaced those with documented `headers`, `action`, `value`, `value_file`, `from_context`, `from_attribute`, `default_value`, and `additional_auth` behavior.
- The original post claimed the extension automatically injects W3C Trace Context, B3, and baggage headers. Corrected this to state that trace propagation is handled by SDK propagators and that the extension can copy request metadata, not derive propagation headers from spans.
- The original post showed dynamic header generation from span/resource attributes, timestamps, UUIDs, batch size, and pipeline names. Corrected this because the extension only reads configured values, files, request metadata, or authentication data.
- The original post showed secret-manager and HMAC features that are not part of the extension. Replaced them with environment-variable expansion and `value_file` examples for externally managed secrets.
- The original post suggested the debug/logging exporter could show outbound headers. Corrected troubleshooting guidance to use configuration validation and an HTTP inspection/test backend for header verification.
- The original post referenced non-existent extension metrics. Corrected monitoring guidance to use Collector built-in telemetry and exporter/backend success indicators.
- Updated examples to preserve request metadata correctly by using receiver `include_metadata: true` and batch processor `metadata_keys` when `from_context` is used.

## Review Notes
The Headers Setter Extension is listed as alpha in the OpenTelemetry component registry, so field names and behavior should be rechecked when upgrading Collector Contrib versions. All YAML snippets in the corrected post were parsed successfully during review, but the local environment did not include `otelcol-contrib`, so full Collector runtime validation was not executed.
