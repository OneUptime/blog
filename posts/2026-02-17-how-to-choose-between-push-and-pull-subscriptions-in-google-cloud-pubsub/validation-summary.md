# Validation Summary: How to Choose Between Push and Pull Subscriptions in Google Cloud Pub/Sub

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Pub/Sub
- Pub/Sub push subscriptions
- Pub/Sub pull subscriptions and StreamingPull
- Python Google Cloud Pub/Sub client library
- Flask
- Terraform Google provider
- OIDC/JWT authentication
- Google Cloud IAM

## Sources Consulted
- Google Cloud Pub/Sub pull subscriptions: https://docs.cloud.google.com/pubsub/docs/pull
- Google Cloud Pub/Sub push subscriptions: https://docs.cloud.google.com/pubsub/docs/push
- Google Cloud Pub/Sub create push subscriptions: https://docs.cloud.google.com/pubsub/docs/create-push-subscription
- Google Cloud Pub/Sub authenticated push subscriptions: https://docs.cloud.google.com/pubsub/docs/authenticate-push-subscriptions
- Google Cloud Pub/Sub subscription retry policy: https://cloud.google.com/pubsub/docs/subscription-retry-policy
- Python Pub/Sub `FlowControl` reference: https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.types.FlowControl
- Terraform `google_pubsub_subscription` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription

## Issues Found
- The post described push delivery as HTTP and referred to a public HTTP endpoint. Google Cloud documents push endpoints as publicly accessible HTTPS endpoints, so the wording and comparison table were corrected to HTTPS.
- The Flask example said any non-2xx response is a nack. Pub/Sub acknowledges only specific response codes, so the comment was changed to refer to any non-acknowledgment status.
- The retry guidance said Pub/Sub retries after a non-success status code. This was narrowed to statuses that Pub/Sub does not treat as acknowledgements.
- The Terraform push subscription example configured an OIDC service account but no explicit token audience. An `audience` value matching the push endpoint was added to make the later token verification behavior unambiguous.
- The OIDC verification example checked the service account email but not `email_verified`. Google documentation recommends validating both, so the `email_verified` check was added.

## Review Notes
The pull subscriber example uses the current high-level Python client pattern with `SubscriberClient.subscribe()` and `FlowControl`. The general push/pull tradeoffs are accurate, though the table intentionally simplifies some deployment choices such as serverless pull workers and advanced push rate behavior.
