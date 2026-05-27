# Validation Summary: How to Use Change Streams in Cloud Bigtable to Capture Data Changes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Bigtable
- Bigtable change streams
- Dataflow
- Apache Beam Java SDK
- Pub/Sub
- Google Cloud CLI
- Python helper snippets
- Cloud Monitoring

## Sources Consulted
- Cloud Bigtable change streams overview: https://docs.cloud.google.com/bigtable/docs/change-streams-overview
- Configure Cloud Bigtable change streams: https://docs.cloud.google.com/bigtable/docs/change-streams-configure
- Stream changes with Dataflow: https://docs.cloud.google.com/bigtable/docs/change-streams-use-dataflow
- Bigtable change streams to Pub/Sub Dataflow template: https://docs.cloud.google.com/dataflow/docs/guides/templates/provided/cloud-bigtable-change-streams-to-pubsub
- Google Cloud SDK `gcloud bigtable tables create`: https://docs.cloud.google.com/sdk/gcloud/reference/bigtable/tables/create
- Google Cloud SDK `gcloud bigtable tables update`: https://docs.cloud.google.com/sdk/gcloud/reference/bigtable/tables/update
- Apache Beam Java `BigtableIO.ReadChangeStream`: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/io/gcp/bigtable/BigtableIO.ReadChangeStream.html
- Apache Beam Python I/O package docs: https://beam.apache.org/releases/pydoc/current/apache_beam.io.html
- Cloud Bigtable Java client model docs: https://docs.cloud.google.com/java/docs/reference/google-cloud-bigtable/latest/com.google.cloud.bigtable.data.v2.models

## Issues Found
- The post claimed the stream gives "exactly" what changed. I softened this because official docs note that the Beam connector can produce duplicates, and change records include new values rather than old values.
- The post omitted garbage collection changes and described delete row as a direct record type. I added garbage collection changes and changed the record type wording to delete family, matching Bigtable's documented change stream record entries.
- The consumption section used a non-existent Python `ReadFromBigtableChangeStream` API. I replaced it with the official Google-provided Dataflow template command for Bigtable change streams to Pub/Sub.
- The filtering example was written against the same non-existent Python record API. I replaced it with a Java Beam `DoFn` example using `KV<ByteString, ChangeStreamMutation>` and documented entry types.
- The ordering section overstated row-level ordering. I clarified that ordering is per row key and cluster, with no guarantee across row keys or clusters.
- The monitoring metrics listed inaccurate metric names for this use case. I replaced them with the current documented Dataflow and Bigtable change stream monitoring signals.
- The restart/resume section implied no missed changes and did not mention duplicates. I updated it to describe metadata-table state, duplicate records, idempotent processing, and the retention-boundary failure behavior.
- The custom checkpoint helper used a single token and omitted the `datetime` import. I changed it to store serialized continuation tokens per partition and added the missing import.
- The cost section referred to read capacity. I changed this to Bigtable cluster CPU, which is how the official docs describe change stream compute impact.

## Review Notes
The Google-provided Dataflow template is the safest path for the Pub/Sub use case shown in the post. For custom transformations, the current official connector path is Java Beam with Dataflow Runner v2 and a single-cluster app profile; downstream consumers should be idempotent because duplicate change records are possible.
