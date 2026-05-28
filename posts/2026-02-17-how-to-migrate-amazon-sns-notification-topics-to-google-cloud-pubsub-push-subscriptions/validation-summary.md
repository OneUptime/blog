# Validation Summary: How to Migrate Amazon SNS Notification Topics to Google Cloud Pub/Sub Push

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Amazon SNS
- Google Cloud Pub/Sub
- Google Cloud Functions / Cloud Run functions
- AWS CLI
- Google Cloud CLI
- Python
- SendGrid

## Sources Consulted
- AWS CLI Command Reference: `sns list-subscriptions-by-topic` - https://docs.aws.amazon.com/cli/latest/reference/sns/list-subscriptions-by-topic.html
- AWS CLI Command Reference: `sns get-subscription-attributes` - https://awscli.amazonaws.com/v2/documentation/api/2.0.34/reference/sns/get-subscription-attributes.html
- AWS CLI Command Reference: `sns get-topic-attributes` - https://docs.aws.amazon.com/cli/latest/reference/sns/get-topic-attributes.html
- Amazon SNS message filtering - https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering.html
- Google Cloud CLI Reference: `gcloud pubsub topics create` - https://cloud.google.com/sdk/gcloud/reference/pubsub/topics/create
- Google Cloud CLI Reference: `gcloud pubsub subscriptions create` - https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Google Cloud CLI Reference: `gcloud pubsub subscriptions update` - https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/update
- Google Cloud Pub/Sub push subscriptions - https://cloud.google.com/pubsub/docs/push
- Google Cloud Pub/Sub authenticated push subscriptions - https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions
- Google Cloud Pub/Sub subscription filters - https://cloud.google.com/pubsub/docs/subscription-message-filter
- Google Cloud Pub/Sub dead-letter topics - https://cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub Python publisher client reference - https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.publisher.client.Client
- Google Cloud CLI Reference: `gcloud functions deploy` - https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud CLI Reference: `gcloud monitoring` - https://cloud.google.com/sdk/gcloud/reference/monitoring
- Cloud Monitoring metric descriptors API - https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.metricDescriptors/get

## Issues Found
- The SNS inventory command queried `FilterPolicy` from `list-subscriptions-by-topic`, but that API returns subscription identity fields such as ARN, owner, protocol, endpoint, and topic ARN, not subscription attributes. I removed `FilterPolicy` from the list query and added `aws sns get-subscription-attributes` to retrieve filter and redrive policy details.
- The Pub/Sub schema topic example used `--message-encoding=JSON`; the current `gcloud pubsub topics create` reference lists `json` and `binary` as accepted values. I changed the example to `--message-encoding=json`.
- The push subscription section created `order-events-webhook` twice. The second creation would fail because the subscription already exists. I changed the second command to update the existing subscription with a dead-letter policy.
- The authenticated push subscription example omitted the Pub/Sub service agent permission needed to mint OIDC tokens for the configured push service account. I added the `roles/iam.serviceAccountTokenCreator` binding.
- The dead-letter policy example omitted required Pub/Sub service agent IAM permissions. I added the topic publisher and subscription subscriber IAM bindings needed for dead-letter forwarding.
- The validation section tried to pull directly from the dead-letter topic. Pub/Sub pull operations use subscriptions, so I added a reader subscription on the dead-letter topic and changed the pull command to use that subscription.
- The validation section used `gcloud monitoring metrics list`, but current `gcloud monitoring` does not provide that command group. I replaced it with a Cloud Monitoring metric descriptor API request authenticated by `gcloud auth print-access-token`.
- The concept mapping said an SNS Lambda subscription maps to a push subscription to Cloud Functions. I changed it to a Pub/Sub-triggered Cloud Function, which matches the deployment example and Cloud Functions trigger model.
- The HTTP/S subscription section said the migration translated directly to Pub/Sub push subscriptions. I clarified that endpoints must handle the Pub/Sub push request envelope.
- Two Python publishing snippets used `json.dumps(...)` without importing `json`. I added the missing imports.

## Review Notes
The local workspace did not have `aws` or `gcloud` installed, so CLI verification was performed against official command references rather than local `--help` output. The examples remain illustrative and still require replacing sample project IDs, service accounts, ARNs, endpoints, and dependency files such as `requirements.txt`.
