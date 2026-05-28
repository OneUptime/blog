# Validation Summary: How to Build a Go Pub/Sub Subscriber Service on Cloud Run with Push

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Pub/Sub
- Pub/Sub push subscriptions
- Cloud Run
- Google Cloud CLI
- Go
- Google ID token verification
- JWT claims
- IAM service accounts and roles

## Sources Consulted
- Google Cloud Pub/Sub push subscriptions: https://docs.cloud.google.com/pubsub/docs/push
- Google Cloud Pub/Sub authenticated push subscriptions: https://docs.cloud.google.com/pubsub/docs/authenticate-push-subscriptions
- Google Cloud Pub/Sub create push subscriptions: https://docs.cloud.google.com/pubsub/docs/create-push-subscription
- Google Cloud SDK `gcloud pubsub subscriptions create`: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Google Cloud SDK `gcloud run deploy`: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK `gcloud run services add-iam-policy-binding`: https://docs.cloud.google.com/sdk/gcloud/reference/run/services/add-iam-policy-binding
- Google Cloud Run service-to-service authentication: https://docs.cloud.google.com/run/docs/authenticating/service-to-service
- Go `google.golang.org/api/idtoken` package documentation: https://pkg.go.dev/google.golang.org/api/idtoken

## Issues Found
- The setup command granted `roles/iam.serviceAccountTokenCreator` to the push authentication service account itself. Pub/Sub documentation requires the Pub/Sub service agent, `service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com`, to have that role so Pub/Sub can mint the push JWT. Updated the command to resolve the project number and grant the role to the Pub/Sub service agent.
- The JWT verification example read the `email` claim but did not enforce that it matched the configured push authentication service account, and it did not check `email_verified`. Updated the function to require both claims to match the expected values.
- The push handler silently skipped token verification when environment variables were missing. Updated it to fail closed when `PUSH_AUDIENCE` or `PUSH_AUTH_SERVICE_ACCOUNT` is not configured.
- The error handling section incorrectly stated that 4xx responses acknowledge Pub/Sub push messages. Pub/Sub only acknowledges `102`, `200`, `201`, `202`, and `204`; any other status code is a negative acknowledgment. Updated the prose and examples accordingly.
- The main handler and retry example returned `400` for malformed Pub/Sub message data while saying this would avoid retries. Updated permanent message failures to return `204` so Pub/Sub acknowledges them.
- The deployment command did not set the expected push authentication service account used by the corrected JWT verification code. Added `PUSH_AUTH_SERVICE_ACCOUNT` to `--set-env-vars`.

## Review Notes
The Cloud SDK is not installed in this local environment, so CLI validation was performed against official Google Cloud SDK reference documentation instead of local `gcloud --help` output.
