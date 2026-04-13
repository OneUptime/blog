# Validation Summary: How to Use MongoDB Change Streams with Apache Kafka

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Change Streams, Replica Sets)
- Apache Kafka (Topics, Consumer Groups)
- Kafka Connect framework
- MongoDB Kafka Source Connector
- Python (kafka-python library)
- Node.js (MongoDB driver)

## Sources Consulted
- MongoDB Kafka Connector documentation: https://www.mongodb.com/docs/kafka-connector/current/source-connector/
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- Confluent Hub MongoDB Connector listing: https://www.confluent.io/hub/mongodb/kafka-connect-mongodb
- Kafka Connect REST API documentation: https://kafka.apache.org/documentation/#connect_rest
- KIP-875 (connector offsets API): https://cwiki.apache.org/confluence/display/KAFKA/KIP-875

## Issues Found

1. **Incorrect Confluent Hub package name**: The command `confluent-hub install mongodb/kafka-connector:latest` used the wrong package name. Fixed to `confluent-hub install mongodb/kafka-connect-mongodb:latest`, which is the correct Confluent Hub identifier for the MongoDB Kafka Connector.

2. **`publish.full.document.only` conflicts with consumer code**: The source connector config set `"publish.full.document.only": "true"`, which strips the Kafka message down to only the `fullDocument` portion of the change event. However, the Python consumer in Step 5 accesses `operationType`, `fullDocument`, and `documentKey` as top-level fields of the change event envelope. With `publish.full.document.only` enabled, those fields would not be present in the message. Removed the `publish.full.document.only` setting so the complete change stream event is published to Kafka, matching the consumer's expectations.

3. **Offsets endpoint version note**: The `GET /connectors/{name}/offsets` REST API endpoint was introduced in Apache Kafka 3.5 via KIP-875, but the post lists Kafka 2.6+ in prerequisites. Added a comment noting the version requirement for that specific endpoint.

## Review Notes
- The post correctly notes that Change Streams require a replica set. MongoDB 3.6 introduced collection-level change streams, and 4.0 extended them to database and cluster level. The prerequisite of "MongoDB 4.0+" is reasonable for the scope of this tutorial.
- The MongoDB Kafka Connector version 1.11.0 used in the download URL is a valid release, though newer versions may be available. Readers should check for the latest version.
- The Python consumer code assumes the `kafka-python` package is installed (`pip install kafka-python`). This dependency is not explicitly mentioned but is implied by the import.
