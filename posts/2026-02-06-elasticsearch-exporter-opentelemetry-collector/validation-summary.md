# Validation Summary: How to Configure the Elasticsearch Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Elasticsearch exporter
- Elasticsearch
- Elastic Stack and Kibana
- TLS and Basic/API key authentication
- Collector processors and service telemetry

## Sources Consulted
- OpenTelemetry Collector Contrib Elasticsearch exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/README.md
- OpenTelemetry Collector Contrib Elasticsearch exporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/config.go
- OpenTelemetry Collector Basic Auth Authenticator extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/basicauthextension/README.md
- OpenTelemetry Collector TLS configuration settings: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector architecture and pipeline documentation: https://opentelemetry.io/docs/collector/architecture/
- Elasticsearch index template documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/index-templates.html

## Issues Found
- The post stated only Elasticsearch 7.x and 8.x as prerequisites. Updated this to match the exporter documentation: the exporter is API-compatible with Elasticsearch 7.17.x, 8.x, and 9.x, while the default OTel mapping mode requires Elasticsearch 8.12+ and works best with 8.16+.
- Several snippets used `auth.authenticator: basicauth` while defining the extension as `basicauth/elasticsearch`. Updated those references to `basicauth/elasticsearch` so they point to the configured extension instance.
- The API key example used a manual `Authorization` header. Replaced it with the exporter's documented `api_key` setting.
- The index-management examples used unsupported Go-style date patterns such as `%{2006-01-02}` in `traces_index` and `logs_index`. Replaced them with documented `logstash_format` settings using strftime formatting.
- The advanced and production examples included unsupported exporter fields for index settings and mapping behavior, including `index.number_of_shards`, `index.number_of_replicas`, `mapping.dedup`, and `mapping.mode: ecs`. Removed those fields and clarified that shard, replica, mapping, and ILM settings belong in Elasticsearch index templates.
- The performance and production examples used an unsupported `bulk` block and `retry.max_elapsed_time`, and used deprecated `flush` settings. Replaced them with documented `sending_queue.batch` and `retry.max_retries` settings.
- The Collector telemetry example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Removed the address line and kept `metrics.level: detailed`.
- The Elasticsearch index-template example was fenced as `json` even though it includes a `PUT` request line. Changed the fence to `http`.

## Review Notes
The Elasticsearch exporter supports metrics, but upstream marks metrics support as development. ECS and OTel mapping behavior has version-specific requirements; future updates should re-check exporter release notes before publishing configuration examples.
