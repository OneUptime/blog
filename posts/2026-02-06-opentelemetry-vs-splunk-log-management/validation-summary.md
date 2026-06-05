# Validation Summary: How to Compare OpenTelemetry vs Splunk for Log Management

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- OpenTelemetry Collector filelog receiver
- OpenTelemetry Collector filter processor
- OpenTelemetry Collector routing connector
- OpenTelemetry Collector Splunk HEC exporter
- Splunk Enterprise and Splunk Cloud Platform
- Splunk Universal Forwarder and Heavy Forwarder
- Splunk HTTP Event Collector
- Splunk Search Processing Language

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python logging instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector routing connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector resource processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry Collector Splunk HEC exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/splunkhecexporter/README.md
- Splunk HTTP Event Collector documentation: https://docs.splunk.com/Documentation/SplunkCloud/latest/Data/UsetheHTTPEventCollector
- Splunk HEC examples: https://docs.splunk.com/Documentation/Splunk/latest/Data/HECExamples
- Splunk forwarder types documentation: https://docs.splunk.com/Documentation/SplunkCloud/latest/Forwarding/Typesofforwarders
- Splunk rex command documentation: https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/Rex
- Splunk aggregate functions documentation: https://help.splunk.com/en/splunk-enterprise/spl-search-reference/10.0/statistical-and-charting-functions/aggregate-functions

## Issues Found
- The OpenTelemetry Python logging example created only a log provider before claiming logs inside spans include trace context. I added a real `TracerProvider`, `OTLPSpanExporter`, span processor, and global provider setup so the example produces meaningful span context for correlation.
- The infrastructure Collector example included `from_attribute: ""` for `host.name`, which is not a valid useful resource processor source. I removed that invalid resource action and kept the fixed `service.name` upsert.
- The cost-control Collector example used deprecated `logs.log_record` filter syntax. I updated it to the current `log_conditions` syntax with `error_mode: ignore`.
- The cost-control Collector example claimed to use routing but did not configure a routing connector. I added a `routing` connector with an error-log route to Splunk and a default archive pipeline.
- The Splunk HEC exporter endpoint omitted the HEC path. I changed it to include `/services/collector`, matching the exporter documentation examples.

## Review Notes
The post is technically sound after the fixes. The OpenTelemetry Python logs API still uses `_logs` module paths in current official examples, so that import style is acceptable but remains version-sensitive.
