# Validation Summary: How to Build a Pub/Sub Push Subscription Handler in an Express.js Application

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Pub/Sub
- Pub/Sub push subscriptions
- Cloud Run
- Express.js
- Node.js
- google-auth-library
- gcloud CLI

## Sources Consulted
- Google Cloud Pub/Sub push subscriptions documentation: https://docs.cloud.google.com/pubsub/docs/push
- Google Cloud Pub/Sub authenticated push subscriptions documentation: https://docs.cloud.google.com/pubsub/docs/authenticate-push-subscriptions
- Google Cloud Pub/Sub dead-letter topics documentation: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud SDK reference for `gcloud pubsub subscriptions create`: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Google Cloud SDK reference for `gcloud pubsub subscriptions update`: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/update
- Google Cloud SDK reference for `gcloud run services update`: https://docs.cloud.google.com/sdk/gcloud/reference/run/services/update
- Google Cloud SDK reference for `gcloud run services add-iam-policy-binding`: https://cloud.google.com/sdk/gcloud/reference/run/services/add-iam-policy-binding
- Google Cloud SDK reference for `gcloud pubsub subscriptions add-iam-policy-binding`: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/add-iam-policy-binding
- Express 4.x API reference for `express.json()`: https://expressjs.com/en/4x/api.html
- Google Auth Library for Node.js API reference for `OAuth2Client.verifyIdToken`: https://cloud.google.com/nodejs/docs/reference/google-auth-library/latest/google-auth-library/oauth2client

## Issues Found
- The basic handler returned `400` for malformed Pub/Sub envelopes while the comment said this would tell Pub/Sub not to retry. Pub/Sub treats any status code outside `102`, `200`, `201`, `202`, and `204` as a negative acknowledgment, so this was changed to return `200` when intentionally dropping invalid messages.
- The authentication middleware accepted any Google service account email ending in `.iam.gserviceaccount.com`. Official guidance says to verify the email claim against the service account configured on the push subscription and confirm `email_verified`, so the code now checks `process.env.PUBSUB_PUSH_SERVICE_ACCOUNT` and `payload.email_verified === true`.
- The authenticated push subscription commands omitted the IAM binding that lets Pub/Sub's service agent mint OIDC tokens for the configured service account. Added the `roles/iam.serviceAccountTokenCreator` binding.
- The Cloud Run deployment used `--no-allow-unauthenticated` but did not grant the push service account `roles/run.invoker` on the service. Added the required Cloud Run IAM binding.
- The deployment flow did not set the `SERVICE_URL` and `PUBSUB_PUSH_SERVICE_ACCOUNT` environment variables required by the authentication middleware, and the final subscription update did not update the OIDC audience to match the deployed service URL. Added a `gcloud run services update` command and updated the subscription audience.
- The dead-letter topic setup omitted the required IAM roles for Pub/Sub's service agent to publish to the dead-letter topic and acknowledge forwarded messages on the source subscription. Added the `roles/pubsub.publisher` and `roles/pubsub.subscriber` bindings.

## Review Notes
The sample business handlers such as `handleOrderCreated`, `sendShippingNotification`, and `sendAlert` are placeholders and would need application-specific implementations. Local `gcloud --help` validation was not possible because the Google Cloud CLI is not installed in this workspace, so CLI checks were performed against official Google Cloud SDK reference documentation.
