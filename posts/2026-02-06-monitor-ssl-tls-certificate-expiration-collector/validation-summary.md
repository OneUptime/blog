# Validation Summary: How to Monitor SSL/TLS Certificate Expiration with the Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- HTTP Check receiver
- File Log receiver
- OTLP exporter
- TLS / X.509 certificates
- OpenSSL CLI
- Bash scripting
- Certbot / Let's Encrypt renewal workflows

## Sources Consulted
- OpenTelemetry Collector Contrib HTTP Check receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/httpcheckreceiver
- OpenTelemetry Collector Contrib HTTP Check receiver metadata: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/receiver/httpcheckreceiver/metadata.yaml
- OpenTelemetry Collector Contrib HTTP Check receiver generated metrics documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/httpcheckreceiver/documentation.md
- OpenTelemetry Collector Contrib File Log receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Contrib File Log receiver metadata: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/receiver/filelogreceiver/metadata.yaml
- OpenTelemetry Collector TLS configuration documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md
- OpenTelemetry Collector HTTP configuration documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md
- OpenTelemetry Collector Stanza JSON parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/json_parser.md
- OpenSSL local CLI help for `openssl s_client` and `openssl x509`
- GNU coreutils local CLI help for `date`
- Let's Encrypt FAQ: https://letsencrypt.org/docs/faq/

## Issues Found
- The post used the deprecated `httpcheck` receiver type. Updated examples and prose to use the current `http_check` component type.
- The HTTP Check receiver's TLS certificate metric is disabled by default. Added `metrics.httpcheck.tls.cert_remaining.enabled: true` to the Collector configuration.
- The post described the HTTP Check receiver as capturing the certificate expiration date directly. Corrected this to say it reports seconds until the certificate's X.509 `NotAfter` time via `httpcheck.tls.cert_remaining`.
- The post used the deprecated `filelog` receiver type. Updated examples and prose to use the current `file_log` component type.
- The custom script section called the approach a script receiver. Corrected it to describe a script feeding structured logs into the File Log receiver.
- The alert examples used a non-standard `tls.days_remaining` metric. Updated them to use the documented `httpcheck.tls.cert_remaining` metric in seconds.
- The renewal-history example incorrectly implied that the File Log receiver emits an event when a certificate PEM file is modified. Replaced it with an event-log pattern where a renewal hook writes JSON and the File Log receiver tails that log.

## Review Notes
- The Bash examples are illustrative and valid for typical Linux environments. The network script includes a BSD/macOS `date -j` fallback, but the file-based script uses GNU `date -d`; a production version should standardize the target platform or add the same fallback.
- The script-based examples emit logs with certificate attributes, not native OpenTelemetry metrics. A production implementation could convert those logs to metrics downstream or use a dedicated metric-producing script/exporter.
- Let's Encrypt currently documents 90-day default certificates and recommends renewing 90-day certificates every 60 days. Let's Encrypt has announced shorter default certificate lifetimes in the future, so this section may need another review when those changes take effect.
