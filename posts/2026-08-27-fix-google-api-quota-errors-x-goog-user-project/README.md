# How to Fix Google API Quota Errors in Raw REST Calls with the `x-goog-user-project` Header

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, REST API, Quotas, Application Default Credentials, Authentication

Description: Attribute raw Google API REST requests to the correct quota project with x-goog-user-project and verify the required Service Usage permission.

---

Google client libraries can obtain a quota project from Application Default Credentials (ADC) and send it with supported API requests. A raw HTTP request has no client library to perform that step. When a request uses user credentials and no usable quota project is supplied, the API can reject it with a quota, billing, or service usage error.

For Google APIs that support the standard system parameter, send the quota project in the `x-goog-user-project` request header.

## Send the header with an ADC token

Use explicit variables and obtain a short-lived access token from ADC:

```bash
QUOTA_PROJECT_ID='example-quota-project'
API_URL='https://SERVICE.googleapis.com/v1/RESOURCE'

ACCESS_TOKEN="$(gcloud auth application-default print-access-token)"

curl --fail-with-body \
  --request GET \
  --header "Authorization: Bearer ${ACCESS_TOKEN}" \
  --header "x-goog-user-project: ${QUOTA_PROJECT_ID}" \
  "${API_URL}"

unset ACCESS_TOKEN
```

Replace the URL with the documented endpoint for the API. Disable shell command tracing before handling a token, and do not paste tokens or complete authenticated requests into logs or tickets.

Use `gcloud auth application-default print-access-token` when the application is meant to use ADC. `gcloud auth print-access-token` instead uses the active gcloud CLI account, which may be a different identity.

## Grant permission to consume quota

The authenticated principal must have `serviceusage.services.use` on the project named in `x-goog-user-project`. The predefined Service Usage Consumer role contains that permission:

```bash
gcloud projects add-iam-policy-binding QUOTA_PROJECT_ID \
  --member='user:CALLER_EMAIL' \
  --role='roles/serviceusage.serviceUsageConsumer'
```

For workload authentication, use the corresponding `serviceAccount:SERVICE_ACCOUNT_EMAIL` member. An administrator should grant the role only where the caller is allowed to consume quota. The called API must also be enabled in the quota project.

The header does not provide access to the requested resource. The caller still needs the API-specific IAM permission on the resource project, folder, organization, or resource itself.

## Keep the three project concepts separate

A raw request can involve several projects:

- The quota project in `x-goog-user-project` receives quota and applicable billing attribution.
- The resource project appears in the URL, request body, or fully qualified resource name.
- A credential may have been created or managed in another project.

These projects can be the same, but they do not have to be. Changing the header does not rewrite a resource name, change the authenticated principal, grant IAM roles, or enable an API.

For example, a request can read a resource in `RESOURCE_PROJECT_ID` while charging quota to `QUOTA_PROJECT_ID`:

```bash
API_URL='https://SERVICE.googleapis.com/v1/projects/RESOURCE_PROJECT_ID/locations/LOCATION/resources/RESOURCE_ID'
```

The caller needs resource access in `RESOURCE_PROJECT_ID` and `serviceusage.services.use` in `QUOTA_PROJECT_ID`.

## Diagnose a request methodically

First confirm which credential flow produced the token. For ADC, test token creation without displaying it:

```bash
gcloud auth application-default print-access-token >/dev/null
```

Then verify the quota project:

```bash
gcloud projects describe QUOTA_PROJECT_ID \
  --format='value(projectId,projectNumber)'

gcloud services list \
  --enabled \
  --project=QUOTA_PROJECT_ID
```

Check the IAM policy through your normal administrative review process and confirm that the exact calling principal has `serviceusage.services.use`. Finally, confirm that the resource in the URL or body belongs to the expected resource project.

When debugging with `curl`, `--fail-with-body` preserves an error body while returning a failure exit status for HTTP errors. Be careful when sharing that body because API errors can include resource identifiers.

## Common mistakes

### Using the project header as authorization

`x-goog-user-project` is a quota and billing system parameter. It is not an impersonation mechanism and does not grant access to resources.

### Supplying a project without Service Usage permission

If the caller lacks `serviceusage.services.use`, specifying the header can produce its own permission error. Granting an API-specific role on a resource does not necessarily include this permission on the quota project.

### Enabling the API only in the resource project

For client-based APIs, service usage is checked against the consumer or quota project. Ensure the relevant API is enabled where the request consumes quota, as required by that API.

### Mixing CLI and ADC identities

The two gcloud token commands can represent different users. Select the one that matches the software being debugged and verify both identities separately if behavior differs.

### Confusing `quotaUser` with a quota project

The `quotaUser` system parameter is an opaque identifier used by some APIs to distinguish end users for per-user quotas. It is not a substitute for `x-goog-user-project` and does not select the consumer project.

## Prefer supported client libraries for application code

Raw REST calls are appropriate for diagnostics and integrations without a supported library. For maintained application code, an official Google Cloud client library usually handles token refresh, ADC, retry behavior, and quota-project propagation more safely. Even then, the underlying identity still needs the same Service Usage and resource permissions.

## Official Documentation

- [Authenticate to Google Cloud APIs by using REST](https://cloud.google.com/docs/authentication/rest)
- [Google API system parameters](https://cloud.google.com/apis/docs/system-parameters)
- [Set the quota project](https://cloud.google.com/docs/quotas/set-quota-project)
- [Print an ADC access token](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/print-access-token)
- [How Application Default Credentials works](https://cloud.google.com/docs/authentication/application-default-credentials)

## Conclusion

For a supported Google API, add `x-goog-user-project` to a raw REST request when quota must be attributed explicitly. Pair the header with `serviceusage.services.use` on that quota project, API enablement, and independent IAM access to the target resource. This fixes quota attribution without mistaking it for authentication or authorization.
