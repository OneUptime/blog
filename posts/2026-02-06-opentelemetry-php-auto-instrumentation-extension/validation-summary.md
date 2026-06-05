# Validation Summary: How to Use the OpenTelemetry PHP Auto-Instrumentation Extension

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry PHP
- OpenTelemetry PHP auto-instrumentation extension
- PHP 8
- PECL
- Composer
- OpenTelemetry SDK and OTLP exporter
- OpenTelemetry PHP auto-instrumentation packages for PDO, MySQLi, cURL, Guzzle, PSR-18, IO, Laravel, Symfony, and WordPress
- Docker

## Sources Consulted
- OpenTelemetry PHP zero-code instrumentation documentation: https://opentelemetry.io/docs/zero-code/php/
- OpenTelemetry PHP SDK documentation: https://opentelemetry.io/docs/languages/php/sdk/
- OpenTelemetry PHP auto-instrumentation extension repository: https://github.com/open-telemetry/opentelemetry-php-instrumentation
- PECL opentelemetry package page: https://pecl.php.net/package/opentelemetry
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- Packagist OpenTelemetry package listing and auto-instrumentation package metadata: https://packagist.org/packages/open-telemetry/
- Packagist PDO auto-instrumentation package: https://packagist.org/packages/open-telemetry/opentelemetry-auto-pdo
- Packagist Laravel auto-instrumentation package: https://packagist.org/packages/open-telemetry/opentelemetry-auto-laravel
- Packagist Symfony auto-instrumentation package: https://packagist.org/packages/open-telemetry/opentelemetry-auto-symfony
- Packagist Guzzle auto-instrumentation package: https://packagist.org/packages/open-telemetry/opentelemetry-auto-guzzle
- OpenTelemetry PHP context documentation: https://opentelemetry.io/docs/languages/php/context/

## Issues Found
- The post incorrectly implied that the C extension alone automatically captures HTTP requests, database queries, HTTP client calls, and framework operations. Updated the post to explain that the extension provides hooks and must be paired with Composer autoloading, the SDK, an exporter, and relevant Composer auto-instrumentation packages.
- PECL installation commands used `opentelemetry-beta`, but the package has stable releases and the official docs use `pecl install opentelemetry`. Updated Ubuntu, macOS, and Docker examples.
- Installation snippets omitted required Composer auto-instrumentation packages. Added representative `composer require` commands for the SDK, OTLP exporter, and relevant auto-instrumentation packages.
- The configuration snippet used Java-style lowercase dotted keys such as `otel.exporter.otlp.endpoint`, `otel.traces.sampler`, and `otel.bsp.*`, which are not the documented PHP SDK `php.ini` configuration names. Replaced them with documented `OTEL_*` settings.
- The post listed unsupported framework-specific `php.ini` keys such as `otel.instrumentation.laravel.enabled`. Replaced them with Composer package installation and the documented `OTEL_PHP_DISABLED_INSTRUMENTATIONS` setting.
- The custom hook example activated spans but did not detach scopes, which can leave the wrong context active. Updated the examples to store and detach scopes in post hooks.
- The custom hook example stored data on `$processor->__otel_span`, which can cause dynamic property issues on PHP 8.2+. Replaced it with keyed global storage for the example.
- The `auto_prepend_file` example implied the extension automatically loads custom hook files. Updated the wording and added a `require_once` for Composer autoloading in the hook file example.
- The performance section claimed a specific typical overhead of less than 5% without an official source. Replaced it with a workload-dependent statement.
- Troubleshooting used `ini_get_all('otel')` and `otel.log.level`, which do not match the documented PHP SDK configuration. Updated the commands and logging guidance.

## Review Notes
The post is technically relevant and salvageable. The corrected version now matches the current OpenTelemetry PHP zero-code model: extension plus SDK autoloading plus explicit auto-instrumentation packages. The exact spans and attributes still vary by installed package version and framework path, so future updates should keep package-specific claims conservative.
