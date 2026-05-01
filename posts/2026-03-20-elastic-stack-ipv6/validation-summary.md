# Validation Summary: How to Configure Elastic Stack for IPv6 Log Analysis

## Status
validated

## Post Type
Guide

## Technologies Covered
- Elasticsearch
- Logstash
- Kibana
- Filebeat
- Elastic Common Schema (ECS)
- IPv6

## Sources Consulted
- Elastic ECS source fields: https://www.elastic.co/docs/reference/ecs/ecs-source
- Elastic ECS network fields: https://www.elastic.co/docs/reference/ecs/ecs-network
- Elasticsearch `ip` field type: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/ip
- Elasticsearch `ip_prefix` aggregation: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-ipprefix-aggregation
- Elasticsearch index templates: https://www.elastic.co/docs/manage-data/data-store/templates
- Elasticsearch networking settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/networking-settings
- Logstash Beats input plugin: https://www.elastic.co/docs/reference/logstash/plugins/plugins-inputs-beats
- Logstash Grok filter plugin: https://www.elastic.co/docs/reference/logstash/plugins/plugins-filters-grok
- Logstash Mutate filter plugin: https://www.elastic.co/docs/reference/logstash/plugins/plugins-filters-mutate
- Logstash Elasticsearch output plugin: https://www.elastic.co/docs/reference/logstash/plugins/plugins-outputs-elasticsearch
- Filebeat filestream migration guide: https://www.elastic.co/docs/reference/beats/filebeat/migrate-to-filestream
- Filebeat filestream input: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-filestream
- Filebeat Logstash output: https://www.elastic.co/docs/reference/beats/filebeat/logstash-output
- Filebeat iptables module: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-module-iptables
- Filebeat ingest pipeline loading: https://www.elastic.co/docs/reference/beats/filebeat/load-ingest-pipelines
- Logstash ingest pipelines with Filebeat modules: https://www.elastic.co/guide/en/logstash/current/use-ingest-pipelines.html
- RFC 3849 IPv6 documentation prefix: https://www.rfc-editor.org/rfc/rfc3849.html

## Issues Found
- The mapping example created a single `network-logs` index, but the Logstash output wrote to `network-logs-%{+YYYY.MM.dd}`. I changed the example to a composable index template for `network-logs-*` so the mapping actually applies to the generated indices.
- The ECS mapping used `integer` for `source.port` and `destination.port`, but ECS defines these port fields as `long`. I updated both mappings to `long`.
- The post mapped firewall `PROTO` values into `network.protocol`, but ECS uses `network.transport` for transport-layer values such as `tcp`, `udp`, and `ipv6-icmp`. I changed the mapping and Logstash example accordingly.
- The Logstash filter checked `[type] == "firewall"` even though Filebeat custom fields are nested under `fields` by default. I changed the Filebeat example to emit `fields.log_type` and updated Logstash to test `[fields][log_type]`.
- The Filebeat example used the deprecated `log` input. I replaced it with `filestream` and added the required input `id` from current Filebeat documentation.
- Several IPv6 literals were invalid or inconsistent with the rest of the pipeline: `2001:db8:corp::/48`, `2001:db8:dmz::/48`, and `[2001:db8::logstash]:5044`. I replaced them with valid documentation-prefix addresses under `2001:db8::/32`.
- The Elasticsearch output host in Logstash omitted the URI scheme. I changed it to `http://[::1]:9200`, matching the current output plugin format.
- The `ip_prefix` aggregation omitted `is_ipv6: true`, which is required for IPv6 prefix aggregation. I added it and also changed the search targets to `network-logs-*` so the examples query the same indices the pipeline writes to.
- The original logic only set `network.type` for one classification branch, which made `network.type: ipv6` unreliable in Kibana. I updated the filter so all IPv6 matches set `network.type`, and I normalized `event.action` to lowercase so the KQL example matches the ingested values.
- The Filebeat module section would duplicate events if enabled alongside the raw input and was incomplete for Logstash-based module parsing. I kept it as an optional alternative, added `var.input: "file"`, and documented the required ingest-pipeline step.

## Review Notes
- The post now aligns with current Elastic documentation, but Elastic also recommends Elastic Agent for many modern collection workflows. Filebeat and Logstash remain valid for custom pipelines like this one.
- `source.ip_type` is a custom field, not a standard ECS field. The post now maps it explicitly as a `keyword`, which makes the aggregation example work correctly.
- The Logstash example still captures the syslog timestamp into a `timestamp` field rather than parsing it into `@timestamp`. That is acceptable for the article as written because Filebeat will still provide `@timestamp`, but a production pipeline would often add a `date` filter to preserve event time from the original log line.
