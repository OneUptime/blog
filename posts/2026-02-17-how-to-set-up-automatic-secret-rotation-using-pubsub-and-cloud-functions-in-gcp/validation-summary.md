# Validation Summary: How to Set Up Automatic Secret Rotation Using Pub/Sub and Cloud Functions in GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Secret Manager
- Pub/Sub
- Cloud Run functions / Cloud Functions 2nd gen
- Cloud SQL Admin API
- Google Cloud CLI
- Python
- Secret Manager Python client library

## Sources Consulted
- Google Cloud Secret Manager rotation schedules: https://docs.cloud.google.com/secret-manager/docs/secret-rotation
- Google Cloud Secret Manager event notifications: https://docs.cloud.google.com/secret-manager/docs/event-notifications
- Google Cloud SDK reference for `gcloud secrets create`: https://docs.cloud.google.com/sdk/gcloud/reference/secrets/create
- Google Cloud SDK reference for `gcloud pubsub topics publish`: https://cloud.google.com/sdk/gcloud/reference/pubsub/topics/publish
- Cloud Run functions Pub/Sub CloudEvent Python sample: https://docs.cloud.google.com/functions/docs/samples/functions-cloudevent-pubsub
- Secret Manager IAM roles and permissions: https://docs.cloud.google.com/iam/docs/roles-permissions/secretmanager
- Cloud SQL Admin API `users.update`: https://cloud.google.com/sql/docs/mysql/admin-api/rest/v1beta4/users/update
- Cloud Run logging resource type documentation: https://docs.cloud.google.com/run/docs/logging
- Google Cloud SDK reference for `gcloud functions logs read`: https://docs.cloud.google.com/sdk/gcloud/reference/functions/logs/read

## Issues Found
- Secret Manager notification publishing permissions were incomplete. The post created a Pub/Sub topic but did not create or grant the Secret Manager service agent `roles/pubsub.publisher` on the topic. Added the documented service identity creation and topic IAM binding.
- The Cloud Function parsed `eventType` and `name` from the Pub/Sub message body, but Secret Manager sends `eventType` and `secretId` as Pub/Sub attributes and sends the changed resource metadata in the data field. Updated the function and manual test command to use attributes.
- The function comment said it processed rotation events only for the configured secret, but the code did not verify the secret name. Added an explicit `secretId` check against the configured secret resource name.
- Cloud SQL user updates return a long-running operation. Updated the sample to wait for the operation to finish and raise an error if the operation fails before adding a new Secret Manager version.
- The log query used the Cloud Functions 1st gen monitored resource type. Since the deployment is 2nd gen, updated the filter to use the Cloud Run revision resource and service name labels.

## Review Notes
The Google Cloud CLI was not installed in the local environment, so CLI syntax was verified against official Google Cloud SDK reference pages instead of local `gcloud --help` output.
