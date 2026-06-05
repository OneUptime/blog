# Validation Summary: How to Export OpenTelemetry Logs to Logz.io Using the Logz.io Exporter in the

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector Contrib
- Logz.io exporter
- Logz.io logs and traces shipping tokens
- OpenTelemetry Collector filelog and OTLP receivers
- OpenTelemetry Collector processors
- Python OpenTelemetry logs SDK and logging instrumentation
- Docker Compose

## Sources Consulted
- Logz.io OpenTelemetry shipping documentation: https://docs.logz.io/docs/shipping/other/opentelemetry-data/
- Logz.io account region documentation: https://docs.logz.io/docs/user-guide/admin/hosting-regions/account-region/
- OpenTelemetry Collector Logz.io exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/logzioexporter/README.md
- OpenTelemetry Collector Logz.io exporter configuration source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/logzioexporter/config.go
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector filelog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python logging instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html

## Issues Found
- The region comment listed `wa`, but current Logz.io region documentation lists the applicable account region codes as `us`, `au`, `ca`, `eu`, and `uk`. Removed `wa` from the example comment.
- The custom endpoint example used `custom_endpoint`. The current Logz.io exporter documents `endpoint`; `custom_endpoint` is still mapped internally but is deprecated. Updated the example to use `endpoint`.
- The Python example imported and instantiated `opentelemetry.sdk._logs.LoggingHandler`, which current OpenTelemetry Python documentation marks as deprecated in favor of `opentelemetry-instrumentation-logging`. Updated the example to use `LoggingInstrumentor`.
- The Python example added an INFO-level handler but did not lower the root logger level from Python's default WARNING, so the `logger.info(...)` example would not be emitted. Added `logging.getLogger().setLevel(logging.INFO)`.

## Review Notes
The post is technically accurate after these corrections. Future revisions could pin the Collector image to a tested version instead of `latest`, and could include the Logz.io-recommended `user-agent` headers, but the snippets are valid without those changes.
