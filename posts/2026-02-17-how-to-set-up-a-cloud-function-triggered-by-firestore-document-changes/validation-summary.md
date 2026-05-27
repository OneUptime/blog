# Validation Summary: How to Set Up a Cloud Function Triggered by Firestore Document Changes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Functions / Cloud Run functions Gen 2
- Firestore in Native mode
- Eventarc Firestore triggers
- Google Cloud CLI
- Node.js
- @google-cloud/functions-framework
- @google-cloud/firestore
- protobufjs

## Sources Consulted
- Google Cloud: Trigger functions with Firestore documents: https://cloud.google.com/functions/docs/calling/cloud-firestore
- Google Cloud: Create triggers from Firestore events: https://docs.cloud.google.com/run/docs/triggering/firestore-triggers
- Google Cloud SDK: gcloud functions deploy reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud SDK: gcloud firestore databases create reference: https://cloud.google.com/sdk/gcloud/reference/firestore/databases/create
- Google Cloud: Deploy a Cloud Run function prerequisites: https://cloud.google.com/run/docs/deploy-functions
- Google Cloud Node.js Firestore FieldValue reference: https://cloud.google.com/nodejs/docs/reference/firestore/latest/firestore/fieldvalue
- Eventarc CloudEvents JSON/event format reference: https://cloud.google.com/eventarc/docs/cloudevents-json

## Issues Found
- The original Node.js examples treated `cloudEvent.data` as an already-decoded JavaScript object. Google Cloud's current Firestore trigger samples decode `cloudEvent.data` from the `google.events.cloud.firestore.v1.DocumentEventData` protobuf in Node.js. I added a `protobufjs` decoder helper, added the `protobufjs` dependency, and noted that the Firestore `data.proto` file must be included with the function source.
- The original document path conversion used `cloudEvent.subject.replace('/documents/', '')`, which can produce an invalid Firestore client path for full Firestore resource names. I changed the examples to read the decoded document resource name and use `split('/documents/')[1]`, matching Google Cloud's documented samples.
- The API prerequisite list omitted Cloud Build, Artifact Registry, and Cloud Logging APIs, which are part of the current Cloud Run functions source deployment prerequisites. I added those APIs to the setup commands.
- The Firestore value parser claimed to handle Firestore field value types but omitted bytes, reference, and geo point values, and it parsed all integers as JavaScript numbers. I added those missing value cases and preserve large integers as `BigInt` when they exceed JavaScript's safe integer range.

## Review Notes
The post still uses `gcloud functions deploy --gen2`, which is supported for compatibility and documented in the gcloud reference. Current Google Cloud docs increasingly present these as Cloud Run functions and often show `gcloud run deploy --function` followed by an explicit Eventarc trigger.
