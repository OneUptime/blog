# Validation Summary: How to Trace PHP-FPM Processes with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PHP
- PHP-FPM
- OpenTelemetry PHP SDK
- OpenTelemetry OTLP exporters
- OpenTelemetry semantic conventions
- NGINX FastCGI configuration
- systemd service restart command

## Sources Consulted
- OpenTelemetry PHP documentation: https://opentelemetry.io/docs/languages/php/
- OpenTelemetry PHP instrumentation documentation: https://opentelemetry.io/docs/languages/php/instrumentation/
- OpenTelemetry PHP SDK documentation: https://opentelemetry.io/docs/languages/php/sdk/
- OpenTelemetry PHP API reference: https://open-telemetry.github.io/opentelemetry-php/
- OpenTelemetry OTLP exporter for PHP: https://github.com/opentelemetry-php/exporter-otlp
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- PHP-FPM status page documentation: https://www.php.net/manual/en/fpm.status.php
- PHP-FPM configuration documentation: https://www.php.net/manual/en/install.fpm.configuration.php

## Issues Found
- The trace bootstrap used the wrong OTLP HTTP transport class and old batch span processor construction. Updated it to use `OtlpHttpTransportFactory` and `BatchSpanProcessorBuilder`, matching current OpenTelemetry PHP APIs.
- The resource attributes used an outdated semantic convention class. Replaced those constants with stable resource attribute keys such as `service.name`, `process.pid`, and `host.name`.
- The HTTP span attributes used older names like `http.method`, `http.url`, and `http.status_code`. Updated them to current semantic convention names including `http.request.method`, `url.full`, `url.path`, `url.scheme`, `server.address`, `server.port`, `client.address`, and `http.response.status_code`.
- The request span scope was activated but never detached, and spans were not explicitly flushed after the shutdown callback ended the request span. Added scope storage, detachment, and provider shutdown after ending the span.
- The OPcache attribute only checked whether `opcache_get_status()` existed. Updated it to report the actual `opcache_enabled` value when available.
- The PHP-FPM pool directive `process_priority` was incorrect. Corrected it to `process.priority`.
- The metrics example built a meter provider incorrectly, did not configure an exporter or reader, used the observable gauge argument order incorrectly, returned values from observable callbacks instead of using `ObserverInterface`, and used hyphenated status keys that do not match PHP-FPM JSON output. Updated the example to use `MetricExporter`, `ExportingReader`, correct observable callbacks, and PHP-FPM status keys such as `active processes`, `idle processes`, `listen queue`, and `max active processes`.
- The process lifecycle snippet used `$_ENV` and `putenv()` as if they were reliable per-worker persistent state across PHP-FPM requests. Replaced it with a per-PID state-file example and corrected the request span reference to `$this->requestSpan`.
- The custom tracing examples used older semantic convention keys `db.statement`, `http.url`, and `http.method`. Updated them to `db.query.text`, `url.full`, and `http.request.method`.

## Review Notes
The updated examples are technically aligned with current OpenTelemetry PHP APIs and PHP-FPM documentation. The per-PID state-file lifecycle example is intentionally simple; production systems should account for worker restarts, PID reuse, file cleanup, and concurrent access patterns.
