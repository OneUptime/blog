# Validation Summary: How to Trace Ruby HTTP Clients (Faraday, HTTParty) with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ruby
- OpenTelemetry Ruby SDK
- OpenTelemetry Faraday instrumentation
- OpenTelemetry Net::HTTP instrumentation
- OpenTelemetry Concurrent Ruby instrumentation
- Faraday
- HTTParty
- faraday-retry
- OpenTelemetry metrics API and metrics SDK
- OpenTelemetry HTTP semantic conventions

## Sources Consulted
- OpenTelemetry Ruby documentation: https://opentelemetry.io/docs/languages/ruby/
- OpenTelemetry Ruby instrumentation guide: https://opentelemetry.io/docs/languages/ruby/instrumentation/
- OpenTelemetry SDK Configurator API: https://www.rubydoc.info/gems/opentelemetry-sdk/OpenTelemetry/SDK/Configurator
- OpenTelemetry Faraday instrumentation README/API docs: https://www.rubydoc.info/gems/opentelemetry-instrumentation-faraday
- OpenTelemetry Net::HTTP instrumentation RubyGems page: https://rubygems.org/gems/opentelemetry-instrumentation-net_http
- OpenTelemetry Concurrent Ruby instrumentation README: https://open-telemetry.github.io/opentelemetry-ruby/opentelemetry-instrumentation-concurrent_ruby/v0.18.1/
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry metrics SDK for Ruby README/API docs: https://rubydoc.info/gems/opentelemetry-metrics-sdk
- faraday-retry middleware API docs: https://www.rubydoc.info/gems/faraday-retry/2.2.0/Faraday/Retry/Middleware
- HTTParty Response API docs: https://www.rubydoc.info/gems/httparty/HTTParty/Response
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/

## Issues Found
- The Net::HTTP instrumentation gem name was incorrect. Changed `opentelemetry-instrumentation-net-http` to the published `opentelemetry-instrumentation-net_http` gem.
- The Net::HTTP instrumentation config key was incorrect. Changed `OpenTelemetry::Instrumentation::NetHTTP` to `OpenTelemetry::Instrumentation::Net::HTTP`.
- The parallel `Concurrent::Future` example claimed child spans would stay under the parent without enabling context propagation. Added `opentelemetry-instrumentation-concurrent_ruby` and its configuration.
- The Faraday span attribute list used only older HTTP semantic convention names. Updated it to mention current stable names and old names during the transition period.
- The custom context example used `service.name` as a span attribute and recorded raw email. Changed this to `peer.service` and `user.email_present`.
- The custom context example treated a Faraday response body as parsed JSON without configuring JSON parsing and referenced an undefined `UserAPIError`. Added `f.response :json` and defined `UserAPIError`.
- The HTTParty example used `response.time`, which is not part of the documented `HTTParty::Response` API. Replaced it with `Process.clock_gettime` timing.
- The retry example manually retried `Faraday::ServerError`, but the configured `faraday-retry` middleware handles retry status codes internally and exposes `retry_block`. Moved retry event tracking into `retry_block`.
- The parallel example used Rails-only `present?` in otherwise plain Ruby service code. Replaced it with nil checks.
- The sensitive-data example mutated OpenTelemetry span internals via `instance_variable_set` and referenced a custom span processor that was not a robust public API pattern. Replaced it with guidance and a URL sanitizer example that avoids recording secrets.
- The metrics section omitted the Ruby metrics maturity/export caveat. Added a note that Ruby metrics support is still in development and requires `opentelemetry-metrics-sdk` plus a metric reader/exporter to export measurements.

## Review Notes
Ruby is not installed in this environment, so I could not run the snippets through `ruby -c`. I reviewed the code and APIs against official documentation and authoritative RubyDoc/RubyGems sources instead.
