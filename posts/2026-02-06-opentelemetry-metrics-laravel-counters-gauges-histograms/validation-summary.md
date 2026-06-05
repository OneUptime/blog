# Validation Summary: How to Set Up OpenTelemetry Metrics in Laravel (Counters, Gauges, Histograms)

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry PHP API and SDK
- OpenTelemetry PHP metrics: counters, observable gauges, histograms
- OpenTelemetry OTLP exporter for PHP
- Laravel service providers, middleware, cache, database listeners, and Redis usage
- Prometheus histogram queries

## Sources Consulted
- OpenTelemetry PHP documentation: https://opentelemetry.io/docs/languages/php/
- OpenTelemetry PHP API reference: https://open-telemetry.github.io/opentelemetry-php/
- OpenTelemetry PHP source for `MeterInterface`, `ObservableGaugeInterface`, `ExportingReader`, `MetricExporter`, `PsrTransportFactory`, and `ShutdownHandler`: https://github.com/open-telemetry/opentelemetry-php
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry OTLP exporter package: https://github.com/opentelemetry-php/exporter-otlp
- Packagist package information for `open-telemetry/opentelemetry-auto-laravel`: https://packagist.org/packages/open-telemetry/opentelemetry-auto-laravel
- Laravel 12 service provider documentation: https://laravel.com/docs/12.x/providers
- Laravel 12 middleware documentation: https://laravel.com/docs/12.x/middleware
- Laravel 10 middleware documentation for `app/Http/Kernel.php` registration: https://laravel.com/docs/10.x/middleware
- Prometheus histogram query documentation: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The OpenTelemetry provider registered only a string container key while services type-hinted `MeterInterface`. Changed the provider to bind `OpenTelemetry\API\Metrics\MeterInterface` directly so Laravel dependency injection can resolve the metric services.
- The code used removed/obsolete global registration via `Globals::registerInitialMeterProvider`. Replaced it with a container-managed `MeterProvider` and `ShutdownHandler::register([$meterProvider, 'shutdown'])`, matching the current OpenTelemetry PHP SDK pattern for flushing metrics.
- The initial setup omitted the OTLP exporter and HTTP client packages needed by the OTLP exporter example. Added `composer require open-telemetry/exporter-otlp php-http/guzzle7-adapter`.
- The OTLP exporter example incorrectly passed an endpoint string directly to `MetricExporter` and passed an interval to `ExportingReader`. Updated it to create a `PsrTransportFactory` transport, pass that transport to `MetricExporter`, and remove the unsupported interval argument/configuration.
- Laravel registration examples were outdated for Laravel 11 and later. Added `bootstrap/providers.php` provider registration and `bootstrap/app.php` middleware registration while keeping Laravel 10 and earlier `config/app.php` / `app/Http/Kernel.php` guidance.
- `DatabaseMetrics` registered a `DB::listen()` callback in its constructor but was never instantiated. Added a provider boot snippet that instantiates `DatabaseMetrics`.
- The cache wrapper detected hits by comparing returned values to `null` and the default value, which can misclassify valid cached values. Updated it to use `Cache::has($key)` before retrieving the value.
- The Prometheus P95 query used `histogram_quantile()` directly on the histogram metric name. Updated it to use the `_bucket` series with `sum(rate(...)) by (le)`.
- The production best practice recommending metric sampling was too broad for this OpenTelemetry PHP metrics context. Replaced it with guidance to avoid expensive work and keep attributes low-cardinality.

## Review Notes
Local `php` and `composer` executables were not available in the review environment, so syntax and API validation were performed against official documentation and upstream source rather than by executing the snippets.
