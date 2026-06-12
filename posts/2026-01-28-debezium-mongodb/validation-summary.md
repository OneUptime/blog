# Validation Summary: How to Implement Debezium for MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Debezium MongoDB connector (v2.5)
- MongoDB (replica sets, sharded clusters, change streams, pre-images)
- Apache Kafka / Kafka Connect (KRaft mode)
- Confluent cp-kafka 7.5.0
- Docker / Docker Compose
- Python `kafka-python` consumer
- Kafka Connect SMTs (`ExtractNewDocumentState`, `RegexRouter`, `ContentBasedRouter`)
- JMX monitoring

## Sources Consulted
- Debezium MongoDB connector reference (2.5): https://debezium.io/documentation/reference/2.5/connectors/mongodb.html
- Debezium monitoring reference: https://debezium.io/documentation/reference/stable/operations/monitoring.html
- Debezium 2.5 release notes: https://debezium.io/blog/2023/12/21/debezium-2-5-final-released/
- Debezium content-based routing SMT: https://debezium.io/documentation/reference/stable/transformations/content-based-routing.html
- MongoDB change streams reference: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB pre/post-images (6.0+): https://www.mongodb.com/docs/manual/reference/command/collMod/

## Issues Found
1. **Incorrect minimum MongoDB version** — The post claimed change streams require "MongoDB 4.0+" for Debezium. Debezium 2.5's documented minimum is **MongoDB 4.4+**, with 5.0+ recommended. Updated the prerequisite line to reflect Debezium 2.5's actual support.

2. **Mismatched section heading for pre-image capture mode** — The subsection was titled "Change Streams with Update Lookup" but the configuration shown was `change_streams_update_full_with_pre_image`. "Update lookup" refers to a different concept (it is what `change_streams_update_full` itself uses internally via `fullDocument: 'updateLookup'`). The description "For backward compatibility" was also inaccurate — pre-images are a forward-looking feature for capturing before-state. Renamed the heading to "Change Streams with Pre-Image" and corrected the description to "To capture both the document state before and after an update".

3. **Fabricated JMX metric name** — The monitoring section listed `NumberOfChangeEventsReceived`, which is not a real Debezium MBean attribute. Replaced it with `TotalNumberOfEventsSeen`, which is the actual streaming MBean attribute exposed by the Debezium MongoDB connector.

## Review Notes
- The Debezium image tag `debezium/connect:2.5`, the SMT class names (`io.debezium.connector.mongodb.transforms.ExtractNewDocumentState`, `io.debezium.transforms.ContentBasedRouter`, `org.apache.kafka.connect.transforms.RegexRouter`), the capture mode names, and the configuration properties (`mongodb.connection.string`, `mongodb.connection.mode`, `mongodb.authsource`, `mongodb.poll.interval.ms`, `cursor.max.await.time.ms`, `cursor.pipeline`, `cursor.pipeline.order`, `capture.mode`) all check out for Debezium 2.5.
- `mongodb.connection.mode` is valid in Debezium 2.5 but was removed/deprecated in 2.6+. Readers on newer versions should consult current docs.
- The MongoDB user roles example grants `readAnyDatabase` on admin in addition to the per-database `read` roles, which is broader than strictly required but functionally correct.
- The Python consumer example imports `from bson import ObjectId` and `import re` which are unused. Not a technical error, just dead imports — left untouched per "do not make stylistic changes".
- The KRaft Kafka configuration uses `CLUSTER_ID: MkU3OEVBNTcwNTJENDM2Qk` — this is a valid example UUID-style cluster ID used widely in Confluent docs.
- `change_streams_update_full_with_pre_image` correctly requires MongoDB 6.0+, and the `collMod`/`changeStreamPreAndPostImages` syntax shown is accurate.
