# Validation Summary: How to Build a Real-Time Fraud Detection Pipeline Using Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Pub/Sub
- Google Cloud Dataflow
- Apache Beam Python SDK
- BigQuery
- Cloud Functions / Cloud Run functions
- Python
- Google Cloud CLI
- BigQuery CLI

## Sources Consulted
- Apache Beam Programming Guide: https://beam.apache.org/documentation/programming-guide/
- Apache Beam Python Pub/Sub I/O documentation: https://beam.apache.org/releases/pydoc/current/apache_beam.io.gcp.pubsub.html
- Apache Beam Python BigQuery I/O documentation: https://beam.apache.org/releases/pydoc/current/apache_beam.io.gcp.bigquery.html
- Apache Beam Python trigger documentation: https://beam.apache.org/releases/pydoc/current/apache_beam.transforms.trigger.html
- Google Cloud Dataflow pipeline options: https://cloud.google.com/dataflow/docs/reference/pipeline-options
- Google Cloud SDK `gcloud pubsub topics create`: https://cloud.google.com/sdk/gcloud/reference/pubsub/topics/create
- Google Cloud SDK `gcloud pubsub subscriptions create`: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- BigQuery `bq` CLI reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- Cloud Functions Pub/Sub-triggered function sample: https://cloud.google.com/functions/docs/samples/functions-helloworld-pubsub

## Issues Found
- The Beam code defined `EnrichWithUserHistory` but never applied it, so the scoring rules that depend on user history used default values and the suspicious test transaction would not be flagged for the reasons described. Added a self-contained sample user-profile side input and wired `EnrichWithUserHistory` into the pipeline before velocity calculation.
- The code comment said invalid messages were routed to a dead letter destination, but the code only emitted a tagged side output and did not write it to a Pub/Sub dead-letter topic. Updated the comment to accurately describe a side output.
- The guide claimed suspicious activity would be flagged "within seconds", but the provided Beam pipeline uses sliding windows and default window emission behavior. Adjusted the wording to say results are flagged as streaming windows emit.
- Removed unused Python imports from the main Beam example.

## Review Notes
- The `gcloud` and `bq` CLIs were not installed in the local workspace, so command verification was performed against official Google Cloud documentation.
- Python code blocks were syntax-checked with `ast.parse`.
- The Cloud Function example matches the documented first-generation Pub/Sub function event shape. New deployments may prefer the current Cloud Run functions CloudEvents style.
