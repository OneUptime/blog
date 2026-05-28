# Validation Summary: How to Build a Kappa Architecture for Real-Time Event Processing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Pub/Sub
- Google Cloud Dataflow
- Apache Beam Python SDK
- BigQuery
- Cloud Storage
- Kappa architecture
- Python

## Sources Consulted
- Google Cloud Pub/Sub replay and seek documentation: https://cloud.google.com/pubsub/docs/replay-overview
- Google Cloud Pub/Sub Cloud Storage subscription documentation: https://docs.cloud.google.com/pubsub/docs/create-cloudstorage-subscription
- Google Cloud Pub/Sub subscription overview: https://cloud.google.com/pubsub/docs/subscription-overview
- Google Cloud Dataflow pipeline options reference: https://cloud.google.com/dataflow/docs/reference/pipeline-options
- Google Cloud Dataflow Streaming Engine documentation: https://cloud.google.com/dataflow/docs/streaming-engine
- Google Cloud Dataflow streaming modes documentation: https://docs.cloud.google.com/dataflow/docs/guides/streaming-modes
- Apache Beam Python Pub/Sub I/O documentation: https://beam.apache.org/releases/pydoc/2.63.0/apache_beam.io.gcp.pubsub.html
- Apache Beam Python BigQuery I/O documentation: https://beam.apache.org/releases/pydoc/2.44.0/apache_beam.io.gcp.bigquery.html
- Apache Beam Python Text I/O documentation: https://beam.apache.org/releases/pydoc/2.38.0/apache_beam.io.textio.html
- BigQuery GoogleSQL DML MERGE documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax
- Python 3.12 datetime deprecation behavior verified locally with `python3`.

## Issues Found
- The post claimed that Pub/Sub "retains all events." Pub/Sub retention is configured and bounded, so this was changed to say Pub/Sub retains events for a configured retention window.
- The topic creation command did not actually configure topic retention despite the surrounding text saying it created a topic with a long retention period. Added `--message-retention-duration=7d`.
- The archive subscription used `--push-endpoint=https://storage.googleapis.com/...`, which is not a valid way to write Pub/Sub messages directly to Cloud Storage. Replaced it with a Cloud Storage export subscription using `--cloud-storage-bucket`, file prefix/suffix, and text output format.
- The Cloud Storage bucket was created after the archive subscription example, but Cloud Storage subscriptions require an existing bucket. Moved the bucket creation command before the archive subscription command.
- The Python sample used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with timezone-aware UTC timestamp generation.
- The Dataflow launch command used `--experiments=enable_streaming_engine`. Current Dataflow pipeline options expose this as `--enable_streaming_engine`, so the command was updated.
- The replay-from-archive example used a file pattern that did not match the corrected Cloud Storage export prefix. Updated the pattern to `gs://MY_PROJECT-event-archive/events/*.jsonl`.
- The Lambda comparison said streaming cannot provide exactly-once guarantees. Dataflow supports exactly-once streaming mode, so this was narrowed to sink-level consistency and reconciliation requirements that a particular streaming pipeline might not provide.

## Review Notes
The local environment did not have `gcloud` installed, so CLI flags were verified against official Google Cloud documentation rather than local `gcloud --help`. Apache Beam was not installed locally, so Beam APIs were checked against official Beam documentation and the Python syntax/deprecation issue was verified locally with Python 3.12.
