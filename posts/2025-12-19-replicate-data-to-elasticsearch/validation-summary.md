# Validation Summary: How to Replicate Data from Other Systems to Elasticsearch

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Elasticsearch
- Logstash
- Logstash JDBC input plugin
- Logstash Elasticsearch output plugin
- Debezium PostgreSQL connector
- Kafka Connect
- Confluent Elasticsearch Sink connector
- Python Elasticsearch client
- psycopg2
- kafka-python
- PostgreSQL

## Sources Consulted
- Elastic Logstash JDBC input plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-inputs-jdbc
- Elastic Logstash Elasticsearch output plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-outputs-elasticsearch
- Debezium PostgreSQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Debezium event flattening / ExtractNewRecordState documentation: https://debezium.io/documentation/reference/stable/transformations/event-flattening.html
- Confluent Elasticsearch Sink connector configuration reference: https://docs.confluent.io/kafka-connectors/elasticsearch/current/configuration_options.html
- Elastic Python client configuration documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/python/configuration
- Elastic Python client helpers documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/python/client-helpers
- Python Elasticsearch client API documentation: https://elasticsearch-py.readthedocs.io/en/latest/api/elasticsearch.html
- kafka-python KafkaConsumer documentation: https://kafka-python.readthedocs.io/en/1.2.2/apidoc/KafkaConsumer.html

## Issues Found
- The Debezium PostgreSQL connector example used the older `database.server.name` property. Changed it to the current `topic.prefix` property, which Debezium uses for PostgreSQL topic naming.
- The Confluent Elasticsearch Sink connector example included `type.name`, which is no longer listed in current connector configuration and is tied to removed Elasticsearch mapping types. Removed it.
- The Elasticsearch Sink connector examples used lowercase `delete` for `behavior.on.null.values`. Changed the examples to `DELETE`, matching the current documented valid values.
- The Debezium unwrap transform used `transforms.unwrap.drop.tombstones`. Updated it to `transforms.unwrap.delete.tombstone.handling.mode` with `tombstone`, matching current ExtractNewRecordState documentation.
- The Python Elasticsearch examples used older `body` and `ignore` call styles. Updated them to use `document=`, `doc=`, and `client.options(ignore_status=404)` where appropriate.
- The custom sync example accepted `index_name` but always wrote bulk actions to the hard-coded `articles` index. Updated `transform_record` to use the passed `index_name`.
- The custom sync SQL query interpolated the table name directly into an f-string. Updated it to use `psycopg2.sql.Identifier` so the table identifier is quoted safely.
- The Logstash JDBC example pinned an old PostgreSQL JDBC driver filename. Changed it to a generic `/path/to/postgresql.jar` placeholder to avoid presenting an outdated version as recommended.
- The soft-delete helper referenced `last_sync` without defining it and used a global `es` variable inside a class-style method. Updated the method signature to accept `last_sync`, use `self.es`, and close the cursor.

## Review Notes
The post is technically valid after the fixes. The examples remain simplified and do not cover production concerns such as initial snapshots, conflict handling, retry policy, checkpoint storage outside Elasticsearch, exactly-once guarantees, or handling multiple records with identical `updated_at` values across batches.
