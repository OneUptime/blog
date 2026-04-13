# How to Set Up MongoDB as a Destination in Apache NiFi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, NiFi, ETL, Data Pipeline, Integration

Description: Learn how to configure Apache NiFi to write FlowFile data into MongoDB collections using the PutMongo and PutMongoRecord processors.

---

## Using MongoDB as a NiFi Destination

Writing data to MongoDB from NiFi is useful for ingesting processed events, syncing transformed records from other sources, or storing NiFi pipeline results. NiFi provides two processors for this: `PutMongo` for JSON FlowFiles and `PutMongoRecord` for schema-aware record streams.

## Prerequisites

- Apache NiFi 1.23+ with the `nifi-mongodb-bundle`
- A MongoDBControllerService configured and enabled
- MongoDB 5.0+ with write access from the NiFi host

## Configuring the MongoDBControllerService

```text
URI:       mongodb+srv://nifi-writer:password@cluster.mongodb.net/
Database:  myDatabase
```

## PutMongo Processor - Writing JSON FlowFiles

PutMongo accepts FlowFiles containing JSON documents and inserts or upserts them into MongoDB:

```text
MongoDB Service: (controller service)
Database Name:   myDatabase
Collection Name: events
Mode:            insert
```

**Mode options:**
- `insert` - always inserts (fails on duplicate `_id`)
- `update` - updates matching documents or ignores non-matching

For upsert behavior, set Mode to `update`, enable the `Upsert` property, and set the Update Query Key field to the field used for matching:

```text
Mode:             update
Upsert:           true
Update Query Key: eventId
```

NiFi constructs an update filter like `{ "eventId": <value from document> }` and upserts the document.

## PutMongoRecord Processor - Writing Records

For Record-based flows from sources like Kafka, Avro files, or CSV:

```text
MongoDB Service:  (controller service)
Database Name:    myDatabase
Collection Name:  processed_events
Record Reader:    JsonTreeReader
```

The processor converts each NiFi Record to a BSON document and writes it to MongoDB.

## A Complete Flow: Kafka to MongoDB

```text
[ConsumeKafka] --> [ConvertRecord] --> [PutMongoRecord]
```

1. ConsumeKafka reads messages from a Kafka topic
2. ConvertRecord transforms Avro to JSON
3. PutMongoRecord inserts into MongoDB

## Adding Timestamps on Ingest

Use `UpdateAttribute` before PutMongo to add an ingestion timestamp:

```text
Processor: UpdateAttribute
Attribute:  ingestedAt = ${now():toNumber()}
```

Then reference it in your document via Expression Language if needed.

## Handling Duplicate Documents

To prevent duplicate inserts, use update mode with upsert enabled and a natural key:

```text
Mode:             update
Upsert:           true
Update Query Key: sourceRecordId
```

This ensures each source record is written exactly once, making the pipeline idempotent.

## Batching Writes

NiFi sends one document per FlowFile by default. To improve throughput, merge FlowFiles into batches before writing:

```text
[ConsumeKafka] --> [MergeContent] --> [SplitJson] --> [PutMongo]
```

Or use `PutMongoRecord` which processes all records in a FlowFile as a batch insert.

## Error Handling

Connect the failure relationship to a retry queue or dead-letter file:

```text
[PutMongo] --success--> [LogAttribute]
            --failure-->  [PutFile] --> /var/nifi/failed-events/
```

Review failed FlowFiles to diagnose BSON validation errors, write conflicts, or network issues.

## Monitoring Write Throughput

Use NiFi's Component Metrics to track:
- FlowFiles processed per second
- Bytes written per second
- Queue depth on the input connection

For MongoDB-side monitoring, check the `opcounters.insert` metric in Atlas or via `mongostat`.

## Summary

PutMongo and PutMongoRecord give NiFi flexible options for writing to MongoDB. Use `insert` mode for append-only pipelines, `update` mode with `Upsert` enabled for idempotent pipelines, and PutMongoRecord for schema-aware record streams. Always connect the failure relationship to a reliable error handler to prevent data loss.
