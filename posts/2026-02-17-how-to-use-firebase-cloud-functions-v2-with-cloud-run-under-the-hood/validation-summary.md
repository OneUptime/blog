# Validation Summary: How to Use Firebase Cloud Functions v2 with Cloud Run Under the Hood

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Firebase Cloud Functions for Firebase v1 and v2
- Cloud Run
- Eventarc
- Firebase Admin SDK
- Cloud Firestore triggers
- Pub/Sub triggers
- Scheduled functions
- Firebase CLI
- Google Cloud CLI
- TypeScript / Node.js

## Sources Consulted
- Firebase Cloud Functions version comparison: https://firebase.google.com/docs/functions/version-comparison
- Firebase Cloud Functions quotas and limits: https://firebase.google.com/docs/functions/quotas
- Firebase Cloud Functions manage functions guide: https://firebase.google.com/docs/functions/manage-functions
- Firebase Cloud Functions locations: https://firebase.google.com/docs/functions/locations
- Firebase Cloud Functions Pub/Sub triggers: https://firebase.google.com/docs/functions/pubsub-events
- Firebase Functions v2 HTTPS options reference: https://firebase.google.com/docs/reference/functions/2nd-gen/node/firebase-functions.https.httpsoptions
- Cloud Run services logs read CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/services/logs/read
- Cloud Run memory limits: https://cloud.google.com/run/docs/configuring/services/memory-limits
- Cloud Run CPU limits: https://cloud.google.com/run/docs/configuring/services/cpu
- Cloud Run pricing: https://cloud.google.com/run/pricing

## Issues Found
- The comparison table said v2 supports all Cloud Run regions. Firebase Cloud Functions v2 uses the Cloud Functions supported-region list, which includes more 2nd-gen-only regions but is not simply "all Cloud Run regions." Updated the table wording.
- The pricing row said v2 uses Cloud Run pricing. This is broadly correct, but Firebase docs route Cloud Functions for Firebase pricing through Firebase pricing and Cloud Run-based billing details. Updated the wording to "Based on Cloud Run pricing."
- The Pub/Sub JSON example manually decoded `message.data` without handling the Firebase SDK's `message.json` helper or missing data. Updated it to use `message.json` first and safely fall back to base64 decoding.
- The min-instance example said the first 80 concurrent users would never have a cold start. That was too absolute because warm instances can be replaced and traffic above the minimum can still cold start. Reworded it to describe the expected behavior while the minimum instance remains warm.
- The min-instance monthly cost estimate was too high and too specific for the documented Firebase examples. Replaced it with Firebase's documented estimates for a 256 MiB minimum instance and noted that the Firebase CLI provides deployment-time estimates.
- The timeout section implied all v2 functions can run for 60 minutes. Firebase documents 60 minutes for HTTP/callable functions, 30 minutes for scheduled/task queue functions, and 9 minutes for other event-driven functions. Updated the wording.
- The direct Cloud Run update section did not mention that Firebase deployments can overwrite external changes. Added the documented `preserveExternalChanges: true` caveat.
- The CPU/memory best practice said Cloud Run allocates CPU proportional to memory. Firebase v2 has memory-based CPU defaults, but CPU can also be set explicitly subject to Cloud Run CPU/memory combinations. Updated the guidance.

## Review Notes
The remaining examples use current Firebase Functions v2 import paths and runtime options. The post intentionally keeps examples concise, so production concerns like request validation, authentication, and Firestore transaction contention are outside the scope of this validation.
