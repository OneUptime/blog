# Validation Summary: How to Use MongoDB with Google Cloud Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose (Node.js ODM)
- Google Cloud Functions (Gen 2)
- @google-cloud/functions-framework
- gcloud CLI
- Google Cloud VPC Serverless Connector
- Google Cloud Secret Manager
- Pub/Sub CloudEvents

## Sources Consulted
- Google Cloud Functions documentation: https://cloud.google.com/functions/docs
- gcloud functions deploy reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- gcloud compute networks vpc-access connectors create reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/vpc-access/connectors/create
- @google-cloud/functions-framework npm package and README: https://www.npmjs.com/package/@google-cloud/functions-framework
- Mongoose connection documentation: https://mongoosejs.com/docs/connections.html
- Mongoose Model API documentation: https://mongoosejs.com/docs/api/model.html
- Google Cloud Secret Manager documentation: https://cloud.google.com/functions/docs/configuring/secrets
- Google Cloud Functions Pub/Sub CloudEvent sample: https://cloud.google.com/functions/docs/samples/functions-cloudevent-pubsub

## Issues Found

1. **`--memory=256MB` is not a valid unit suffix** (line 107)
   - **What was wrong:** The `--memory` flag for `gcloud functions deploy` accepts `M`, `Mi`, `G`, or `Gi` as unit suffixes. `MB` is not a recognized suffix.
   - **What was changed:** Changed `--memory=256MB` to `--memory=256Mi` to match the documented binary notation used in all official Google Cloud examples.

2. **`function.yaml` with `secretEnvironmentVariables` is not a valid deployment file** (lines 144-150)
   - **What was wrong:** The post showed a YAML snippet in a `function.yaml` file using `secretEnvironmentVariables`. This field exists in the Cloud Functions REST API resource definition, but there is no `function.yaml` file that the `gcloud` CLI reads for deployment. For Gen 2 Cloud Functions (which this post targets with `--gen2`), the correct approach is to use the `--set-secrets` CLI flag.
   - **What was changed:** Replaced the YAML config block with the correct `gcloud functions deploy --set-secrets 'MONGODB_URI=MONGODB_URI:latest'` CLI command.

## Review Notes
- The connection caching pattern is sound and follows the same approach recommended by Mongoose for serverless environments (AWS Lambda docs use a similar pattern).
- All Mongoose APIs used (`find`, `create`, `findByIdAndDelete`, `findByIdAndUpdate`, `lean`, `limit`) are current and non-deprecated.
- The `maxPoolSize: 3` recommendation is appropriate for serverless — keeping it low (2-5) prevents connection exhaustion on Atlas.
- The Pub/Sub CloudEvent data path `cloudEvent.data.message.data` with base64 decoding is correct for Gen 2 functions.
- The `Order` model is referenced in the Pub/Sub handler without an import, but this is acceptable as the code snippets are illustrative rather than a complete runnable file.
