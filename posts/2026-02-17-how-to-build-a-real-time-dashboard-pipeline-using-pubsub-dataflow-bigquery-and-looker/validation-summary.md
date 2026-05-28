# Validation Summary: How to Build a Real-Time Dashboard Pipeline Using Pub/Sub Dataflow BigQuery

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Pub/Sub
- Google Cloud Dataflow
- Apache Beam Python SDK
- BigQuery
- BigQuery materialized views
- BigQuery BI Engine
- Looker LookML
- Looker API / Python SDK
- Python
- Google Cloud CLI and bq CLI

## Sources Consulted
- Google Cloud CLI reference: gcloud Pub/Sub topic creation: https://cloud.google.com/sdk/gcloud/reference/pubsub/topics/create
- Google Cloud CLI reference: gcloud Pub/Sub subscription creation: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Pub/Sub dead-letter topics documentation: https://cloud.google.com/pubsub/docs/dead-letter-topics
- Apache Beam Pub/Sub I/O Python documentation: https://beam.apache.org/releases/pydoc/current/apache_beam.io.gcp.pubsub.html
- Apache Beam BigQuery I/O documentation: https://beam.apache.org/documentation/io/built-in/google-bigquery/
- Dataflow Streaming Engine documentation: https://cloud.google.com/dataflow/docs/streaming-engine
- BigQuery materialized view documentation: https://cloud.google.com/bigquery/docs/materialized-views-create
- BigQuery BI Engine reservation documentation: https://cloud.google.com/bigquery/docs/bi-engine-reserve-capacity
- BigQuery BI Engine preferred tables documentation: https://cloud.google.com/bigquery/docs/bi-engine-intro
- Looker LookML dimension_group documentation: https://cloud.google.com/looker/docs/reference/param-field-dimension-group
- Looker LookML datagroup documentation: https://cloud.google.com/looker/docs/reference/param-model-datagroup
- Looker API create dashboard documentation: https://cloud.google.com/looker/docs/reference/looker-api/latest/methods/Dashboard/create_dashboard
- Looker API create dashboard element documentation: https://cloud.google.com/looker/docs/reference/looker-api/latest/methods/Dashboard/create_dashboard_element
- Looker API create alert documentation: https://cloud.google.com/looker/docs/reference/looker-api/latest/methods/Alert/create_alert

## Issues Found
- The Pub/Sub dead-letter topic was created after the subscription and was not attached to the subscription. Updated the commands to create the dead-letter topic first and pass `--dead-letter-topic` plus `--max-delivery-attempts` when creating the subscription.
- The Python examples used `datetime.utcnow()`, which is deprecated in current Python. Replaced it with timezone-aware UTC timestamp generation using `datetime.now(timezone.utc)`.
- The BigQuery materialized view used `CURRENT_TIMESTAMP()` in the `WHERE` clause. BigQuery materialized views do not support non-deterministic functions, so the rolling 24-hour filter was removed from the materialized view definition.
- The BI Engine CLI example used invalid `bq mk --bi_reservation`, `--reservation_size`, and `--preferred_table` flags. Replaced it with the documented `bq update --reservation --bi_reservation_size` command and an `ALTER BI_CAPACITY ... SET OPTIONS` example for preferred tables.
- The Looker dashboard creation example omitted the required `space_id`. Added `space_id="1"` as a placeholder existing space ID.
- The Looker alert example used lowercase enum values, a five-minute cron interval, and did not associate the alert with a dashboard element. Updated enum values to the documented uppercase values, changed the cron to a supported 20-minute interval, stored the dashboard element response, and passed `dashboard_element_id`.

## Review Notes
- Python code blocks were syntax-checked with `ast.parse`.
- The local workspace does not have `gcloud` or `bq` installed, so CLI command validation was performed against official Google Cloud documentation rather than local `--help` output.
- The Beam aggregation example remains a simplified tutorial pipeline. For production-grade unique-user metrics across early trigger panes, teams should consider exact deduplication/upsert logic or approximate distinct sketches rather than summing per-pane distinct counts.
