# Validation Summary: Build a Streaming Data Pipeline from IoT Devices Through Pub/Sub to BigQuery

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Pub/Sub
- Google Cloud Dataflow
- Apache Beam Python SDK
- BigQuery
- Google Cloud CLI
- BigQuery CLI
- Streaming IoT telemetry pipelines

## Sources Consulted
- Google Cloud Pub/Sub pull subscription documentation: https://cloud.google.com/pubsub/docs/create-subscription
- Google Cloud Pub/Sub dead-letter topic documentation: https://cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Dataflow pipeline options documentation: https://cloud.google.com/dataflow/docs/reference/pipeline-options
- Google Cloud Dataflow Streaming Engine documentation: https://cloud.google.com/dataflow/docs/streaming-engine
- Google Cloud Dataflow Python pipeline documentation: https://cloud.google.com/dataflow/docs/guides/create-pipeline-python
- Apache Beam BigQuery I/O documentation: https://beam.apache.org/documentation/io/built-in/google-bigquery/
- BigQuery clustered table documentation: https://cloud.google.com/bigquery/docs/creating-clustered-tables
- BigQuery quotas and limits documentation: https://cloud.google.com/bigquery/quotas
- BigQuery table decorators documentation: https://cloud.google.com/bigquery/docs/table-decorators

## Issues Found
- The deployment command used `--experiments=enable_streaming_engine` and described it as the way to enable Streaming Engine. Current Dataflow documentation says Python 3 streaming pipelines enable Streaming Engine by default when supported, and Python SDK 2.45.0 or later cannot disable it for streaming pipelines. I removed the outdated experiment flag and updated the explanation.
- The scaling section claimed BigQuery streaming inserts handle up to 1 million rows per second per table. Current BigQuery quotas document legacy streaming insert limits in terms such as bytes per second per project and request limits, not a blanket per-table row rate. I changed the statement to refer to project-level throughput quotas.
- The scaling section recommended table decorators for time-bounded queries. BigQuery table decorators are documented for legacy SQL, while the post uses GoogleSQL and creates a time-partitioned table. I changed the recommendation to filtering on the partitioning column.
- The conclusion said anomaly detection catches bad readings before they pollute the data. The sample pipeline emits alerts for anomalies but still writes the readings to BigQuery. I changed the wording to say anomalies are flagged for follow-up.

## Review Notes
The sample uses Beam `WriteToBigQuery` with streaming inserts, which remains supported. For high-throughput production pipelines, the BigQuery Storage Write API may be worth considering, but that is an architectural enhancement rather than a correctness fix for this post.
