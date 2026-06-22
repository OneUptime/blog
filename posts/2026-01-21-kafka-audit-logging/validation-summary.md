# Validation Summary: How to Audit Kafka Access and Operations

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka
- Kafka ACL authorization and authorizer logging
- Kafka Java producer and consumer interceptors
- confluent-kafka Python client
- Filebeat
- Elasticsearch
- Log4j 2

## Sources Consulted
- Apache Kafka Authorization and ACLs documentation: https://kafka.apache.org/43/security/authorization-and-acls/
- Apache Kafka Producer configuration documentation: https://kafka.apache.org/41/configuration/producer-configs/
- Kafka ProducerInterceptor Javadocs: https://docs.confluent.io/platform/current/clients/javadocs/javadoc/org/apache/kafka/clients/producer/ProducerInterceptor.html
- Apache Kafka ConsumerInterceptor Javadocs: https://kafka.apache.org/20/javadoc/org/apache/kafka/clients/consumer/ConsumerInterceptor.html
- Confluent Platform logging documentation: https://docs.confluent.io/platform/current/monitor/cp-logging.html
- confluent-kafka Python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Elastic Filebeat log input documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-log
- Elastic Filebeat filestream input documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-filestream
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Elasticsearch Python client documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/python

## Issues Found
- The broker authorizer configuration used `kafka.security.authorizer.AclAuthorizer` without version context. Updated it to `org.apache.kafka.metadata.authorizer.StandardAuthorizer`, which is the documented authorizer for KRaft-based Kafka clusters.
- The post put a Log4j logger setting in `server.properties`, which Kafka broker configuration does not consume as a broker property. Moved logging configuration into a Log4j 2 YAML example.
- The Log4j example used Log4j 1 style properties. Updated it to a Log4j 2 `log4j2.yaml` example, matching current Kafka and Confluent logging configuration.
- The Java interceptor examples used `Map<String, ?>.getOrDefault(..., "unknown")`, which can fail to compile because of wildcard capture. Replaced it with an explicit `get` and null check.
- The Java audit JSON builders did not escape quoted strings or backslashes, which could produce invalid JSON for client IDs, topics, group IDs, or errors. Added minimal escaping helpers.
- The Java producer interceptor usage example omitted required key and value serializer configuration. Added `KEY_SERIALIZER_CLASS_CONFIG` and `VALUE_SERIALIZER_CLASS_CONFIG` using `StringSerializer`.
- The Python example used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with `datetime.now(timezone.utc)`.
- The Python example imported `wraps` but did not use it. Removed the unused import.
- The Filebeat example used the deprecated `log` input. Updated it to `filestream` with unique input IDs.
- The Filebeat example attempted to parse both the Kafka authorizer log and JSON audit log as JSON. Split them into separate inputs so only the custom JSON audit log uses the `ndjson` parser.

## Review Notes
The interceptor examples demonstrate application-side auditing, not a complete broker-side audit trail for every produce and consume operation. For regulated environments, these examples should be combined with broker authorization logs, immutable retention, and deployment-specific controls around who can disable or bypass client interceptors.
