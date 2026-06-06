# Validation Summary: How to Auto-Instrument a Laravel Application with opentelemetry-auto-laravel

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry PHP
- OpenTelemetry PHP extension
- OpenTelemetry PHP SDK
- opentelemetry-auto-laravel
- Laravel
- PHP
- Composer
- OTLP
- OpenTelemetry Collector

## Sources Consulted
- OpenTelemetry PHP zero-code instrumentation: https://opentelemetry.io/docs/zero-code/php/
- OpenTelemetry PHP documentation: https://opentelemetry.io/docs/languages/php/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- PECL opentelemetry package: https://pecl.php.net/package/opentelemetry
- Packagist package metadata for open-telemetry/opentelemetry-auto-laravel: https://packagist.org/packages/open-telemetry/opentelemetry-auto-laravel
- OpenTelemetry PHP contrib Laravel package source: https://github.com/open-telemetry/opentelemetry-php-contrib/tree/main/src/Instrumentation/Laravel
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The prerequisites listed PHP 8.0+, but the current `open-telemetry/opentelemetry-auto-laravel` package requires PHP `^8.1`. Updated the prerequisite to PHP 8.1+.
- The installation command only installed `open-telemetry/opentelemetry-auto-laravel`. Added `open-telemetry/sdk` and `open-telemetry/exporter-otlp`, which are needed for SDK configuration and OTLP export.
- The post described a Laravel service provider, `config/app.php` registration, and `php artisan vendor:publish --tag=opentelemetry-config`. The package registers hooks via Composer autoload files and does not provide that service provider/config publishing flow. Replaced this with environment-variable configuration.
- The sample `config/opentelemetry.php` keys were not part of the official OpenTelemetry PHP setup for this package. Replaced them with standard OpenTelemetry environment variables such as `OTEL_PHP_AUTOLOAD_ENABLED`, `OTEL_TRACES_EXPORTER`, `OTEL_EXPORTER_OTLP_PROTOCOL`, and `OTEL_RESOURCE_ATTRIBUTES`.
- The instrumentation coverage claims overstated or misstated some behavior. Updated cache operations to events on the active span, queue tracing to package-supported queue behavior, and event tracing to log/exception correlation based on the package source.
- The outbound HTTP propagation section claimed Laravel HTTP client calls automatically inject trace context. The Laravel package records HTTP client spans, but explicit propagation requires an injecting client instrumentation or manual header injection. Updated the example accordingly.
- The custom instrumentation example used nonexistent watcher APIs such as `RequestWatcher::addEnricher()` and `QueryWatcher::addEnricher()`. Replaced it with a Laravel middleware example that adds attributes to the active span using the OpenTelemetry PHP API.
- The sensitive-data filtering example used nonexistent Laravel OpenTelemetry config options such as `sanitize_bindings`, `redact_patterns`, and `redact_headers`. Replaced it with guidance to avoid adding sensitive attributes and to use standard attribute limit environment variables.
- The performance section claimed a typical overhead of less than 5ms per request without an authoritative source and showed nonexistent per-component config toggles. Replaced this with measurement guidance and the supported `OTEL_PHP_DISABLED_INSTRUMENTATIONS=laravel` option.
- The batch exporter example used nonexistent PHP config array keys. Replaced it with standard Batch Span Processor environment variables.
- The Collector example used the deprecated `logging` exporter with `loglevel`. Updated it to the current `debug` exporter with `verbosity`.

## Review Notes
The post is now technically aligned with the current OpenTelemetry PHP setup and the Laravel auto-instrumentation package source. Future revisions could add Laravel 11-specific middleware registration guidance, since Laravel 11 uses `bootstrap/app.php` instead of the older HTTP kernel registration style.
