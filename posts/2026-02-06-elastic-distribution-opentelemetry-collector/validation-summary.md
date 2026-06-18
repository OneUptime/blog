# Validation Summary: How to Use Elastic Distribution of OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elastic Distribution of OpenTelemetry Collector (EDOT Collector)
- OpenTelemetry Collector configuration
- Elasticsearch exporter
- Elastic Cloud
- Elastic APM processor and connector
- Docker
- Kubernetes and Helm

## Sources Consulted
- Elastic EDOT Collector documentation: https://www.elastic.co/docs/reference/edot-collector
- Elastic EDOT Collector download documentation: https://www.elastic.co/docs/reference/edot-collector/download
- Elastic EDOT Collector components list: https://www.elastic.co/docs/reference/edot-collector/components
- Elastic Elasticsearch exporter documentation: https://www.elastic.co/docs/reference/edot-collector/components/elasticsearchexporter
- Elastic APM processor documentation: https://www.elastic.co/docs/reference/edot-collector/components/elasticapmprocessor
- Elastic Kubernetes EDOT quickstart: https://www.elastic.co/docs/solutions/observability/get-started/quickstart-unified-kubernetes-observability-with-elastic-distributions-of-opentelemetry-edot
- OpenTelemetry Collector Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Collector Contrib Elasticsearch exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/README.md

## Issues Found
- The Docker examples used the old/non-current `docker.elastic.co/beats/elastic-otel-collector` image path. Updated them to `docker.elastic.co/elastic-agent/elastic-otel-collector:9.4.2`.
- The Linux download example used a non-existent `elastic-otel-collector` artifact and binary name. Updated it to the current Elastic Agent package artifact and the `otelcol` binary documented by Elastic.
- The Helm example referenced a non-existent Elastic EDOT Collector chart. Updated it to use the official OpenTelemetry Collector Helm chart with the EDOT image repository and tag.
- The post described ECS mapping as the EDOT default and recommended `mapping.mode: ecs`. Current Elastic documentation says the Elasticsearch exporter defaults to `otel` mapping, while non-OTel modes such as `ecs` are not officially supported for EDOT configuration. Updated the examples and explanation to use `mapping.mode: otel`.
- The Elastic Cloud example said it used Cloud ID but configured an endpoint URL. Changed it to use `cloudid`.
- The Elastic Cloud exporter batching example used deprecated `flush` settings and deprecated `retry.max_requests`. Updated it to `sending_queue.batch` and `retry.max_retries`.
- The APM correlation example tried to copy existing attributes and add trace IDs through the attributes processor, which does not match the documented EDOT APM path. Replaced it with the Elastic APM processor and connector pattern from Elastic documentation.
- The Kubernetes manifest referenced a ServiceAccount without defining RBAC and used outdated image/mapping settings. Added minimal ServiceAccount/RBAC objects and updated the exporter, APM processor/connector, and image configuration.
- The EDOT vs upstream comparison and "When to Use" guidance were updated to reflect OTel-native mapping, Elastic APM enrichment, and automatic Elastic asset setup rather than ECS mapping.

## Review Notes
The post is now aligned with current EDOT 9.4.x documentation. Future updates should re-check the pinned EDOT version and artifact URL when Elastic releases newer 9.x versions.
