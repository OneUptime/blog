# Validation Summary: How to Configure the Splunk HEC Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Splunk HEC receiver
- Splunk HTTP Event Collector
- Splunk Universal Forwarder `outputs.conf`
- OpenTelemetry Collector processors and connectors
- OTLP HTTP exporter
- Nginx reverse proxy
- Python `requests`
- Node.js `splunk-logging`
- Prometheus-format Collector internal telemetry

## Sources Consulted
- OpenTelemetry Collector Contrib Splunk HEC receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/splunkhecreceiver/README.md
- OpenTelemetry Collector Contrib Splunk HEC receiver config and receiver implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/splunkhecreceiver
- OpenTelemetry Collector Contrib filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Contrib routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector Contrib probabilistic sampler processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- Splunk HEC REST API endpoint docs: https://help.splunk.com/en/splunk-enterprise/get-data-in/get-started-with-getting-data-in/9.0/get-data-with-http-event-collector/http-event-collector-rest-api-endpoints
- Splunk Universal Forwarder `outputs.conf` HTTP output docs: https://help.splunk.com/en/data-management/forward-data/universal-forwarder-manual/9.4/forward-data/configure-forwarding-with-outputs.conf

## Issues Found
- Corrected `access_token_passthrough` descriptions. The post said it controlled authentication/token acceptance, but official receiver docs and implementation show it only preserves the incoming HEC token as telemetry metadata.
- Corrected production authentication guidance. The receiver does not maintain a token whitelist, so the post now recommends token validation at a reverse proxy, load balancer, or authenticator layer.
- Corrected HEC raw/JSON parsing behavior. The receiver accepts JSON HEC events on non-raw paths and treats `raw_path` requests as raw data; it does not automatically detect raw versus JSON format from the body.
- Replaced the deprecated/old routing processor example with a current routing connector configuration using `connectors`, `default_pipelines`, OTTL conditions, and separate destination pipelines.
- Updated filter processor examples from legacy `logs.exclude/include` syntax to current `log_conditions` OTTL syntax.
- Updated log sampling configuration to account for HEC logs that may not have trace IDs by configuring record-attribute sampling and `fail_closed: false`.
- Corrected Universal Forwarder migration guidance. The previous multiple `[httpout:*]` dual-forwarding example was not supported by the documented `httpout` configuration; the post now shows a single cutover stanza and recommends mirroring or client-side dual-write for validation.
- Replaced deprecated/ignored `service.telemetry.metrics.address` usage with the current `service.telemetry.metrics.readers` Prometheus configuration.
- Corrected the Splunk HEC health response body code from `200` to `17`, while preserving the HTTP status as `200 OK`.
- Clarified 401 troubleshooting so it applies to the proxy/authentication layer rather than built-in receiver token validation.

## Review Notes
The post is now technically accurate for current OpenTelemetry Collector Contrib behavior. The examples still assume the deployed Collector distribution includes the Splunk HEC receiver, routing connector, filter processor, probabilistic sampler, and OTLP HTTP exporter.
