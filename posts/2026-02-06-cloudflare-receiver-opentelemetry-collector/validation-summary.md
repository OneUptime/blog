# Validation Summary: How to Configure the Cloudflare Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry Cloudflare receiver
- Cloudflare Logpush HTTP destinations
- Collector processors and exporters
- OTLP HTTP export
- Prometheus scraping of Collector internal metrics

## Sources Consulted
- OpenTelemetry Collector Contrib Cloudflare receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/cloudflarereceiver/README.md
- OpenTelemetry Collector receivers list: https://opentelemetry.io/docs/collector/components/receiver/
- Cloudflare Logpush HTTP destination documentation: https://developers.cloudflare.com/logs/logpush/logpush-job/enable-destinations/http/
- Cloudflare Logpush API configuration documentation: https://developers.cloudflare.com/logs/logpush/logpush-job/api-configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md

## Issues Found
- The receiver configuration examples placed `endpoint` and `secret` directly under `cloudflare`. The Cloudflare receiver expects log settings under `cloudflare.logs`, so the examples were updated.
- The post used `X-Auth-Token` for receiver authentication. The official receiver expects the configured secret in the `X-CF-Secret` header, so the header name and Logpush `destination_conf` examples were corrected.
- The post described Cloudflare requests as containing a JSON array. The receiver expects Cloudflare Logpush uploads in NDJSON format, so the data flow description was corrected.
- The Cloudflare API example used legacy `logpull_options` and single-quoted JSON that would not expand shell variables. It now uses `output_options` and a heredoc payload.
- The production example used an attributes processor to copy fields in the wrong direction. It now uses the Cloudflare receiver's `attributes` mapping.
- The monitoring example configured a Prometheus exporter/receiver pipeline incorrectly for Collector internal metrics. It now shows the Collector internal metrics endpoint and instructs Prometheus to scrape it.
- The multi-dataset example used deprecated filter processor syntax and assumed a `cloudflare.dataset` attribute. It now routes with separate receiver instances and pipelines.
- The security token command used base64 output in a URL parameter context. It now generates a URL-safe hexadecimal token.
- The performance section overstated Logpush cadence and multi-endpoint behavior. It now uses more precise batching and load-balancer guidance.

## Review Notes
The Cloudflare receiver is alpha in OpenTelemetry Collector Contrib. The post now avoids overclaiming universal dataset support and notes that non-HTTP datasets require appropriate timestamp and field configuration.
