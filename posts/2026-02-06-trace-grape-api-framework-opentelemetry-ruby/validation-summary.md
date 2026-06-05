# Validation Summary: How to Trace Grape API Framework with OpenTelemetry in Ruby

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ruby
- Grape
- Rack
- OpenTelemetry Ruby SDK
- OpenTelemetry Ruby instrumentation libraries
- OpenTelemetry metrics
- Faraday
- Redis
- PostgreSQL

## Sources Consulted
- OpenTelemetry Ruby instrumentation documentation: https://opentelemetry.io/docs/languages/ruby/instrumentation/
- OpenTelemetry Ruby instrumentation libraries documentation: https://opentelemetry.io/docs/languages/ruby/libraries/
- OpenTelemetry Grape instrumentation README: https://rubydoc.info/gems/opentelemetry-instrumentation-grape
- OpenTelemetry Ruby metrics SDK README: https://rubydoc.info/gems/opentelemetry-metrics-sdk
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- Grape middleware and custom middleware documentation: https://github.com/ruby-grape/grape
- Grape::Middleware::Base API documentation: https://www.rubydoc.info/gems/grape/Grape/Middleware/Base
- Faraday response API documentation: https://www.rubydoc.info/gems/faraday/Faraday/Response

## Issues Found
- The post said there was no OpenTelemetry instrumentation for Grape while also installing `opentelemetry-instrumentation-grape`. Updated the note to reflect the current community-maintained Grape instrumentation and its Rack/ActiveSupport notification behavior.
- The OpenTelemetry configuration used `require 'opentelemetry/instrumentation/all'` without the `opentelemetry-instrumentation-all` gem and passed an unsupported `enable_route_namespace` option to Grape instrumentation. Replaced this with explicit `c.use` calls for the listed instrumentation libraries.
- The Gemfile omitted dependencies used later in the examples. Added `opentelemetry-metrics-sdk`, `opentelemetry-instrumentation-faraday`, and `faraday`.
- The custom Grape middleware overrode `call` instead of following Grape's `call!` lifecycle, did not set `@env`, and created a current span around an empty block rather than around the wrapped app call. Updated it to set `@env`, override `call!`, and keep the span current while calling `@app.call(@env)`.
- The examples used old HTTP semantic attribute names such as `http.method` and `http.status_code`. Updated them to stable names such as `http.request.method` and `http.response.status_code`.
- The Faraday example used `res.env.duration`, which is not a reliable documented response API. Replaced it with explicit monotonic clock timing around the request.
- The metrics example used the wrong metrics SDK require path and bypassed Grape's middleware lifecycle. Updated it to `require 'opentelemetry-metrics-sdk'` and to implement `call!`.
- The response-size metric treated Rack response bodies as if they usually respond to `bytesize`. Updated it to sum byte sizes across enumerable response body chunks.

## Review Notes
Ruby OpenTelemetry metrics remain alpha and are distributed in a separate `opentelemetry-metrics-sdk` gem. The article is now technically accurate for the APIs shown, but production applications should also configure a metric reader/exporter appropriate for their backend.
