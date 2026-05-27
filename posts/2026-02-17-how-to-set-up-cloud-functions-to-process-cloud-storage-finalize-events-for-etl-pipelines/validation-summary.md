# Validation Summary: How to Set Up Cloud Functions to Process Cloud Storage Finalize Events

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run functions / Cloud Functions Gen 2
- Cloud Storage finalize events
- Eventarc retries
- Google Cloud CLI
- Node.js
- Functions Framework for Node.js
- Cloud Storage Node.js client
- BigQuery Node.js client
- csv-parse
- Node.js streams

## Sources Consulted
- Google Cloud Run functions Cloud Storage CloudEvent sample: https://cloud.google.com/functions/docs/samples/functions-cloudevent-storage
- Google Cloud CLI `gcloud functions deploy` reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Run functions retry behavior: https://cloud.google.com/functions/docs/bestpractices/retries
- Google Cloud Run functions runtime support schedule: https://cloud.google.com/functions/docs/runtime-support
- Google Cloud CLI `gcloud storage buckets create` reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- Google Cloud CLI `gcloud storage buckets update` reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/update
- Cloud Storage Object Lifecycle Management: https://cloud.google.com/storage/docs/lifecycle
- Cloud Storage lifecycle configuration examples: https://cloud.google.com/storage/docs/lifecycle-configurations
- Cloud Storage Node.js client library reference and metadata sample: https://cloud.google.com/nodejs/docs/reference/storage/latest
- BigQuery Node.js streaming insert sample: https://cloud.google.com/bigquery/docs/samples/bigquery-table-insert-rows
- Node.js stream Transform API documentation: https://nodejs.org/api/stream.html

## Issues Found
- The lifecycle update command referenced `lifecycle-30d.json` without showing the file contents. Added a valid lifecycle JSON document before the `gcloud storage buckets update` command.
- The deploy command used `nodejs20`, which is deprecated as of 2026-04-30 according to the current Google Cloud runtime support table. Updated it to `nodejs22`.
- The code comment said throwing a transient error would trigger retry, but the deploy command did not enable retries. Added `--retry` to the deployment command.
- The error handler moved files to the error bucket before rethrowing transient errors. Changed the order so transient errors are rethrown for retry before permanently failed files are moved to the error bucket.
- The Cloud Storage copy call wrapped custom metadata as `{ metadata: { metadata } }`, which would store a nested object under one metadata key instead of string custom metadata fields. Changed it to convert metadata entries to string custom metadata values.
- The streaming `Transform` example used `async transform` and `async flush` with callbacks, which can leave stream errors uncaught. Changed the snippet to call the stream callback with either success or the async error, and added a row index counter.

## Review Notes
- The JavaScript snippets passed a syntax check with Node.js v22.22.0.
- The local environment did not have `gcloud` installed, so CLI flags were verified against the official Google Cloud CLI reference instead of local `--help` output.
- With retries enabled, BigQuery streaming inserts can duplicate rows after partial success unless the pipeline uses idempotency controls such as insert IDs or downstream deduplication. The post is still technically valid, but production pipelines should account for at-least-once event delivery.
