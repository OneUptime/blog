# Validation Summary: How to Instrument a Sinatra Application with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ruby
- Sinatra
- Rack
- OpenTelemetry Ruby SDK
- OpenTelemetry Sinatra instrumentation
- OpenTelemetry Net::HTTP instrumentation
- OpenTelemetry OTLP exporter
- Redis and PostgreSQL instrumentation gems

## Sources Consulted
- OpenTelemetry Ruby getting started documentation: https://opentelemetry.io/docs/languages/ruby/getting-started/
- OpenTelemetry Ruby SDK README: https://open-telemetry.github.io/opentelemetry-ruby/opentelemetry-sdk/v1.8.0/
- OpenTelemetry Ruby manual instrumentation documentation: https://opentelemetry.io/docs/languages/ruby/instrumentation/
- OpenTelemetry Ruby sampling documentation: https://opentelemetry.io/docs/languages/ruby/sampling/
- OpenTelemetry Ruby OTLP exporter README: https://open-telemetry.github.io/opentelemetry-ruby/opentelemetry-exporter-otlp/v0.28.0/
- OpenTelemetry Ruby Sinatra instrumentation README: https://open-telemetry.github.io/opentelemetry-ruby/opentelemetry-instrumentation-sinatra/v0.19.2/
- OpenTelemetry Ruby Rack instrumentation documentation: https://rubydoc.info/gems/opentelemetry-instrumentation-rack/0.28.0/OpenTelemetry%2FInstrumentation%2FRack%2FInstrumentation%3Amiddleware_args
- Sinatra official README: https://github.com/sinatra/sinatra
- Ruby SecureRandom standard library documentation: https://ruby-doc.org/stdlib-3.0.0/libdoc/securerandom/rdoc/SecureRandom.html
- Ruby LocalJumpError documentation: https://docs.ruby-lang.org/en/3.3/LocalJumpError.html
- RubyGems package pages for opentelemetry-instrumentation-pg and opentelemetry-instrumentation-redis: https://rubygems.org/gems/opentelemetry-instrumentation-pg and https://rubygems.org/gems/opentelemetry-instrumentation-redis

## Issues Found
- The post claimed Sinatra did not have a dedicated OpenTelemetry instrumentation gem. That is outdated; `opentelemetry-instrumentation-sinatra` exists and is documented. Updated the Gemfile, setup text, and examples to use the Sinatra instrumentation.
- The examples used `SecureRandom.uuid` without requiring Ruby's `securerandom` standard library. Added `require 'securerandom'` to the relevant app snippets.
- The OpenTelemetry configuration called `build_exporter_headers` before defining it. Moved the helper before `OpenTelemetry::SDK.configure` so the snippet can run.
- The Net::HTTP instrumentation was required and described, but never installed. Added `c.use 'OpenTelemetry::Instrumentation::Net::HTTP'`.
- The post used the stale direct Rack middleware constant `OpenTelemetry::Instrumentation::Rack::Middlewares::TracerMiddleware`. Updated the integration and debugging examples to install instrumentation through `OpenTelemetry::SDK.configure`.
- One route used `return` inside a nested block, which can raise `LocalJumpError` in Ruby block contexts. Replaced it with `next` to return from the `in_span` block.
- Error examples recorded exceptions but did not set span status to error, which the OpenTelemetry Ruby docs recommend. Added `span.status = OpenTelemetry::Trace::Status.error(...)`.
- The external API example attached the full response body to a span event. Replaced it with the response body size to avoid putting large or sensitive payloads into telemetry.
- The sampling example used direct sampler assignment inside `OpenTelemetry::SDK.configure`. Updated it to the documented environment variable configuration for `TraceIdRatioBased` sampling.
- Standalone snippets that called `to_json` were missing `require 'json'`. Added the missing requires.

## Review Notes
Ruby is not installed in this workspace, so I could not execute the snippets locally. The review was performed against official OpenTelemetry Ruby, Sinatra, and Ruby standard library documentation.
