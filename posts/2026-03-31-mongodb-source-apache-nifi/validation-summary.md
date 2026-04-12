# Validation Summary: How to Set Up MongoDB as a Source in Apache NiFi

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache NiFi (1.23+ / 2.x)
- MongoDB (5.0+)
- GetMongo processor
- GetMongoRecord processor
- MongoDBControllerService
- Apache Kafka (PublishKafka processor)

## Sources Consulted
- Apache NiFi GetMongo processor docs: https://nifi.apache.org/components/org.apache.nifi.processors.mongodb.GetMongo/
- Apache NiFi GetMongo 1.23.2 docs: https://nifi.apache.org/docs/nifi-docs/components/org.apache.nifi/nifi-mongodb-nar/1.23.2/org.apache.nifi.processors.mongodb.GetMongo/index.html
- Apache NiFi MongoDBControllerService docs: https://nifi.apache.org/components/org.apache.nifi.mongodb.MongoDBControllerService/
- Apache NiFi GetMongoRecord docs: https://nifi.apache.org/components/org.apache.nifi.processors.mongodb.GetMongoRecord/
- NiFi 2.0.0 Migration Guide: https://cwiki.apache.org/confluence/display/NIFI/Migrating+Deprecated+Components+and+Features+for+2.0.0

## Issues Found

1. **Incorrect property name "MongoDB Service"**: Both GetMongo and GetMongoRecord use the property name "Client Service" (API name: `mongo-client-service`) to reference the MongoDBControllerService, not "MongoDB Service". Fixed in both processor configuration examples.

2. **Incorrect property names "Database Name" and "Collection Name"**: The actual NiFi property names are "Mongo Database Name" and "Mongo Collection Name". Fixed in both GetMongo and GetMongoRecord examples.

3. **Incorrect claim about JSON Type property controlling array output**: The post stated to "toggle the JSON Type property" to return an array, but JSON Type only controls Extended vs Standard JSON format. Array batching is controlled by the "Results Per FlowFile" property. Fixed the MongoDB-to-Kafka flow section to reference "Results Per FlowFile" instead.

4. **GetMongoRecord "Record Reader" property does not exist**: GetMongoRecord does not have a Record Reader property — it reads from MongoDB directly. It only has a Record Writer property. Removed "Record Reader: JsonTreeReader" from the GetMongoRecord example.

5. **Misleading FlowFile output description**: The original text said "emits each matching document as a FlowFile" and "one FlowFile per matching document" without clarifying that this is the default behavior and can be changed with Results Per FlowFile. Clarified the description to mention that grouping multiple documents into a single FlowFile is possible via the Results Per FlowFile property.

## Review Notes
- The MongoDBControllerService name is confirmed correct per official NiFi docs.
- The nifi-mongodb-bundle is included in standard NiFi distributions for both 1.x and 2.x.
- The incremental reads section describes a valid pattern using NiFi expression language and state management, though it is a manual approach rather than a built-in NiFi feature.
- The GetMongoRecord "Schema Name" property is confirmed valid with a default value of `${schema.name}`.
- The JSON Type property on GetMongo controls Extended JSON vs Standard JSON output — not array vs per-document output. This is a subtle but important distinction that was corrected.
