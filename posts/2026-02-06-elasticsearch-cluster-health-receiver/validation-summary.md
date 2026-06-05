# Validation Summary: How to Monitor Elasticsearch Cluster Health with the Elasticsearch Receiver

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector Contrib
- Elasticsearch receiver
- Elasticsearch cluster health APIs
- Elasticsearch security roles and users
- Docker Compose
- OTLP exporter configuration

## Sources Consulted
- OpenTelemetry Collector Contrib Elasticsearch receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/elasticsearchreceiver/README.md
- OpenTelemetry Collector Contrib Elasticsearch receiver generated metrics documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/elasticsearchreceiver/documentation.md
- OpenTelemetry Collector Contrib Elasticsearch receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/elasticsearchreceiver/metadata.yaml
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- Elasticsearch cluster health API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-health
- Elasticsearch security privileges documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/security-privileges.html
- Elasticsearch create or update roles API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/v8/operation/operation-security-put-role
- Elasticsearch create or update users API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/v8/operation/operation-security-put-user

## Issues Found
- The post used `elasticsearch.cluster.health.status`, but the current Elasticsearch receiver emits `elasticsearch.cluster.health` with a `status` attribute. Updated the receiver configuration, metric description, and red cluster alert condition.
- The post listed shard metrics as separate `elasticsearch.cluster.health.*_shards` metrics. The current receiver emits shard counts through `elasticsearch.cluster.shards` with a `state` attribute. Updated the shard metric list and unassigned shard alert condition.
- The post used `elasticsearch.cluster.health.number_of_nodes` and `elasticsearch.cluster.health.number_of_data_nodes`, but the receiver emits `elasticsearch.cluster.nodes` and `elasticsearch.cluster.data_nodes`. Updated the node status section and node count alert.

## Review Notes
- The Elasticsearch receiver is documented as beta for metrics and supports Elasticsearch 7.9+.
- The Docker Compose example uses `otel/opentelemetry-collector-contrib:latest`, which is valid for an example but can introduce version drift in production. Pinning a collector image version would make the setup more reproducible.
