# Validation Summary: How to Use OpenSearch as an OpenTelemetry Backend

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSearch
- OpenSearch Dashboards
- OpenSearch Data Prepper
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib OpenSearch exporter
- OTLP
- Docker Compose
- OpenSearch Index State Management
- OpenSearch SQL plugin

## Sources Consulted
- OpenSearch Docker installation documentation: https://docs.opensearch.org/latest/install-and-configure/install-opensearch/docker/
- OpenSearch Dashboards Docker documentation: https://docs.opensearch.org/latest/install-and-configure/install-dashboards/docker/
- OpenSearch Data Prepper Trace Analytics documentation: https://docs.opensearch.org/latest/data-prepper/common-use-cases/trace-analytics/
- OpenSearch Data Prepper OTel trace source documentation: https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/otel-trace-source/
- OpenSearch Data Prepper OTLP source documentation: https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/otlp-source/
- OpenTelemetry Collector exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector Contrib OpenSearch exporter documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/opensearchexporter
- OpenTelemetry Collector Contrib Elasticsearch exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/README.md
- OpenSearch Index State Management policy documentation: https://docs.opensearch.org/latest/im-plugin/ism/policies/
- OpenSearch SQL/PPL date and time function documentation: https://docs.opensearch.org/latest/sql-and-ppl/functions/
- OpenSearch Agent Traces field documentation: https://docs.opensearch.org/latest/observing-your-data/agent-traces/agent-tracing/

## Issues Found
- The direct Collector configuration used the Elasticsearch exporter with deprecated `flush` and `retry.max_requests` settings. Replaced it with the current OpenTelemetry Collector Contrib `opensearch` exporter, using `http.endpoint`, `logs_index`, `traces_index`, and the Basic Auth authenticator pattern from the exporter documentation.
- The Data Prepper example entry pipeline only sent events to the span pipeline, so the service map pipeline would not receive trace events. Updated the entry pipeline to fan out to both the span and service map pipelines, matching the Trace Analytics pipeline pattern in the OpenSearch documentation.
- The Data Prepper snippet was labeled as trace and log ingestion even though it only configures `otel_trace_source`. Updated the comment to say trace ingestion.
- The ISM policy block was marked as JSON but contained JavaScript-style comments, making it invalid JSON. Removed the comments from the JSON block.
- The SQL example used `operationName`, but OpenSearch Trace Analytics span documents use the span `name` field. Updated the SELECT and GROUP BY clauses to use `name`.
- The SQL example queried `otel-v1-apm-span` without quoting or wildcarding the trace index pattern. Updated it to query the backtick-quoted `otel-v1-apm-span-*` pattern used by OpenSearch Trace Analytics.
- Remaining prose referred to the direct Elasticsearch exporter approach. Updated those references to the direct OpenSearch exporter approach.

## Review Notes
The OpenTelemetry Collector Contrib OpenSearch exporter is currently listed as alpha for traces and logs. Data Prepper remains the better-supported path for OpenSearch Trace Analytics service maps and trace-specific enrichment.
