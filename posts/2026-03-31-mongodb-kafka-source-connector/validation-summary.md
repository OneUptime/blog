# Validation Summary: How to Use the MongoDB Kafka Source Connector

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (change streams, replica sets)
- Apache Kafka (Kafka Connect, Kafka Consumer)
- MongoDB Kafka Source Connector (Confluent Hub)
- Python (kafka-python library)

## Sources Consulted
- MongoDB Kafka Connector Installation Docs: https://www.mongodb.com/docs/kafka-connector/current/introduction/install/
- Confluent Hub listing: https://www.confluent.io/hub/mongodb/kafka-connect-mongodb
- MongoDB Kafka Source Connector Startup Properties: https://www.mongodb.com/docs/kafka-connector/current/source-connector/configuration-properties/startup/
- MongoDB Kafka Connector JSON Formatters: https://www.mongodb.com/docs/kafka-connector/current/source-connector/fundamentals/json-formatters/
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- Kafka Connect REST API documentation: https://docs.confluent.io/platform/current/connect/references/restapi.html

## Issues Found
- **Incorrect Confluent Hub package name**: The install command used `mongodb/kafka-connector:latest` but the correct package name is `mongodb/kafka-connect-mongodb:latest`. Fixed the command to use the correct package name.

## Review Notes
- The post states MongoDB 4.0+ is required. Change streams were technically introduced in MongoDB 3.6, but 4.0 removed the requirement to explicitly enable majority read concern, making it a more practical minimum. The 4.0+ claim is acceptable.
- The `changeStreamPreAndPostImages` section correctly notes this feature is needed for pre-image support (`change.stream.full.document.before.change`), which requires MongoDB 6.0+. The post does not explicitly call out this version requirement, but the instructions are correct.
- All connector configuration properties (`connector.class`, `connection.uri`, `database`, `collection`, `topic.prefix`, `startup.mode`, `change.stream.full.document`, `output.format.value`, `output.json.formatter`) are valid and use correct values.
- The Python consumer code using kafka-python is syntactically correct and functional.
- The Kafka Connect REST API endpoints for deploying and monitoring connectors are correct.
