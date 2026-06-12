# Validation Summary: How to Use Elasticsearch for Log Analysis

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Elasticsearch index templates, data streams, ILM, mappings, and query DSL
- Elastic Common Schema (ECS)
- Logstash inputs, filters, and Elasticsearch output
- Kibana data views, saved objects, dashboards, and alerting rules
- Elasticsearch security roles and field-level security

## Sources Consulted
- Elastic Elasticsearch index template documentation: https://www.elastic.co/docs/manage-data/data-store/templates
- Elastic Elasticsearch ILM rollover documentation: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-rollover
- Elastic Elasticsearch translog settings documentation: https://www.elastic.co/docs/reference/elasticsearch/index-settings/translog
- Elastic Elasticsearch merge settings documentation: https://www.elastic.co/docs/reference/elasticsearch/index-settings/merge
- Elastic Logstash Elasticsearch output plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-outputs-elasticsearch
- Elastic Logstash Beats input plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-inputs-beats
- Elastic Logstash HTTP input plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-inputs-http
- Elastic Kibana Create data view API documentation: https://www.elastic.co/docs/api/doc/kibana/v8/operation/operation-createdataviewdefaultw
- Elastic Kibana Create rule API documentation: https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-alerting-rule-id
- Elastic ECS event field documentation: https://www.elastic.co/docs/reference/ecs/ecs-event
- Elastic ECS event category and type allowed values: https://www.elastic.co/docs/reference/ecs/ecs-allowed-values-event-category and https://www.elastic.co/docs/reference/ecs/ecs-allowed-values-event-type
- Elastic ECS data stream field documentation: https://www.elastic.co/docs/reference/ecs/ecs-data_stream
- Elastic Elasticsearch role and field-level security documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-role and https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/controlling-access-at-document-field-level

## Issues Found
- The application index template used `composed_of` with component templates that were not defined in the post. Removed the undefined component template references so the example can be applied as shown.
- The rollover-alias example did not bootstrap the initial write index required for alias-based ILM rollover. Added a `logs-application-index-000001` bootstrap index with `is_write_index: true`.
- The regular index template and data stream example used the same `logs-application-*` pattern, which could cause template conflicts. Separated the alias-based index pattern from the data stream pattern.
- The data stream example created a data stream without first creating a matching index template with `"data_stream": {}`. Added the required data-stream-enabled index template.
- The Logstash configuration used older SSL option names in the Beats input and Elasticsearch outputs. Updated them to current options such as `ssl_enabled`, `ssl_verification_mode`, and `ssl_certificate_authorities`.
- The Logstash Elasticsearch output mixed a dynamic `index` target with `data_stream => true`. Removed the index setting from the data stream output and used a stable `data_stream_dataset`.
- The Logstash parse-failure output was described as a dead letter queue but actually wrote to a separate Elasticsearch index. Updated the comment to match the behavior.
- The Logstash cleanup removed `"host.name"` as a literal field name, which would not remove nested ECS `[host][name]` and would also be undesirable ECS metadata cleanup. Removed that field from the cleanup list.
- Kibana runtime-field scripts read `doc[...]` fields without guarding for unmapped fields across a broad `logs-*` data view. Added `doc.containsKey(...)` checks.
- The Kibana examples used non-ECS `http.response.time` for latency. Replaced it with ECS `event.duration` and adjusted thresholds/labels to nanoseconds.
- The saved search reference used `logs-*` as a data view saved object id without creating that id. Added an explicit data view id and referenced it from the saved search.
- The `.es-query` alert example supplied `esQuery` as an object and used the wrong action group for an Elasticsearch query rule. Updated `esQuery` to the string format used by Kibana's API, added required query-rule parameters, and changed the action group to `query matched`.
- The performance template used the deprecated legacy `_template` endpoint. Updated it to the composable `_index_template` endpoint and wrapped settings under `template.settings`.

## Review Notes
The post is now technically valid as a current Elastic Stack guide. Some operational choices, such as shard counts, translog async durability, force merge, and warm/cold allocation, remain workload-dependent and should be tested against production data volume and recovery requirements before use.
