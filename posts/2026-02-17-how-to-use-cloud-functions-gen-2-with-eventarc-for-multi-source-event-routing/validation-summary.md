# Validation Summary: How to Use Cloud Functions Gen 2 with Eventarc for Multi-Source Event Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Functions / Cloud Run functions
- Eventarc Standard
- CloudEvents
- Cloud Storage events
- Firestore events
- Cloud Audit Logs events
- Google Cloud CLI
- Node.js Functions Framework
- Eventarc Publishing API

## Sources Consulted
- Google Cloud SDK reference for `gcloud functions deploy`: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud SDK reference for `gcloud eventarc triggers create`: https://docs.cloud.google.com/sdk/gcloud/reference/eventarc/triggers/create
- Eventarc trigger documentation for Cloud Run functions: https://docs.cloud.google.com/eventarc/standard/docs/functions/create-triggers
- Eventarc Cloud Storage trigger documentation: https://docs.cloud.google.com/eventarc/standard/docs/run/route-trigger-cloud-storage
- Eventarc Firestore trigger documentation: https://docs.cloud.google.com/eventarc/standard/docs/run/route-trigger-cloud-firestore
- Firestore event trigger examples for Cloud Run functions: https://cloud.google.com/firestore/native/docs/extend-with-functions-2nd-gen
- Eventarc event format documentation: https://docs.cloud.google.com/eventarc/standard/docs/event-format
- Eventarc Publishing Node.js client reference: https://docs.cloud.google.com/nodejs/docs/reference/eventarc-publishing/latest/eventarc-publishing/v1.publisherclient
- Cloud Run functions runtime support schedule: https://docs.cloud.google.com/functions/docs/runtime-support

## Issues Found
- Node.js 18 was decommissioned for Cloud Run functions on 2025-10-30. Updated the prerequisite and deployment command to Node.js 22.
- The Eventarc Publishing API was used later in the post but was not enabled in the API setup command. Added `eventarcpublishing.googleapis.com`.
- Firestore direct Eventarc events are delivered with protobuf payloads. Updated the sample handler to decode Firestore event data with `protobufjs`, noted the required `data.proto`, and added `--event-data-content-type "application/protobuf"` to Firestore trigger examples.
- The BigQuery audit log trigger was described as a job completion trigger, but the shown method filter is for job insertion. Updated the comment to say job insertion audit logs.
- The Eventarc Publishing Node.js client was imported with a non-existent `EventarcPublisherClient` name. Updated it to use `PublisherClient` from `require("@google-cloud/eventarc-publishing").v1`.
- The custom event publishing sample mixed protobuf `Any` and CloudEvents fields incorrectly. Updated it to publish a CloudEvents JSON string through `textEvents`.
- The storage filtering example used `--event-filters-path-pattern` on a Cloud Storage object name, but Cloud Storage Eventarc triggers document exact-match filtering and do not support wildcards or regular expressions for that use case. Replaced it with a Firestore path-pattern example.

## Review Notes
`gcloud` is not installed in the local workspace, so command verification was performed against official Google Cloud CLI and product documentation rather than local `--help` output.
