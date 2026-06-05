# Validation Summary: How to Use Elasticsearch as an OpenTelemetry Log and Trace Backend

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Elasticsearch exporter
- Elasticsearch
- Kibana
- Docker and Docker Compose
- Elasticsearch Index Lifecycle Management
- Elasticsearch Query DSL
- Elastic Common Schema

## Sources Consulted
- OpenTelemetry Collector Contrib Elasticsearch exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/README.md
- OpenTelemetry Collector Docker and OTLP receiver documentation: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector batch processor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/batchprocessor
- Elastic Elasticsearch Docker documentation: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-with-docker
- Elastic multi-node Docker Compose documentation: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-compose
- Elastic ILM policy documentation: https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/configure-lifecycle-policy
- Elastic Common Schema tracing fields: https://www.elastic.co/guide/en/ecs/current/ecs-tracing.html
- Elastic Common Schema log fields: https://www.elastic.co/docs/reference/ecs/ecs-log
- OpenTelemetry logs data model appendix for ECS mapping: https://opentelemetry.io/docs/specs/otel/logs/data-model-appendix/#elastic-common-schema

## Issues Found
- The multi-node Docker Compose example claimed to be production-like while enabling Elasticsearch security without transport TLS. I changed the wording to distinguish production guidance from local topology testing and disabled security in the local Compose example.
- The Collector configuration used deprecated `mapping.mode`, deprecated `flush`, and deprecated `retry.max_requests` exporter settings. I updated the example to use `mapping.allowed_modes`, a transform processor setting `elastic.mapping.mode`, `sending_queue.batch`, and `retry.max_retries`.
- The ILM explanation said data stayed warm for 14 days and then was deleted. Elasticsearch phase `min_age` values after rollover mean the delete phase starts at 14 days after rollover, so I corrected the wording.
- The ILM template configured a rollover alias but did not create the initial backing index and write alias required for alias-based rollover. I added the initial `otel-traces-000001` creation example.
- Elasticsearch API examples were fenced as JSON while containing request-line comments. I changed them to HTTP-style snippets with request lines and valid JSON bodies.
- Query examples used fields that did not match ECS mapping. I updated service, message, log severity, and trace ID fields to ECS-compatible names.

## Review Notes
The post remains version-specific around Elasticsearch 8.12. The Elasticsearch exporter documentation notes that ECS and OTel mapping modes require Elasticsearch 8.12 or newer, and OTel-native mode works best on Elasticsearch 8.16 or newer. The post uses ECS mapping, so Elasticsearch 8.12 remains technically valid, but newer versions are preferable for fresh deployments.
