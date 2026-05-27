# Validation Summary: How to Instrument Ruby on Rails with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ruby
- Ruby on Rails
- OpenTelemetry Ruby SDK
- OpenTelemetry Ruby instrumentation libraries
- OTLP exporter
- Distributed tracing
- OpenTelemetry semantic conventions
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Ruby instrumentation documentation: https://opentelemetry.io/docs/languages/ruby/instrumentation/
- OpenTelemetry Ruby instrumentation libraries documentation: https://opentelemetry.io/pl/docs/languages/ruby/libraries/
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Ruby SDK configurator source: https://github.com/open-telemetry/opentelemetry-ruby/blob/main/sdk/lib/opentelemetry/sdk/configurator.rb
- OpenTelemetry Ruby OTLP exporter source: https://github.com/open-telemetry/opentelemetry-ruby/blob/main/exporter/otlp/lib/opentelemetry/exporter/otlp/exporter.rb
- OpenTelemetry resource documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry deployment semantic convention registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OneUptime OpenTelemetry examples and ingestion references: https://oneuptime.com/blog/post/2025-01-22-how-to-collect-opentelemetry-collector-internal-metrics/view

## Issues Found
- The Gemfile and initializer used individual instrumentation gems while calling `c.use_all`, and only required `opentelemetry/instrumentation/rails`. Updated the example to use the official `opentelemetry-instrumentation-all` metapackage and `require 'opentelemetry/instrumentation/all'`, which matches the documented `c.use_all` setup.
- The SDK configuration read `APP_VERSION` while the production environment example set `OTEL_SERVICE_VERSION`. Updated the code to read `OTEL_SERVICE_VERSION`, falling back to `APP_VERSION`.
- The OTLP exporter example passed `OTEL_EXPORTER_OTLP_ENDPOINT` directly to the Ruby exporter `endpoint:` option. The Ruby exporter only appends `/v1/traces` when it reads the base endpoint itself, so passing a base endpoint explicitly can send traces to the wrong URL. Updated the example to use `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` with a full trace endpoint.
- The custom HTTP span attributes used older names: `http.method`, `http.url`, and `http.status_code`. Updated them to current stable semantic convention keys: `http.request.method`, `url.full`, and `http.response.status_code`.
- The resource attributes example used deprecated `deployment.environment`. Updated it to `deployment.environment.name`.
- The resource attributes snippet used `Socket.gethostname` and `SecureRandom.uuid` without requiring their standard libraries. Added `require 'socket'` and `require 'securerandom'`.

## Review Notes
Ruby was not installed in the local workspace, so I could not run `ruby -c` against extracted snippets. The reviewed APIs and configuration behavior were verified against official OpenTelemetry documentation and OpenTelemetry Ruby source.
