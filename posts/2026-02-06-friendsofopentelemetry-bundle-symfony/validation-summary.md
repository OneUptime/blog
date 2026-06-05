# Validation Summary: How to Set Up the FriendsOfOpenTelemetry Bundle for Symfony

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry PHP SDK
- FriendsOfOpenTelemetry OpenTelemetry Bundle
- Symfony
- PHP
- Composer
- YAML configuration

## Sources Consulted
- FriendsOfOpenTelemetry OpenTelemetry Bundle Getting Started: https://friendsofopentelemetry.github.io/opentelemetry-bundle/user-guide/getting-started.html
- FriendsOfOpenTelemetry OpenTelemetry Bundle Configuration Reference: https://friendsofopentelemetry.github.io/opentelemetry-bundle/user-guide/configuration.html
- FriendsOfOpenTelemetry OpenTelemetry Bundle Traces documentation: https://friendsofopentelemetry.github.io/opentelemetry-bundle/instrumentation/traces.html
- FriendsOfOpenTelemetry OpenTelemetry Bundle GitHub source: https://github.com/FriendsOfOpenTelemetry/opentelemetry-bundle
- Packagist package metadata for friendsofopentelemetry/opentelemetry-bundle: https://packagist.org/packages/friendsofopentelemetry/opentelemetry-bundle
- OpenTelemetry PHP API/SDK documentation: https://opentelemetry.io/docs/languages/php/
- Symfony Security documentation and Symfony security-http source for LoginSuccessEvent/LoginFailureEvent: https://symfony.com/doc/7.4/security.html

## Issues Found
- The post stated PHP 8.1+ and Symfony 6.0+ support. Current package metadata requires PHP >=8.2 and Symfony 7.4 components, so the version requirement was updated.
- The installation instructions used Guzzle for HTTP transport. The bundle documentation recommends Symfony's PSR-18 `symfony/http-client` default, so the command was changed.
- The post claimed Symfony Flex auto-registration. Current bundle documentation says the bundle is not available through Symfony Flex and must be registered manually, so that claim was corrected.
- The main YAML used the wrong config filename, alias, and schema (`opentelemetry`, `resource`, top-level `exporters`, and unsupported capture options). It was rewritten to use `config/packages/open_telemetry.yaml`, the `open_telemetry` alias, `service`, trace `tracers/providers/processors/exporters`, DSN-based OTLP exporter configuration, and nested `instrumentation.<component>.tracing.enabled`.
- The sampler names and processor configuration were invalid for the bundle. They were changed to `trace_id_ratio`, `always_on`, and the currently supported `simple` trace processor configuration.
- The environment variables used endpoint/protocol fields that do not map to the bundle's DSN exporter configuration. They were replaced with `OTEL_EXPORTER_OTLP_TRACES_DSN`.
- The controller and security subscriber injected `TracerProviderInterface`; the bundle aliases `OpenTelemetry\API\Trace\TracerInterface` for application services. The examples now inject `TracerInterface` directly.
- The advanced custom service example referenced non-existent `opentelemetry.trace.*` service IDs. It now decorates the configured `open_telemetry.traces.processors.simple` service.
- Troubleshooting guidance referred to batch processor queue tuning and unsupported capture options. It was changed to sampling and component enablement guidance that matches the documented configuration.
- The Symfony profiler configuration used an unsupported `profiler` block. It was replaced with guidance to inspect traces in the OpenTelemetry backend and correlate by trace ID.

## Review Notes
PHP is not installed in this workspace, so snippets could not be run through `php -l`. Static review was performed against the current official bundle documentation, package metadata, and source. The FriendsOfOpenTelemetry bundle is still in beta, so configuration may change before a stable release.
