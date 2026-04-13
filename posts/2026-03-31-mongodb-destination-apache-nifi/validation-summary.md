# Validation Summary: How to Set Up MongoDB as a Destination in Apache NiFi

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache NiFi (1.23+)
- MongoDB (5.0+)
- PutMongo and PutMongoRecord NiFi processors
- MongoDBControllerService (NiFi controller service)
- Apache Kafka (as an example data source)
- NiFi Expression Language

## Sources Consulted
- Apache NiFi PutMongo processor documentation: https://nifi.apache.org/docs/nifi-docs/components/org.apache.nifi/nifi-mongodb-nar/latest/org.apache.nifi.processors.mongodb.PutMongo/
- Apache NiFi PutMongoRecord processor documentation: https://nifi.apache.org/docs/nifi-docs/components/org.apache.nifi/nifi-mongodb-nar/latest/org.apache.nifi.processors.mongodb.PutMongoRecord/
- Apache NiFi ConsumeKafka / GetKafka deprecation notes
- MongoDB server status opcounters documentation: https://www.mongodb.com/docs/manual/reference/command/serverStatus/#opcounters

## Issues Found

1. **PutMongo Mode options incorrectly listed "upsert" as a Mode value**: The post listed three Mode options: `insert`, `update`, and `upsert`. In reality, PutMongo's Mode property only accepts `insert` or `update`. Upsert behavior is achieved by setting Mode to `update` and enabling the separate boolean `Upsert` property. Fixed all upsert configuration examples and the summary to show `Mode: update` with `Upsert: true`.

2. **Deprecated `GetKafka` processor used in batching example**: The batching section used `GetKafka`, which was deprecated in favor of `ConsumeKafka`. The earlier Kafka-to-MongoDB flow example correctly used `ConsumeKafka`, making this inconsistent. Changed `GetKafka` to `ConsumeKafka`.

3. **Inaccurate PutMongoRecord batching description**: The post claimed PutMongoRecord handles batching "through the record writer's batch size setting." There is no such setting on the record writer that controls MongoDB write batching. PutMongoRecord processes all records in a FlowFile as a batch insert. Fixed the description accordingly.

## Review Notes
- The controller service is referred to as "MongoDBControllerService" in the prerequisites. The actual NiFi implementation class is `MongoDBControllerClientService`, but the informal name is acceptable for a tutorial context since users select it from a dropdown in the NiFi UI.
- The PutMongo property shown as "MongoDB Service" is actually called "Client Service" in NiFi. The post uses conceptual property names throughout rather than exact UI labels, which is a reasonable stylistic choice for readability but could cause minor confusion for users looking at the actual NiFi configuration UI.
- The `UpdateAttribute` example adds an attribute `ingestedAt` but does not show how to embed it into the FlowFile JSON content before PutMongo writes it. UpdateAttribute modifies FlowFile attributes, not FlowFile content, so the attribute would not automatically appear in the MongoDB document unless additional processing (e.g., ReplaceText or an EL-aware content transformation) is used.
