# Validation Summary: How to Configure the Webhook Event Receiver in the OpenTelemetry Collector to

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib webhook event receiver
- OpenTelemetry Collector processors and exporters
- Docker Compose
- nginx reverse proxy configuration
- curl

## Sources Consulted
- OpenTelemetry Collector Contrib webhook event receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/webhookeventreceiver/README.md
- OpenTelemetry Collector Contrib webhook event receiver config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/webhookeventreceiver/config.go
- OpenTelemetry Collector Contrib webhook event receiver implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/webhookeventreceiver/receiver.go
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector Contrib health check extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/healthcheckextension/README.md
- OpenTelemetry Collector Contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- Docker Compose specification: https://github.com/compose-spec/compose-spec/blob/main/spec.md

## Issues Found
- The post used the deprecated receiver type `webhookevent`. Updated examples and explanation to use the current `webhook_event` receiver name.
- The description said the receiver converts webhook data into logs and traces. The receiver supports logs, so the description now says logs only.
- The basic configuration used the removed `logging` exporter and `loglevel` option. Replaced it with the current `debug` exporter and `verbosity: detailed`.
- The multiple-source examples used blank `required_header.value` fields and described them as accepting any non-empty value. The receiver requires both key and value when `required_header` is configured and checks for an exact value, so the examples now use explicit expected values.
- The transform processor example extracted `repository.full_name`, which did not match the sample webhook payload. Updated it to extract the `service` field from the sample payload and added `error_mode: ignore`, which is the recommended transform processor mode.
- The health check section implied the separate `health_check` extension is the receiver health endpoint. Updated the snippet to include the webhook receiver's own `health_path` and kept the Collector health check extension as an infrastructure probe.
- Removed the obsolete top-level Docker Compose `version` field from the Compose example.

## Review Notes
The YAML snippets were parsed locally for syntax. A local `otelcol-contrib` binary was not available in the workspace, so Collector runtime validation was performed against the current upstream documentation and source rather than by running the Collector.
