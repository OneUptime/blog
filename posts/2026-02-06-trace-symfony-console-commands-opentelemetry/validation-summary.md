# Validation Summary: How to Trace Symfony Console Commands with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PHP
- Symfony Console
- Symfony EventDispatcher
- OpenTelemetry PHP tracing API
- OpenTelemetry PHP metrics API
- Symfony service configuration

## Sources Consulted
- Symfony Console events documentation: https://symfony.com/doc/current/components/console/events.html
- Symfony Console commands documentation: https://symfony.com/doc/current/console.html
- OpenTelemetry PHP instrumentation documentation: https://opentelemetry.io/docs/languages/php/instrumentation/
- OpenTelemetry PHP API reference for spans and span builders: https://open-telemetry.github.io/opentelemetry-php/classes/OpenTelemetry-API-Trace-SpanInterface.html and https://open-telemetry.github.io/opentelemetry-php/classes/OpenTelemetry-API-Trace-SpanBuilderInterface.html
- OpenTelemetry PHP source for global providers and metrics APIs: https://github.com/open-telemetry/opentelemetry-php/blob/main/src/API/Globals.php and https://github.com/open-telemetry/opentelemetry-php/blob/main/src/API/Metrics/MeterInterface.php
- OpenTelemetry metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- FriendsOfOpenTelemetry Symfony bundle trace instrumentation documentation: https://friendsofopentelemetry.github.io/opentelemetry-bundle/instrumentation/traces.html

## Issues Found
- The service configuration referenced a non-standard `opentelemetry.trace.tracer_provider` service id. Replaced the tracer-provider injection examples with `OpenTelemetry\API\Globals::tracerProvider()` and `Globals::meterProvider()`, which are part of the official OpenTelemetry PHP API.
- `OTEL_CONSOLE_ENABLED` was documented but not used by the subscriber. Added an `$enabled` constructor argument and an early return in `onCommand()`, and wired the value in `services.yaml`.
- The command examples used `protected static $defaultName`, which is deprecated in modern Symfony. Updated command registration to use the documented `#[AsCommand]` attribute.
- The `ImportDataCommand` example returned `Command::SUCCESS` without importing `Symfony\Component\Console\Command\Command`, which would not resolve correctly in the `App\Command` namespace. Changed it to `self::SUCCESS`.
- The batch-processing example always set `batch.failed` to `0` even when individual order processing failed. Added a per-batch failure counter and recorded that value.
- Failed order spans and failed fetch spans recorded exceptions but did not set the span status to error. Added `StatusCode::STATUS_ERROR` where exceptions are handled.
- Passing `--batch-size=0` would cause `array_chunk()` to fail. Clamped the parsed batch size to at least `1`.
- The metrics example used `count` as the unit for a counter. Changed it to the UCUM-compatible unit `1`, matching OpenTelemetry metric unit guidance.
- The metrics example stored `success` as string values. Changed it to a boolean attribute, which is supported by the OpenTelemetry PHP attribute API.

## Review Notes
The post is now technically valid as a manual instrumentation tutorial. In a future revision, it could mention that the FriendsOfOpenTelemetry Symfony bundle can automatically instrument console commands, but that was not added here to avoid expanding the scope or restructuring the post.
