# Validation Summary: How to Set Up OpenTelemetry in a Rails App with

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry
- Ruby
- Ruby on Rails
- OpenTelemetry Ruby SDK
- opentelemetry-exporter-otlp
- opentelemetry-instrumentation-all
- Rails, ActiveRecord, Rack, Redis, Sidekiq, Net::HTTP, PG instrumentation
- OTLP environment variable configuration

## Sources Consulted
- OpenTelemetry Ruby instrumentation libraries documentation: https://opentelemetry.io/docs/languages/ruby/libraries/
- OpenTelemetry Ruby exporters documentation: https://opentelemetry.io/docs/languages/ruby/exporters/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Ruby SDK API documentation for `OpenTelemetry::SDK.configure` and `Configurator`: https://open-telemetry.github.io/opentelemetry-ruby/opentelemetry-sdk/v1.8.1/OpenTelemetry/SDK/Configurator.html
- OpenTelemetry Ruby SDK API documentation for `BatchSpanProcessor`: https://open-telemetry.github.io/opentelemetry-ruby/opentelemetry-sdk/v1.8.1/OpenTelemetry/SDK/Trace/Export/BatchSpanProcessor.html
- OpenTelemetry Ruby contrib source for Rails, ActiveRecord, ActionPack, PG, and Net::HTTP instrumentation: https://github.com/open-telemetry/opentelemetry-ruby-contrib

## Issues Found
- The basic initializer passed a generic `'OpenTelemetry::Instrumentation'` key to `c.use_all`. Official Ruby docs show `c.use_all` with no argument, or a map keyed by specific instrumentation names. Changed it to `c.use_all`.
- The environment variable example used `OTEL_TRACES_ENABLED`, which is not the OpenTelemetry SDK environment variable for trace export control. Changed it to `OTEL_TRACES_EXPORTER=otlp` and noted that `none` disables trace export.
- The advanced initializer used unsupported `enable_recognize_route` and `enable_sql_obfuscation` options. Removed the Rails option, kept ActiveRecord enabled, and added PG instrumentation with the documented `db_statement: :obfuscate` option for SQL statement obfuscation.
- The advanced initializer referenced `c.service_name` as a getter, but the Ruby SDK configurator documents `service_name=` and not a `service_name` reader. Changed the snippet to store `service_name` in a local variable.
- The advanced initializer used `Socket.gethostname` without requiring the standard library. Added `require 'socket'`.
- The batch span processor example used `export_timeout_millis`, which is not the current Ruby SDK keyword. Changed it to `exporter_timeout`.
- The sampling example used `c.sampler=`, which is not part of the documented Ruby SDK configurator API. Changed the example to set `OTEL_TRACES_SAMPLER=traceidratio` and `OTEL_TRACES_SAMPLER_ARG=0.1` before SDK initialization.

## Review Notes
The post is now technically valid for current OpenTelemetry Ruby SDK guidance. Future revisions could mention version compatibility because current OpenTelemetry Ruby contrib instrumentation packages may have Rails/Ruby minimum version requirements, and HTTP semantic convention settings are changing over time.
