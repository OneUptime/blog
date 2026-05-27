# Validation Summary: How to Read from Pub/Sub and Write to BigQuery in a Streaming Dataflow Pipeline

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Dataflow
- Apache Beam Java SDK
- Google Cloud Pub/Sub
- BigQuery
- BigQuery Storage Write API
- Maven
- Gson

## Sources Consulted
- Apache Beam BigQuery I/O connector documentation: https://beam.apache.org/documentation/io/built-in/google-bigquery/
- Apache Beam 2.73.0 BigQueryIO.Write Javadocs: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/io/gcp/bigquery/BigQueryIO.Write.html
- Apache Beam PubsubIO Javadocs: https://beam.apache.org/releases/javadoc/2.20.0/org/apache/beam/sdk/io/gcp/pubsub/PubsubIO.html
- Apache Beam BigQueryStorageApiInsertError Javadocs: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/io/gcp/bigquery/BigQueryStorageApiInsertError.html
- Google Cloud BigQuery legacy streaming API documentation: https://docs.cloud.google.com/bigquery/docs/streaming-data-into-bigquery
- Google Cloud Dataflow pipeline options reference: https://docs.cloud.google.com/dataflow/docs/reference/pipeline-options
- Maven Central Gson artifact page: https://central.sonatype.com/artifact/com.google.code.gson/gson

## Issues Found
- The Maven dependency block used Apache Beam 2.52.0, but the post's Storage Write API examples use current BigQueryIO behavior such as `withTriggeringFrequency` with `STORAGE_WRITE_API`. Updated the Beam dependencies to 2.73.0 so the examples align with the current Beam documentation.
- The Maven dependency block did not include Gson even though the Java examples use `JsonParser` and `JsonObject`. Added the direct `com.google.code.gson:gson:2.14.0` dependency.
- The Pub/Sub attributes example used `PubsubIO.readMessages()`, but Beam documents that this method returns messages with payload only and no attributes. Changed it to `PubsubIO.readMessagesWithAttributes()`.

## Review Notes
- The post's examples are snippets and omit imports, package declarations, logger setup, and the surrounding Maven build plugin configuration. The APIs and commands shown are otherwise technically valid for the stated tutorial scope.
- BigQuery `tabledata.insertAll` streaming inserts remain supported, but Google recommends the BigQuery Storage Write API for new projects because it has lower pricing and stronger delivery features.
