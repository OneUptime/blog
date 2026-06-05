# Validation Summary: How to Integrate OpenTelemetry Traces and Logs with Your SIEM Platform

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector filter, transform, batch, OTLP, Splunk HEC, Elasticsearch, and Sumo Logic components
- OpenTelemetry Python tracing API
- Python structured logging
- Splunk HEC and SPL
- Elasticsearch / Elastic SIEM
- Sumo Logic HTTP source ingestion

## Sources Consulted
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Splunk HEC exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/splunkhecexporter/README.md
- OpenTelemetry Collector Elasticsearch exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/README.md
- OpenTelemetry Collector Sumo Logic exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/sumologicexporter/README.md
- OpenTelemetry Python tracing documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python SpanContext API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- Splunk HEC exporter documentation for Splunk Distribution of OpenTelemetry Collector: https://help.splunk.com/en/splunk-observability-cloud/manage-data/splunk-distribution-of-the-opentelemetry-collector/get-started-with-the-splunk-distribution-of-the-opentelemetry-collector/collector-components/exporters/splunk-hec-exporter

## Issues Found
- The Collector filter processor configuration used the older include/match syntax for traces and logs. Updated it to the current OTTL `trace_conditions` and `log_conditions` format documented by the filter processor.
- The SIEM traces pipeline only exported to Splunk even though the Elasticsearch exporter was configured with a traces index. Added Elasticsearch to the security traces pipeline so the trace routing matches the Elastic SIEM configuration shown.
- The Sumo Logic exporter example used `source_name`, `source_category`, and `compress_encoding`, which are no longer supported by the current exporter. Replaced them with the current `compression` option and clarified that the endpoint is the HTTP source endpoint.
- The structured logging example emitted `trace_flags` as the OpenTelemetry object rather than an explicitly JSON-friendly value. Converted it to `int(span_context.trace_flags)`.
- The `security_events.py` snippet used `logging` and `security_logger` without importing them. Added the missing imports.

## Review Notes
- The examples assume a Collector distribution that includes contrib exporters such as `splunk_hec`, `elasticsearch`, and `sumologic`.
- The filter processor drops matching telemetry, so the updated conditions use negated matches to keep only security-relevant spans and logs in the SIEM pipelines.
