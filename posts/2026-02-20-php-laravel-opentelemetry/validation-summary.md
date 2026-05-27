# Validation Summary: How to Instrument Laravel Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PHP
- Laravel
- OpenTelemetry PHP SDK
- OpenTelemetry PHP auto-instrumentation
- OTLP/HTTP exporter
- OneUptime telemetry ingestion

## Sources Consulted
- OpenTelemetry PHP documentation: https://opentelemetry.io/docs/languages/php/
- OpenTelemetry PHP manual instrumentation documentation: https://opentelemetry.io/docs/languages/php/instrumentation/
- OpenTelemetry PHP zero-code instrumentation documentation: https://opentelemetry.io/docs/zero-code/php/
- OpenTelemetry PHP OTLP exporter documentation: https://opentelemetry.io/docs/languages/php/exporters/
- OpenTelemetry PHP SDK builder example: https://github.com/open-telemetry/opentelemetry-php/blob/main/examples/sdk_builder.php
- OpenTelemetry PHP API source for Globals: https://github.com/open-telemetry/opentelemetry-php/blob/main/src/API/Globals.php
- OpenTelemetry PHP semantic convention constants: https://github.com/open-telemetry/opentelemetry-php/blob/main/src/SemConv/ResourceAttributes.php
- Laravel service provider documentation: https://laravel.com/docs/providers
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The SDK registration example used `Globals::registerInitializer()` and returned a `TracerProvider`. Current OpenTelemetry PHP expects initializers to receive and return a configurator, and official app setup examples use `Sdk::builder()->buildAndRegisterGlobal()`. Updated the service provider to register the tracer provider with `Sdk::builder()`, enable auto-shutdown, and configure W3C trace context propagation.
- The batch span processor example used `new BatchSpanProcessor($exporter)` without the required clock argument for the current constructor. Updated it to use `BatchSpanProcessor::builder($exporter)->build()`, matching the current SDK example.
- The resource attribute constant `ResourceAttributes::DEPLOYMENT_ENVIRONMENT` is not present in the current PHP semantic convention constants. Updated it to `ResourceAttributes::DEPLOYMENT_ENVIRONMENT_NAME`.
- The post defined `OTEL_SAMPLING_RATE` but did not apply it. Updated the tracer provider configuration to use `ParentBased(new TraceIdRatioBasedSampler(...))`.
- The environment example did not enable OpenTelemetry PHP auto-instrumentation. Added `OTEL_PHP_AUTOLOAD_ENABLED=true`, which the official zero-code PHP documentation requires when using the SDK with auto-instrumentation.
- The environment example used `https://otel.oneuptime.com`, while OneUptime's current OTLP documentation uses `https://oneuptime.com/otlp`. Updated the endpoint value.
- The host name attribute was written as a string literal even though the current semantic convention class provides `ResourceAttributes::HOST_NAME`. Updated it to use the official constant.

## Review Notes
The post remains a concise tutorial and the installation commands are broadly aligned with the current OpenTelemetry PHP package names. In a future revision, it would be useful to add Laravel-version-specific instructions for registering the service provider, because Laravel 10 and Laravel 11+ use different application bootstrap files.
