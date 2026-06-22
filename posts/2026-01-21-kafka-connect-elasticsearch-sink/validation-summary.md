# Validation Summary: How to Sink Kafka Data to Elasticsearch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Kafka
- Kafka Connect
- Confluent Elasticsearch Sink Connector
- Elasticsearch
- Kibana
- Docker Compose
- Kafka Connect Single Message Transforms
- Schema Registry

## Sources Consulted
- Confluent Elasticsearch Service Sink Connector configuration reference: https://docs.confluent.io/kafka-connectors/elasticsearch/current/configuration_options.html
- Confluent Kafka Connect SMT overview: https://docs.confluent.io/kafka-connectors/transforms/current/overview.html
- Confluent ExtractTopic SMT reference: https://docs.confluent.io/kafka-connectors/transforms/current/extracttopic.html
- Confluent RegexRouter SMT reference: https://docs.confluent.io/kafka-connectors/transforms/current/regexrouter.html
- Confluent TimestampRouter SMT reference: https://docs.confluent.io/kafka-connectors/transforms/current/timestamprouter.html
- Confluent ValueToKey SMT reference: https://docs.confluent.io/kafka-connectors/transforms/current/valuetokey.html
- Confluent ReplaceField SMT reference: https://docs.confluent.io/kafka-connectors/transforms/current/replacefield-ak.html
- Apache Kafka Docker image documentation: https://kafka.apache.org/41/getting-started/docker/
- Elasticsearch create index template API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-index-template
- Elasticsearch index stats API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-stats
- Elasticsearch cat indices API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-indices
- Elasticsearch nodes stats API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-stats
- Kafka Connect sink connector error handling configuration: https://docs.confluent.io/platform/current/installation/configuration/connect/sink-connect-configs.html

## Issues Found
- Removed `type.name` from Elasticsearch Sink Connector examples. This setting is not part of the current Confluent Elasticsearch Sink Connector configuration and Elasticsearch 8 no longer uses document mapping types.
- Changed `write.method` examples from lowercase `insert`/`upsert` to documented `INSERT`/`UPSERT` values.
- Changed `behavior.on.null.values` examples from lowercase `delete` to documented `DELETE`.
- Added `flush.synchronously=true` to configurations that use topic-mutating SMTs such as `TimestampRouter`, `RegexRouter`, and `ExtractTopic`, because the connector documents this setting as required for topic-mutating SMTs.
- Changed the `ReplaceField` field-removal option from deprecated `blacklist` to current `exclude`.
- Corrected the INSERT mode explanation. Duplicate document IDs replace existing documents; they do not fail by default.
- Removed the unsupported `behavior.on.version.conflict` example because it is not listed in the Confluent Elasticsearch Sink Connector configuration reference.
- Added installation of `confluentinc/connect-transforms` in the Docker Compose setup because the `ExtractTopic` SMT is a Confluent transform that is not shipped by default with Apache Kafka or Confluent Platform.
- Removed the Debezium `ExtractNewRecordState` SMT from the Schema Registry example because the post's setup does not install Debezium transforms and the section is about an Avro sink rather than Debezium CDC unwrapping.

## Review Notes
The Docker Compose setup is suitable for a local tutorial, but production deployments should pin plugin versions, add service readiness checks, and avoid plaintext Elasticsearch credentials. The Elasticsearch connector version shown, `14.0.0`, is older than the current Confluent connector documentation reviewed on 2026-06-21, but the corrected options align with the current documented connector behavior.
