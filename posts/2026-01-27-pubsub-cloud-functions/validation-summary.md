# Validation Summary: How to Use Pub/Sub with Cloud Functions

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Pub/Sub
- Google Cloud Functions / Cloud Run functions, 2nd gen
- Eventarc Pub/Sub CloudEvents
- Node.js and `@google-cloud/functions-framework`
- Python and `functions-framework`
- Google Cloud CLI (`gcloud`)
- Jest and pytest

## Sources Consulted
- Google Cloud Functions / Cloud Run functions Pub/Sub CloudEvent sample: https://docs.cloud.google.com/functions/docs/samples/functions-cloudevent-pubsub
- Google Cloud CLI `gcloud functions deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Run functions retry configuration: https://docs.cloud.google.com/run/docs/tips/function-retries
- Google Cloud Pub/Sub dead-letter topics documentation: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub subscription properties and acknowledgment deadline documentation: https://docs.cloud.google.com/pubsub/docs/subscription-properties
- Google Cloud Run maximum instances configuration: https://docs.cloud.google.com/run/docs/configuring/max-instances
- Google Cloud Run minimum instances configuration: https://docs.cloud.google.com/run/docs/configuring/min-instances
- Google Cloud Run concurrency configuration: https://docs.cloud.google.com/run/docs/configuring/concurrency

## Issues Found
- Gen 2 Pub/Sub-triggered functions deployed with `gcloud functions deploy --gen2` do not retry failed invocations by default. Added `--retry` to deployment examples and updated retry wording to say retries are enabled/configurable.
- The post implied dead-letter routing was automatic for persistent Cloud Function failures. Updated the explanation to clarify that dead-letter behavior requires a dead-letter policy on the Pub/Sub subscription, or explicit publishing to a separate topic in application code.
- The delivery attempt comment implied Pub/Sub always includes retry counts for 2nd gen functions. Updated it to clarify that delivery attempts are available when the underlying subscription has a dead-letter policy.
- The scaling diagram used hard-coded min/max instance ranges that are quota- and service-dependent. Replaced them with less brittle wording.
- The Jest example imported a non-existent `handlers` module and tested function references that were not exported by the earlier snippet. Added CommonJS exports to the Node.js example and adjusted the Jest test to import from `index.js` and assert observable routing behavior.
- The error-handling Jest tests imported helper functions that were not exported. Added `module.exports` for `isTransientError` and `isPermanentError`.
- The timeout best practice said Pub/Sub acknowledgment deadline should exceed function timeout, which is not generally accurate for managed triggers and is constrained for manually managed subscriptions. Reworded it to distinguish managed function timeout from manually managed push subscription acknowledgment deadlines.

## Review Notes
The examples remain intentionally illustrative. Production deployments should also include `package.json` or `requirements.txt`, IAM setup, API enablement, and explicit dead-letter subscription configuration when relying on Pub/Sub-managed dead lettering.
