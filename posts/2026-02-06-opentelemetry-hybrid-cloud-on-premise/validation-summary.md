# Validation Summary: How to Handle OpenTelemetry in Hybrid (Cloud + On-Premise) Environments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP over gRPC and HTTP
- Collector TLS and mTLS configuration
- Collector exporter retry and persistent sending queues
- Collector file exporter and file storage extension
- W3C Trace Context headers
- NGINX reverse proxy header forwarding
- systemd service deployment
- Prometheus scraping and syslog receiver configuration

## Sources Consulted
- OpenTelemetry Collector Linux installation documentation: https://opentelemetry.io/docs/collector/install/binary/linux/
- OpenTelemetry Collector configuration and TLS documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector OTLP receiver documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector OTLP HTTP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector exporter helper retry and queue documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector file storage extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/storage/filestorage/README.md
- OpenTelemetry Collector file exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/fileexporter/README.md
- OpenTelemetry Collector syslog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/syslogreceiver/README.md
- NGINX proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- W3C Trace Context recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The Collector examples used `otlphttp`, which current Collector documentation marks as a deprecated alias. Updated the exporter name and pipeline references to `otlp_http`.
- The persistent queue example configured `file_storage` but did not load it under `service.extensions`, and it was not a complete valid pipeline. Added a minimal OTLP receiver, `service.extensions: [file_storage]`, and a traces pipeline using `otlp_http`.
- The `file_storage` directory must exist unless directory creation is enabled. Added `create_directory: true` to the example.
- The post said persistent queues mean "No data is lost." Collector queue documentation notes data can still be dropped when queues fill, storage fails, or retry limits are exceeded. Reworded the claim to describe the actual guarantees and failure cases.
- The NGINX example used `proxy_pass_header` for request trace headers. That directive permits response headers from the proxied server to the client, while request forwarding should use `proxy_set_header`. Removed the incorrect `proxy_pass_header` lines.
- The bare-metal install command downloaded a non-existent uncompressed release asset for `otelcol-contrib_0.96.0_linux_amd64` directly into `/usr/local/bin`. Updated the example to use the current documented `.tar.gz` release asset, extract it, and install the binary.

## Review Notes
Validated the corrected Collector YAML examples with `otelcol-contrib` v0.153.0 using the `validate` subcommand. The install script body was checked with `bash -n`. TLS examples still require real certificate files and hostnames appropriate to the deployment environment.
