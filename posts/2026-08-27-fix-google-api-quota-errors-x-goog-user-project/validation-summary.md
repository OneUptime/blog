# Validation Summary: Fix Google API REST Quota Errors with `x-goog-user-project`

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud REST APIs
- Google Cloud quota projects and system parameters
- Application Default Credentials (ADC) and OAuth 2.0 access tokens
- Google Cloud CLI (`gcloud`)
- Google Cloud IAM and Service Usage
- curl

## Sources Consulted
- [Authenticate with REST](https://cloud.google.com/docs/authentication/rest)
- [Quota project overview](https://cloud.google.com/docs/quotas/quota-project)
- [Set the quota project](https://cloud.google.com/docs/quotas/set-quota-project)
- [Google API system parameters](https://cloud.google.com/apis/docs/system-parameters)
- [Troubleshoot your ADC setup](https://cloud.google.com/docs/authentication/troubleshoot-adc)
- [How Application Default Credentials works](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Service Usage access control with IAM](https://cloud.google.com/service-usage/docs/access-control)
- [`gcloud auth application-default print-access-token`](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/print-access-token)
- [`gcloud auth print-access-token`](https://cloud.google.com/sdk/gcloud/reference/auth/print-access-token)
- [`gcloud projects add-iam-policy-binding`](https://cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding)
- [`gcloud projects describe`](https://cloud.google.com/sdk/gcloud/reference/projects/describe)
- [`gcloud services list`](https://cloud.google.com/sdk/gcloud/reference/services/list)
- [Configure Workload Identity Federation with other identity providers](https://cloud.google.com/iam/docs/workload-identity-federation-with-other-providers)
- [Create and manage Google Cloud projects](https://cloud.google.com/resource-manager/docs/creating-managing-projects)
- [curl `--fail-with-body` documentation](https://curl.se/docs/manpage.html#--fail-with-body)

## Issues Found
1. **Quota-project override claims were not limited to client-based API methods**: Resource-based API methods always use the project containing the resource for quota, and `x-goog-user-project` cannot override it. Qualified the header guidance, project-attribution explanation, cross-project example, API-enablement statement, and conclusion accordingly.
2. **Later commands used shell-variable names as literal arguments**: The post defined `QUOTA_PROJECT_ID` as a shell variable but later passed the text `QUOTA_PROJECT_ID`, which is not a valid Google Cloud project ID. Expanded and quoted `${QUOTA_PROJECT_ID}`, and added and expanded an explicit `CALLER_EMAIL` variable in the IAM example.
3. **The workload IAM member guidance was too broad**: Not every workload authenticates as a Google service account; direct federated identities use other IAM principal identifiers. Limited the `serviceAccount:` member format to callers that authenticate as service accounts.
4. **The `quotaUser` explanation omitted a current requirement**: Google ignores `quotaUser` unless a valid API key with service restrictions identifies the quota project. Added that requirement and used Google's more precise "pseudo-user identifier" terminology.
5. **The token-command comparison referred only to users**: ADC can represent a user, service account, or federated workload identity. Changed "different users" to "different principals."

## Review Notes
- All five links in the post's Official Documentation section resolve to the intended current Google Cloud documentation.
- The documented gcloud commands, flags, IAM role, IAM member prefixes, REST headers, and shell syntax are current and non-deprecated.
- `curl --fail-with-body` behaves as described and is available in curl 7.76.0 and newer; older curl installations require an upgrade or a different error-handling approach.
- The placeholder API URLs must be replaced with the endpoint documented for the chosen API, as the post states.
