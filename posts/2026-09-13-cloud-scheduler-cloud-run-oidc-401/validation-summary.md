# Validation Summary: Fix Cloud Scheduler 401s When Invoking Cloud Run

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Google Cloud Run services and jobs
- Google Cloud Scheduler HTTP targets
- OpenID Connect (OIDC) ID tokens
- OAuth 2.0 access tokens
- Google Cloud IAM and service accounts
- Google Cloud CLI (`gcloud`)
- Cloud Run ingress controls and Cloud Logging

## Sources Consulted

- [Use authentication with HTTP targets](https://docs.cloud.google.com/scheduler/docs/http-target-auth)
- [Authenticating service-to-service](https://docs.cloud.google.com/run/docs/authenticating/service-to-service)
- [Set custom audiences for services](https://docs.cloud.google.com/run/docs/configuring/custom-audiences)
- [`gcloud scheduler jobs update http`](https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/update/http)
- [`gcloud run services add-iam-policy-binding`](https://docs.cloud.google.com/sdk/gcloud/reference/run/services/add-iam-policy-binding)
- [Execute Cloud Run jobs](https://docs.cloud.google.com/run/docs/execute/jobs)
- [Running Cloud Run services on a schedule](https://docs.cloud.google.com/run/docs/triggering/using-scheduler)
- [Troubleshoot Cloud Run issues](https://docs.cloud.google.com/run/docs/troubleshooting)
- [Restrict network endpoint ingress for Cloud Run](https://docs.cloud.google.com/run/docs/securing/ingress)

## Issues Found
No technical issues found.

## Review Notes
The examples correctly distinguish an HTTP invocation of a Cloud Run service, which uses an OIDC ID token, from a Cloud Run Jobs API invocation at `run.googleapis.com`, which uses an OAuth access token. The audience, IAM caller, Scheduler service agent, and ingress guidance are consistent with current Google Cloud documentation. The commands and flags are current as of the validation date.
