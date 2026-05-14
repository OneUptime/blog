# Validation Summary: How to Configure Webhook Receiver for Google Cloud Build in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller Receiver API
- Kubernetes Secret and Ingress resources
- Flux ImageRepository reconciliation
- Google Cloud Build
- Google Artifact Registry
- Google Cloud Pub/Sub push subscriptions with OIDC authentication
- Google Cloud CLI
- Docker image push workflow

## Sources Consulted
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux notification API reference: https://fluxcd.io/flux/components/notification/api/v1/
- Google Artifact Registry Pub/Sub notification documentation: https://cloud.google.com/artifact-registry/docs/configure-notifications
- Google Pub/Sub push subscription authentication documentation: https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions
- Google Pub/Sub push subscription documentation: https://cloud.google.com/pubsub/docs/create-push-subscription
- Google Cloud Container Registry shutdown documentation: https://cloud.google.com/artifact-registry/docs/transition/prepare-gcr-shutdown

## Issues Found
- The post treated direct Google Container Registry pushes as current. Container Registry writes are shut down as of March 18, 2025, so the post was updated to focus on Artifact Registry while noting that Flux's receiver type remains `gcr` for GCR/GAR Pub/Sub payloads.
- The Kubernetes Secret only contained `token`. Flux GCR/GAR receivers also verify Pub/Sub OIDC claims using the service account `email` and expected `audience`, so the secret creation command was updated.
- The Receiver manifests used `events: ["push"]`. Flux documents that the `gcr` receiver type does not support event filtering, so the `events` fields were removed.
- The Ingress pointed at the `notification-controller` service. Flux exposes webhook traffic through the `webhook-receiver` service on port 80, so the backend service was corrected.
- The Pub/Sub section incorrectly stated that Artifact Registry uses a different topic and showed an unrelated `gcloud artifacts repositories update` command. Artifact Registry publishes repository notifications to a topic named `gcr`, so the topic and subscription commands were corrected.
- The Pub/Sub subscription command did not configure the OIDC token audience. The command now includes `--push-auth-token-audience` matching the Flux secret, and includes the required Pub/Sub service agent `roles/iam.serviceAccountTokenCreator` binding.
- The test image push used a direct `gcr.io` destination. The example was updated to use a regional Artifact Registry repository URL.
- The troubleshooting section used a pull command against the push subscription. This was replaced with a command that inspects the push configuration.

## Review Notes
The post now matches current Flux and Google Cloud behavior. Operators still need to create the Pub/Sub push service account and ensure the user creating the subscription has permission to attach that service account.
