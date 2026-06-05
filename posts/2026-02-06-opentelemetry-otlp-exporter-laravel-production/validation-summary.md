# Validation Summary: How to Configure OpenTelemetry OTLP Exporter in Laravel for Production

## Status
validated

## Post Type
Tutorial / Production configuration guide

## Technologies Covered
- OpenTelemetry PHP SDK
- OpenTelemetry OTLP exporter
- PHP
- Laravel service providers
- Composer
- OTLP over gRPC and HTTP/protobuf

## Sources Consulted
- OpenTelemetry PHP exporters documentation: https://opentelemetry.io/docs/languages/php/exporters/
- OpenTelemetry PHP SDK documentation: https://opentelemetry.io/docs/languages/php/sdk/
- OpenTelemetry PHP API docs for BatchSpanProcessor: https://open-telemetry.github.io/opentelemetry-php/classes/OpenTelemetry-SDK-Trace-SpanProcessor-BatchSpanProcessor.html
- OpenTelemetry PHP API docs for OtlpHttpTransportFactory: https://open-telemetry.github.io/opentelemetry-php/classes/OpenTelemetry-Contrib-Otlp-OtlpHttpTransportFactory.html
- OpenTelemetry PHP source for SpanExporterInterface: https://github.com/open-telemetry/opentelemetry-php/blob/main/src/SDK/Trace/SpanExporterInterface.php
- OpenTelemetry PHP source for SdkBuilder: https://github.com/open-telemetry/opentelemetry-php/blob/main/src/SDK/SdkBuilder.php
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- Laravel service provider documentation: https://laravel.com/docs/13.x/providers

## Issues Found
- The dependency guidance installed `guzzlehttp/guzzle` for HTTP transport. Official OpenTelemetry PHP docs recommend `php-http/guzzle7-adapter` as the PSR HTTP client adapter for OTLP HTTP examples, so the Composer command was updated.
- The gRPC dependency guidance only installed the transport package. Official OpenTelemetry PHP docs also require the PHP `grpc` extension, so `pecl install grpc` was added.
- The post described HTTP/protobuf as a transport protocol. OTLP defines gRPC and HTTP transports, with HTTP supporting protobuf and JSON encodings, so the wording was corrected.
- The service provider used non-current OpenTelemetry PHP APIs, including `Globals::registerInitializer()`, missing sampler imports, and an incorrect `BatchSpanProcessor` constructor argument order. The snippet now uses `Sdk::builder()->buildAndRegisterGlobal()`, imports the current sampler classes, passes `Clock::getDefault()`, and orders batch processor options correctly.
- The transport example used undefined compression constants and the generic `PsrTransportFactory` directly. It now uses the documented `OtlpHttpTransportFactory` and passes the configured compression value.
- The provider registration snippet used the older `config/app.php` providers array. Current Laravel applications register user providers in `bootstrap/providers.php`, so the snippet was updated while noting the older location for legacy apps.
- The custom `ResilientExporter` used an outdated `SpanExporterInterface::export()` return type and nonexistent status constants. It now returns `FutureInterface`, awaits the wrapped exporter, and returns `CompletedFuture(false)` on final failure.

## Review Notes
- The article remains focused on tracing. It includes a metrics endpoint in configuration, but does not configure a meter provider or metric exporter.
- The resilient exporter example is technically compatible with the current interface, but it blocks while awaiting export attempts. For high-traffic production PHP applications, prefer relying on the SDK/exporter retry behavior or benchmark this wrapper carefully.
