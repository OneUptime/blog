# Validation Summary: How to Build a Lambda Architecture on GCP Combining Batch and Streaming Layers

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Google Cloud Pub/Sub
- Cloud Storage
- Cloud Run functions / Functions Framework
- Apache Beam Python SDK
- Google Cloud Dataflow
- BigQuery
- Cloud Scheduler
- Python
- SQL

## Sources Consulted
- Google Cloud Pub/Sub Cloud Storage subscriptions documentation: https://docs.cloud.google.com/pubsub/docs/create-cloudstorage-subscription
- Google Cloud SDK reference for `gcloud pubsub subscriptions create`: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Apache Beam Python Pub/Sub I/O documentation: https://beam.apache.org/releases/pydoc/current/apache_beam.io.gcp.pubsub.html
- Apache Beam Python BigQuery I/O documentation: https://beam.apache.org/releases/pydoc/current/apache_beam.io.gcp.bigquery.html
- Apache Beam Programming Guide timestamp/windowing documentation: https://beam.apache.org/documentation/programming-guide/
- Google Cloud Dataflow Flex Template launch REST API documentation: https://docs.cloud.google.com/dataflow/docs/reference/rest/v1b3/projects.locations.flexTemplates/launch
- Google Cloud Scheduler HTTP target CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- BigQuery GoogleSQL date functions documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/date_functions

## Issues Found
- The Cloud Storage subscription archive command used a static `events/` prefix, while the batch pipeline read from `events/year=YYYY/month=MM/day=DD/...`. Updated the Cloud Function archive path, Cloud Storage subscription datetime format, and batch input pattern to use the same `events/YYYY/MM/DD/HH` layout.
- The Beam streaming example passed `event["timestamp"]` directly into `TimestampedValue`, which fails for common RFC3339 timestamp strings. Added timestamp parsing so numeric Unix timestamps and ISO/RFC3339-style strings are converted to Unix seconds before assigning Beam event time.
- The streaming metrics used min/max event timestamp fields as window boundaries. Updated the `DoFn` to use Beam's window parameter and write the actual fixed-window start and end timestamps.
- The batch aggregation wrote the current processing date instead of the `process_date` being processed. Updated the code to use the process date in the output rows.
- The batch pipeline comment said it replaced previous results, but the code used `WRITE_APPEND`. Corrected the comment to match the append behavior.
- The Cloud Scheduler example called the Dataflow classic template launch endpoint without a request body and did not match the custom Python pipeline shown in the article. Updated it to describe scheduling a packaged Dataflow Flex Template and added the required Flex Template launch URI, JSON body, content type header, OAuth service account, and OAuth scope.
- Replaced `datetime.utcnow()` usage with timezone-aware UTC timestamps in examples that create archive paths or metadata.

## Review Notes
The core architecture mapping is technically sound. The serving-layer query sums per-window distinct user counts for the speed layer, so `unique_users` is approximate for today's real-time view if a user appears in multiple windows; this is consistent with the article's description of the speed layer as approximate, but a production implementation should use a mergeable sketch such as HLL++ if accurate distinct counts across windows are required.
