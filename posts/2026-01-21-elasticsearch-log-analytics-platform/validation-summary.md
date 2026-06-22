# Validation Summary: How to Build a Log Analytics Platform with Elasticsearch

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Elasticsearch
- Index Lifecycle Management (ILM)
- Filebeat
- Logstash
- Kibana
- Ingest pipelines
- Elastic Stack security and TLS

## Sources Consulted
- Elastic Filebeat migration guide for `log` and `container` inputs to `filestream`: https://www.elastic.co/docs/reference/beats/filebeat/migrate-to-filestream
- Elastic Filebeat Elasticsearch output reference: https://www.elastic.co/guide/en/beats/filebeat/8.19/elasticsearch-output.html
- Elastic Elasticsearch ingest pipelines reference: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/ingest.html
- Elastic Logstash Beats input plugin reference: https://www.elastic.co/guide/en/logstash/8.19/plugins-inputs-beats.html
- Elastic Logstash Elasticsearch output plugin reference: https://www.elastic.co/docs/reference/logstash/plugins/plugins-outputs-elasticsearch
- Elastic Kibana Create data view API reference: https://www.elastic.co/docs/api/doc/kibana/operation/operation-createdataviewdefaultw
- Elastic Elasticsearch indexing buffer settings reference: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/indexing-buffer-settings
- Elastic Elasticsearch thread pool settings reference: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/thread-pool-settings
- Elastic Elasticsearch node roles reference: https://www.elastic.co/docs/deploy-manage/distributed-architecture/clusters-nodes-shards/node-roles
- Elastic ILM documentation: https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management

## Issues Found
- The Elasticsearch cURL examples used plain `localhost:9200` even though the cluster configuration enables HTTP TLS. Updated Elasticsearch API examples to use `https://localhost:9200` with `--cacert /etc/elasticsearch/certs/http_ca.crt`.
- The Filebeat configuration used the deprecated `log` input and `container` input. Updated standalone inputs to `filestream`, added required input IDs, moved multiline parsing under `parsers`, and used the `container` parser for container logs.
- Filebeat was writing to daily concrete indices while the post configured ILM rollover through the `logs` alias. Changed the Elasticsearch output to write to the `logs` alias and added the ingest pipeline setting.
- The Logstash Beats input used deprecated `ssl` and a generic key path. Updated it to `ssl_enabled` and a PKCS8 key path, matching the current plugin requirements.
- The Logstash Elasticsearch output used deprecated/obsolete TLS settings (`ssl` and `cacert`). Replaced them with `ssl_enabled` and `ssl_certificate_authorities`.
- The Logstash example created dynamic daily index names that would inherit the rollover policy but not the configured rollover alias. Changed the metadata index target to the `logs` write alias.
- The Kibana API example used the old index pattern terminology and endpoint. Updated it to the current data views API and request body.
- The performance section showed static Elasticsearch node settings being updated through the cluster settings API. Reworked the snippet as `elasticsearch.yml` node settings.

## Review Notes
- The post remains a conventional ELK-style guide. Elastic Agent and data streams are increasingly preferred for many new Elastic deployments, but the Filebeat, Logstash, ILM, and alias-based index examples are still valid when configured explicitly as shown.
