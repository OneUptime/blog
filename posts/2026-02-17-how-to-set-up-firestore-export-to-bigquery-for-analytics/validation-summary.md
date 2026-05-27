# Validation Summary: How to Set Up Firestore Export to BigQuery for Analytics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Firestore
- Firebase Extensions
- Stream Firestore to BigQuery extension
- BigQuery
- Cloud Storage
- Cloud Scheduler
- Cloud Functions for Firebase
- Looker Studio
- JavaScript / Node.js
- SQL

## Sources Consulted
- Firebase Extensions Hub: Stream Firestore to BigQuery: https://extensions.dev/extensions/firebase/firestore-bigquery-export
- Firebase extension source configuration: https://raw.githubusercontent.com/firebase/extensions/master/firestore-bigquery-export/extension.yaml
- Firebase extension import script guide: https://github.com/firebase/extensions/blob/master/firestore-bigquery-export/guides/IMPORT_EXISTING_DOCUMENTS.md
- Firebase Firestore export/import documentation: https://firebase.google.com/docs/firestore/manage-data/export-import
- Google Cloud SDK `gcloud firestore export` reference: https://cloud.google.com/sdk/gcloud/reference/firestore/export
- BigQuery loading data from Firestore exports: https://docs.cloud.google.com/bigquery/docs/loading-data-cloud-firestore
- Cloud Functions for Firebase scheduled functions: https://firebase.google.com/docs/functions/schedule-functions
- BigQuery materialized views documentation: https://cloud.google.com/bigquery/docs/materialized-views-intro
- Firestore aggregation query documentation: https://firebase.google.com/docs/firestore/query-data/aggregation-queries

## Issues Found
- The introduction said Firestore cannot run aggregation queries. Firestore now supports read-time `count()`, `sum()`, and `average()` aggregations, so the wording was changed to distinguish those supported aggregations from analytics-style joins and reporting.
- The Firebase extension table configuration was described as a final BigQuery table name. The extension uses the Table ID as a prefix and creates resources such as `{TABLE_ID}_raw_changelog` and `{TABLE_ID}_raw_latest`, so the setup text and SQL examples were updated.
- The batch export section implied any Firestore export can be loaded into BigQuery. Official documentation says BigQuery loading requires a `collection-ids` filtered export, so the wording was corrected.
- The scheduled Cloud Function example used older scheduled-functions syntax and an invalid `Firestore.v1.FirestoreAdminClient()` reference after destructuring `Firestore`. The example now uses the current `firebase-functions/v2/scheduler` import and constructs the Firestore Admin client from `require('@google-cloud/firestore').v1`.
- The query examples referenced a non-existent `orders_raw` table and counted update history as if it were current state. They now use `orders_raw_latest` for current-state analytics and `orders_raw_changelog` for activity-history analytics.
- The materialized view example could duplicate updated documents and used `TIMESTAMP()` incorrectly for Firestore epoch seconds. It now deduplicates by latest event, excludes deletes, uses BigQuery materialized view options for a non-incremental definition, and converts Firestore seconds with `TIMESTAMP_SECONDS(CAST(... AS INT64))`.
- The backfill section said imported documents are written as `CREATE` events. The official import script writes them with the `IMPORT` operation, so the text was corrected.

## Review Notes
- The streaming extension only listens to the configured collection path, not arbitrary subcollections unless wildcard paths or additional extension instances are configured.
- For production analytics, generated schema views or scheduled transformation tables may be preferable to hand-written JSON extraction in every dashboard query.
