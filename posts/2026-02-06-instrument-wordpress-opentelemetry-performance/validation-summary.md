# Validation Summary: How to Instrument WordPress with OpenTelemetry for Performance Monitoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- WordPress
- PHP
- OpenTelemetry PHP SDK
- OpenTelemetry OTLP exporter
- Composer
- MySQL database tracing
- WooCommerce hooks

## Sources Consulted
- OpenTelemetry PHP instrumentation documentation: https://opentelemetry.io/docs/languages/php/instrumentation/
- OpenTelemetry PHP exporters documentation: https://opentelemetry.io/docs/languages/php/exporters/
- OpenTelemetry PHP resources documentation: https://opentelemetry.io/docs/languages/php/resources/
- OpenTelemetry PHP generated API documentation for span builders, span lifecycle, and samplers: https://open-telemetry.github.io/opentelemetry-php/
- WordPress `plugin_loaded` hook reference: https://developer.wordpress.org/reference/hooks/plugin_loaded/
- WordPress `pre_get_posts` hook reference: https://developer.wordpress.org/reference/hooks/pre_get_posts/
- WordPress REST API `rest_pre_dispatch` and `rest_post_dispatch` hook references: https://developer.wordpress.org/reference/hooks/rest_pre_dispatch/ and https://developer.wordpress.org/reference/hooks/rest_post_dispatch/
- WordPress `wpdb::log_query()` and `SAVEQUERIES` references: https://developer.wordpress.org/reference/classes/wpdb/log_query/ and https://developer.wordpress.org/reference/classes/wpdb/
- Packagist package metadata for `open-telemetry/exporter-otlp` and `open-telemetry/opentelemetry-auto-wordpress`: https://packagist.org/packages/open-telemetry/exporter-otlp and https://packagist.org/packages/open-telemetry/opentelemetry-auto-wordpress

## Issues Found
- The dependency list included `open-telemetry/opentelemetry-auto-wordpress` for a manual instrumentation tutorial. That package requires the OpenTelemetry PHP extension and was not used by the code sample, so it was removed. Added `open-telemetry/sem-conv` and `guzzlehttp/guzzle` to match the OpenTelemetry PHP documentation for semantic conventions and PSR HTTP transport dependencies.
- The OTLP exporter example used a non-current `HttpTransportFactory::create()` call. Updated it to `OtlpHttpTransportFactory()->create(...)`, matching the current OpenTelemetry PHP exporter documentation.
- The resource semantic convention constants used an outdated/general `ResourceAttributes` import and `DEPLOYMENT_ENVIRONMENT`. Updated the sample to use current service and deployment semantic convention classes.
- The SDK registration used `Globals::registerInitializer(...)`, which was not the current documented application setup pattern. Updated it to `Sdk::builder()->setTracerProvider(...)->setAutoShutdown(true)->buildAndRegisterGlobal()`.
- The sampling environment variable was shown but not applied by the manual tracer setup. Updated the code to read `OTEL_TRACES_SAMPLER_ARG` and configure a parent-based trace ID ratio sampler.
- The database query instrumentation attempted to start spans on the `query` filter and end them on `posts_results`, which does not time arbitrary database queries correctly. Updated it to use WordPress `SAVEQUERIES` and `log_query_custom_data`, which provides SQL, elapsed query time, call stack, and start time after each query is logged.
- The root span activated a scope but did not keep or detach it. Updated the code to store the scope and detach it during shutdown.
- The plugin loading section claimed per-plugin load times, but WordPress `plugin_loaded` fires after a plugin has loaded. Updated the wording and output list to describe plugin load events instead of measured load durations.
- The `the_posts` callback was registered with `add_action` even though `the_posts` is a filter that must return posts. Updated it to `add_filter`.
- Template and REST spans could remain set in globals after ending. Updated the sample to unset them and to close any still-open spans during shutdown.

## Review Notes
The tutorial is now technically valid as a manual instrumentation example, but production users should be careful with `SAVEQUERIES` and `db.statement` because both can add overhead and expose sensitive SQL values. The post already discusses sampling, but a future revision could add explicit guidance about redacting SQL statements before exporting telemetry.
