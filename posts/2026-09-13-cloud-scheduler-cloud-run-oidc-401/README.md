# Fix Cloud Scheduler 401s When Invoking Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloud Run, Google Cloud, Cloud Scheduler, Security, Troubleshooting

Description: Trace a scheduled request through its target URL, OIDC audience, caller service account, invoker binding, and Scheduler service agent.

---

A Scheduler job can target the right URL and still fail before your Cloud Run handler executes. The schedule defines when to send a request; authentication defines which identity sends it and which service the token is intended for. Treat those settings as separate fields.

Start with a failing execution and preserve its timestamp, status, target URI, and job name. A `401` is a useful clue, but status codes alone cannot distinguish a rejected platform token from an application returning its own authentication error.

## Inspect the actual job

The following commands are illustrative. Replace the project, region, and resource names with your own values; the Scheduler job and Cloud Run service do not have to use the same region.

```bash
gcloud scheduler jobs describe nightly-report \
  --project=example-project \
  --location=us-central1 \
  --format=yaml

gcloud run services describe report-worker \
  --project=example-project \
  --region=us-central1 \
  --format='value(status.url)'
```

In the job output, inspect `httpTarget.uri`, `httpTarget.httpMethod`, and `httpTarget.oidcToken`. Record the service account email and audience. If the job uses `oauthToken`, first confirm what endpoint it calls.

A Cloud Run service URL normally requires an OIDC ID token. A Google API endpoint such as `run.googleapis.com`, including a Cloud Run Jobs API invocation, uses OAuth access-token authentication instead. Do not copy a jobs scheduling recipe into an HTTP service invocation unchanged. [Cloud Scheduler HTTP authentication](https://docs.cloud.google.com/scheduler/docs/http-target-auth).

## Separate destination from audience

Suppose the destination is:

```text
https://report-worker-EXAMPLE.us-central1.run.app/tasks/report?mode=daily
```

The destination includes the route and query string that your application needs. The normal audience is the service's generated base URL returned by `status.url`. Use that value verbatim. Do not invent the hostname from the service name, and do not append the request path.

For a custom-domain destination, continue using the generated service URL as the audience unless the receiving service explicitly accepts a configured custom audience. Cloud Run documents this distinction for authenticated service calls. [Service-to-service authentication](https://docs.cloud.google.com/run/docs/authenticating/service-to-service).

Set the audience explicitly rather than depending on a default derived from a URI with path or query parameters:

```bash
gcloud scheduler jobs update http nightly-report \
  --project=example-project \
  --location=us-central1 \
  --uri='https://report-worker-EXAMPLE.us-central1.run.app/tasks/report?mode=daily' \
  --http-method=POST \
  --oidc-service-account-email=scheduler-caller@example-project.iam.gserviceaccount.com \
  --oidc-token-audience='https://report-worker-EXAMPLE.us-central1.run.app'
```

This preserves the job's schedule while updating the HTTP target. Review any existing body and headers to ensure they still suit the endpoint. The CLI's audience and service-account flags are documented in the [HTTP job update reference](https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/update/http).

## Grant invocation to the caller identity

The job's OIDC service account is the principal the target authorizes. It is different from the Cloud Run service's runtime account, which the application uses to call databases or other APIs.

Grant the caller access on the intended service:

```bash
gcloud run services add-iam-policy-binding report-worker \
  --project=example-project \
  --region=us-central1 \
  --member=serviceAccount:scheduler-caller@example-project.iam.gserviceaccount.com \
  --role=roles/run.invoker
```

Then inspect the policy and compare the exact email to the job configuration. A similarly named account in another project is a different principal. Binding the runtime account or your own user account will not authorize the scheduled identity.

The account attached to the Scheduler job must belong to the Scheduler job's project. The person configuring it also needs permission to act as that service account. [Scheduler service-account requirements](https://docs.cloud.google.com/scheduler/docs/http-target-auth).

## Check the service agent separately

Cloud Scheduler uses its Google-managed service agent to support authenticated delivery. Its email follows this shape:

```text
service-PROJECT_NUMBER@gcp-sa-cloudscheduler.iam.gserviceaccount.com
```

Do not configure this account as the job's OIDC caller. Check that its project binding includes `roles/cloudscheduler.serviceAgent`. If the binding was removed, restore that specific documented role for the service agent after confirming the project number.

Avoid granting token-creation roles indiscriminately to all three identities. A caller with invocation permission still depends on Scheduler being able to generate its token, but those are separate authorization checks.

## Determine whether the request reaches the application

Compare Scheduler execution logs with Cloud Run request logs at the failure time. Add a harmless request-start marker in staging if the application logs only completed work. Log an operation identifier, not the bearer token.

If the request reaches the handler and the handler returns `401`, inspect application middleware, route-specific authentication, and the HTTP method. If it never reaches the handler, check token settings, IAM, and ingress eligibility. An internal-only service has network rules in addition to authentication; correct IAM does not make every origin an allowed internal source. [Cloud Run ingress restrictions](https://docs.cloud.google.com/run/docs/securing/ingress).

A successful test under your own user identity proves only that your identity can invoke the service. Use a controlled Scheduler execution to verify the actual path, recognizing that running a job manually performs its application operation.

## Verify without creating duplicate business work

Make the endpoint idempotent for the relevant schedule interval. Then trigger one test execution, inspect the response and application completion, and wait for a normal scheduled execution. Correlate both using their operation IDs.

If authentication succeeds but the job is retried, investigate application response timing and status next. Authentication fixes do not guarantee that the work finishes within Scheduler's deadline or that duplicate deliveries are harmless.

## Conclusion

The reliable fix aligns four things: destination URL, accepted audience, job caller identity, and invocation permission. Verify Scheduler's service agent independently, then confirm the actual scheduled request reaches and completes the handler. This avoids making the service public to work around a precise identity mismatch.

## Official Documentation

- [Authenticate Scheduler HTTP targets](https://docs.cloud.google.com/scheduler/docs/http-target-auth)
- [Cloud Run service-to-service authentication](https://docs.cloud.google.com/run/docs/authenticating/service-to-service)
- [Update an HTTP Scheduler job](https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/update/http)
- [Cloud Run ingress settings](https://docs.cloud.google.com/run/docs/securing/ingress)
