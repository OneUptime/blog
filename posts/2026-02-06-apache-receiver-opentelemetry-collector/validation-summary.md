# Validation Summary: How to Configure the Apache Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Apache HTTP Server
- Apache `mod_status`
- Apache Multi-Processing Modules (MPMs)
- OpenTelemetry Collector Contrib
- OpenTelemetry Collector Apache receiver
- OpenTelemetry Collector processors and exporters
- OTLP HTTP export
- OneUptime

## Sources Consulted
- OpenTelemetry Collector Apache receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/apachereceiver/README.md
- OpenTelemetry Collector Apache receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/apachereceiver/metadata.yaml
- OpenTelemetry Collector Apache receiver implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/apachereceiver/scraper.go
- OpenTelemetry Collector HTTP configuration docs: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md
- OpenTelemetry Collector OTLP HTTP exporter docs: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- Apache HTTP Server `mod_status` docs: https://httpd.apache.org/docs/current/mod/mod_status.html
- Apache HTTP Server MPM docs: https://httpd.apache.org/docs/current/en/mpm.html
- Apache HTTP Server prefork MPM docs: https://httpd.apache.org/docs/2.4/en/mod/prefork.html
- Apache HTTP Server worker MPM docs: https://httpd.apache.org/docs/2.4/mod/worker.html
- Apache HTTP Server event MPM docs: https://httpd.apache.org/docs/2.4/en/mod/event.html
- OneUptime OpenTelemetry docs: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The examples used `otlphttp`, which the current OpenTelemetry Collector documentation identifies as a deprecated alias for the OTLP HTTP exporter. Updated exporter names and pipeline references to `otlp_http`.
- The post referred to `apache.workers.busy`, `apache.workers.idle`, and `apache.workers.{state}` metrics. The Apache receiver exposes `apache.workers` with a `state` attribute for busy/idle workers, and `apache.scoreboard` with a `state` attribute for scoreboard states. Updated the metric descriptions and alert examples.
- The post referred to `apache.cpu`; the receiver exposes `apache.cpu.load` for current CPU load. Updated the metric name.
- The scoreboard state list included `writing`; the receiver maps Apache scoreboard `W` to `sending`. Updated the state list and overview wording.
- A commented `metricstransform` example referenced a non-existent `apache.workers.busy` metric. Updated it to use `apache.cpu.load`.
- The Mermaid diagram used raw line breaks inside node labels, which can fail in Mermaid parsers. Replaced them with `<br/>` line breaks.

## Review Notes
The Apache receiver is part of the Collector Contrib distribution and currently documents support for Apache HTTP Server 2.4.13+. The `mod_status` documentation notes that Apache 2.3.6 and later enables `ExtendedStatus` by default when `mod_status` is loaded, but keeping `ExtendedStatus On` in the guide is still valid and makes the requirement explicit for detailed status fields.
