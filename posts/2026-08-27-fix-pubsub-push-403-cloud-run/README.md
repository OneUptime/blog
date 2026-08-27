# How to Fix Pub/Sub Push 403s to an Authenticated Cloud Run Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, Pub/Sub, Cloud Run, OIDC, IAM

Description: Configure Pub/Sub OIDC push authentication, Cloud Run Invoker IAM, token creation, and audience values without making the service public.

---

An authenticated Pub/Sub push subscription sends a Google-signed OpenID Connect (OIDC) ID token in the request's `Authorization` header. Cloud Run validates the token and checks whether the service account named by the token can invoke the service.

Cloud Run reports distinct failures at different layers. A platform-generated `401` points to token validation, while a platform-generated `403` usually points to missing invocation permission. An ingress mismatch normally returns `404`; a `403` without a Cloud Run revision request log can indicate VPC Service Controls. Making the Cloud Run service public can hide the configuration error and removes the intended protection. Fix the identity chain instead.

## Understand the three principals

An authenticated push has three distinct identities:

1. The administrator or deployment account that creates or updates the subscription.
2. A user-managed push service account whose email appears in the OIDC token.
3. The Google-managed Pub/Sub service agent that mints the token.

Only the push service account should receive Cloud Run Invoker. The subscription administrator needs `iam.serviceAccounts.actAs` on that account. The Pub/Sub service agent needs permission to create an OIDC token for it.

## Inspect the current endpoint and push configuration

Set all project and resource values explicitly:

```bash
PUBSUB_PROJECT_ID='example-events-project'
RUN_PROJECT_ID='example-services-project'
REGION='us-central1'
SERVICE='event-receiver'
SUBSCRIPTION='event-receiver-push'
PUSH_SA="pubsub-push@${PUBSUB_PROJECT_ID}.iam.gserviceaccount.com"

SERVICE_URL="$(
  gcloud run services describe "${SERVICE}" \
    --project="${RUN_PROJECT_ID}" \
    --region="${REGION}" \
    --format='value(status.url)'
)"

gcloud pubsub subscriptions describe "${SUBSCRIPTION}" \
  --project="${PUBSUB_PROJECT_ID}" \
  --format='yaml(pushConfig)'
```

The user-managed push service account must be in the same project as the subscription. It can receive Invoker on a Cloud Run service in another project.

Use the stable `run.app` service URL returned by Cloud Run. If the application handles a path such as `/pubsub`, append that path to the push endpoint but keep the OIDC audience equal to the Cloud Run service URL unless a documented custom audience is configured on the service.

## Grant the push identity Cloud Run Invoker

Grant `roles/run.invoker` on the exact service and region:

```bash
gcloud run services add-iam-policy-binding "${SERVICE}" \
  --project="${RUN_PROJECT_ID}" \
  --region="${REGION}" \
  --member="serviceAccount:${PUSH_SA}" \
  --role='roles/run.invoker'
```

This role contains the permission Cloud Run checks for invocation. Do not grant Invoker to the Pub/Sub service agent unless that agent is deliberately the token's caller identity, which is not the normal authenticated push design.

IAM policy updates can take several minutes to propagate. During propagation, Pub/Sub can continue to receive `403` responses and retry messages.

## Allow Pub/Sub to mint the OIDC token

Get the Pub/Sub project number and service-agent address:

```bash
PUBSUB_PROJECT_NUMBER="$(
  gcloud projects describe "${PUBSUB_PROJECT_ID}" \
    --format='value(projectNumber)'
)"

PUBSUB_SERVICE_AGENT="service-${PUBSUB_PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com"
```

The service agent needs `iam.serviceAccounts.getOpenIdToken` on the push service account. A narrowly scoped Service Account Token Creator binding provides it:

```bash
gcloud iam service-accounts add-iam-policy-binding "${PUSH_SA}" \
  --project="${PUBSUB_PROJECT_ID}" \
  --member="serviceAccount:${PUBSUB_SERVICE_AGENT}" \
  --role='roles/iam.serviceAccountTokenCreator'
```

For projects created after April 8, 2021, the Pub/Sub service agent normally has `roles/pubsub.serviceAgent`, which already includes the token-creation permissions, so an additional Token Creator grant is not normally required. Older projects or projects whose service-agent policy was modified can need the explicit binding. Inspect existing policy before adding a duplicate.

Service-agent roles and token-creation roles should be granted only to the documented service agent, not to application users.

## Ensure the subscription administrator can attach the identity

The principal creating or updating the authenticated push configuration needs `iam.serviceAccounts.actAs` on `PUSH_SA`. The Service Account User role contains it:

```bash
SUBSCRIPTION_ADMIN='user:operator@example.com'

gcloud iam service-accounts add-iam-policy-binding "${PUSH_SA}" \
  --project="${PUBSUB_PROJECT_ID}" \
  --member="${SUBSCRIPTION_ADMIN}" \
  --role='roles/iam.serviceAccountUser'
```

This permission authorizes attaching the service account to the subscription. It does not grant the administrator permission to invoke Cloud Run as themselves.

## Update the push endpoint and audience

Configure the service account and an explicit audience:

```bash
PUSH_ENDPOINT="${SERVICE_URL}/"

gcloud pubsub subscriptions update "${SUBSCRIPTION}" \
  --project="${PUBSUB_PROJECT_ID}" \
  --push-endpoint="${PUSH_ENDPOINT}" \
  --push-auth-service-account="${PUSH_SA}" \
  --push-auth-token-audience="${SERVICE_URL}"
```

Cloud Run normally expects the ID token's `aud` claim to match its `run.app` service URL. Do not set the audience to the topic, subscription, service account email, or an arbitrary custom domain. If a custom Cloud Run audience is required, configure it on Cloud Run first and use that exact value.

Publish a test message with a unique identifier and inspect delivery logs without recording the ID token:

```bash
TOPIC='events'
gcloud pubsub topics publish "${TOPIC}" \
  --project="${PUBSUB_PROJECT_ID}" \
  --message='{"test_id":"push-auth-check-2026-08-27"}'
```

The handler must return a successful acknowledgement response only after it has safely accepted the message. A failure response causes redelivery according to the subscription's retry and dead-letter settings.

## Use logs to locate the rejecting layer

If Cloud Run request logs contain the `403`, verify the token identity and the service-level Invoker binding. For a `401`, verify the token format, signature, and `aud` value. If a `403` has no `cloud_run_revision` request log, check VPC Service Controls policy-denial logs. If a `404` has no such request log, check the endpoint hostname, whether the default `run.app` URL is disabled, and Cloud Run ingress settings.

Pub/Sub push is an HTTPS callback, not a connection to a private VPC IP. If the desired receiver is reachable only inside a VPC, use a supported design such as an Eventarc path documented for that private destination rather than exposing the service or bypassing authentication.

Also distinguish application-generated `403` responses from Cloud Run IAM responses. Once the request reaches the container, application authorization logic can reject it independently.

## Official Documentation

- [Authenticate Pub/Sub push subscriptions](https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions)
- [Create Pub/Sub push subscriptions](https://cloud.google.com/pubsub/docs/create-push-subscription)
- [Use Pub/Sub with Cloud Run](https://cloud.google.com/run/docs/tutorials/pubsub)
- [Troubleshoot Cloud Run 403 responses](https://cloud.google.com/run/docs/troubleshooting#unauthorized-client)
- [Configure Cloud Run custom audiences](https://cloud.google.com/run/docs/configuring/custom-audiences)
- [Pub/Sub push delivery behavior](https://cloud.google.com/pubsub/docs/push)

## Conclusion

Keep the Cloud Run service authenticated. Grant its Invoker role to the push service account, let the Pub/Sub service agent mint an OIDC token, give the subscription administrator `actAs`, and match the token audience to the Cloud Run service URL. Logs then show whether any remaining delivery failure comes from token validation, IAM, VPC Service Controls, ingress, or the application itself.
