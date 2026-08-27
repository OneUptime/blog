# Validation Summary: How to Fix Pub/Sub Push 403s to an Authenticated Cloud Run Service

## Status

validated

## Post Type

Troubleshooting guide and configuration tutorial

## Technologies Covered

- Google Cloud Pub/Sub authenticated push subscriptions
- Google Cloud Run
- OpenID Connect (OIDC) ID tokens and JWT audience claims
- Google Cloud IAM, service accounts, and service agents
- Google Cloud CLI (`gcloud`)
- VPC Service Controls and Cloud Run ingress
- Eventarc routing to private VPC destinations

## Sources Consulted

- [Authentication for Pub/Sub push subscriptions](https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions)
- [Create Pub/Sub push subscriptions](https://cloud.google.com/pubsub/docs/create-push-subscription)
- [Pub/Sub push subscription behavior](https://cloud.google.com/pubsub/docs/push)
- [Use Pub/Sub with Cloud Run](https://cloud.google.com/run/docs/tutorials/pubsub)
- [Authenticate Cloud Run service-to-service requests](https://cloud.google.com/run/docs/authenticating/service-to-service)
- [Configure Cloud Run custom audiences](https://cloud.google.com/run/docs/configuring/custom-audiences)
- [Troubleshoot Cloud Run 401, 403, and 404 responses](https://cloud.google.com/run/docs/troubleshooting)
- [Configure Cloud Run ingress](https://cloud.google.com/run/docs/securing/ingress)
- [Cloud Run IAM roles and permissions](https://cloud.google.com/iam/docs/roles-permissions/run)
- [IAM service account authentication roles](https://cloud.google.com/iam/docs/service-account-permissions)
- [`gcloud pubsub subscriptions update` reference](https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/update)
- [`gcloud run services add-iam-policy-binding` reference](https://cloud.google.com/sdk/gcloud/reference/run/services/add-iam-policy-binding)
- [`gcloud iam service-accounts add-iam-policy-binding` reference](https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/add-iam-policy-binding)
- [`gcloud pubsub topics publish` reference](https://cloud.google.com/sdk/gcloud/reference/pubsub/topics/publish)

## Issues Found

- The post conflated Cloud Run rejection layers and status codes. An invalid token or incorrect `aud` is documented as `401`; missing `run.routes.invoke` permission is the main platform-generated `403` case; and restrictive ingress or a disabled default `run.app` URL normally produces an unlogged `404`. A `403` without a `cloud_run_revision` request log can indicate VPC Service Controls. The introduction, log-diagnosis guidance, and conclusion were corrected to distinguish these cases.
- The Cloud Run troubleshooting link used the obsolete `#client-is-not-authorized` fragment. It was changed to the current `#unauthorized-client` fragment so the link opens the intended section.

## Review Notes

- All shell snippets and `gcloud` flags are syntactically valid, current, and non-deprecated. They were checked against Google Cloud CLI 561.0.0 and the current official CLI references.
- `gcloud pubsub subscriptions update` resets omitted PushConfig options to their defaults. The shown command is correct for a normally wrapped subscription; an existing subscription that uses payload unwrapping should also preserve its `--push-no-wrapper` settings.
- The cross-project IAM statement is correct: a push service account in the Pub/Sub project can receive Invoker on a Cloud Run service in another project. Independently, Cloud Run's `internal` ingress accepts Pub/Sub only when the source is in the same project or VPC Service Controls perimeter and uses the default `run.app` URL.
