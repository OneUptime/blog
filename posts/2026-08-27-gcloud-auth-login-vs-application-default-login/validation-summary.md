# Validation Summary: `gcloud auth login` vs Application Default Credentials

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Google Cloud CLI (`gcloud`)
- Application Default Credentials (ADC)
- Google Auth Library for Python (`google-auth`)
- OAuth 2.0 user credentials
- Google Cloud IAM and Service Usage
- Service accounts, the metadata server, and Workload Identity Federation
- Resource projects and quota projects

## Sources Consulted

- [Authorize the gcloud CLI (`gcloud auth login`)](https://cloud.google.com/sdk/gcloud/reference/auth/login)
- [List credentialed gcloud accounts (`gcloud auth list`)](https://cloud.google.com/sdk/gcloud/reference/auth/list)
- [Create local ADC (`gcloud auth application-default login`)](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/login)
- [Print an ADC access token](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/print-access-token)
- [Set the ADC quota project](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/set-quota-project)
- [List gcloud configuration properties](https://cloud.google.com/sdk/gcloud/reference/config/list)
- [gcloud output formats](https://cloud.google.com/sdk/gcloud/reference/topic/formats)
- [How Application Default Credentials works](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Set up Application Default Credentials](https://cloud.google.com/docs/authentication/provide-credentials-adc)
- [Set up ADC for local development](https://cloud.google.com/docs/authentication/set-up-adc-local-dev-environment)
- [Set up ADC with an attached service account](https://cloud.google.com/docs/authentication/set-up-adc-attached-service-account)
- [Set up ADC for on-premises or external workloads](https://cloud.google.com/docs/authentication/set-up-adc-on-premises)
- [Troubleshoot Application Default Credentials](https://cloud.google.com/docs/authentication/troubleshoot-adc)
- [Quota project overview](https://cloud.google.com/docs/quotas/quota-project)
- [Set the quota project](https://cloud.google.com/docs/quotas/set-quota-project)
- [Service Usage roles and permissions](https://cloud.google.com/iam/docs/roles-permissions/serviceusage)
- [Python `google.auth.default()` reference](https://googleapis.dev/python/google-auth/latest/reference/google.auth.html)
- [Python user credential class](https://googleapis.dev/python/google-auth/latest/reference/google.oauth2.credentials.html)
- [Python service account credential class](https://googleapis.dev/python/google-auth/latest/reference/google.oauth2.service_account.html)
- [Python Compute Engine credential class](https://googleapis.dev/python/google-auth/latest/reference/google.auth.compute_engine.html)

## Issues Found

- The access-token check printed `ADC token creation succeeded` even when `gcloud auth application-default print-access-token` failed because the `echo` was unconditional. Chained the commands with `&&` so the success message appears only after a zero exit status.
- The Python diagnostic printed only `type(credentials).__name__`. Several Google Auth credential implementations use the simple class name `Credentials`, so that output did not reliably distinguish user, service account, metadata-server, or other implementations. Changed it to print the fully qualified class name.
- The post said the relevant API must be enabled in the configured quota project without qualifying the API type. Resource-based APIs use the resource project for quota and service activation; changed the statement to apply specifically to client-based APIs.

## Review Notes

- The two credential stores, ADC search order, well-known file paths, active-account behavior, `--update-adc`, quota-project command and permission requirements, and production authentication recommendations are current and correct.
- `gcloud auth application-default print-access-token` uses the current ADC resolution, including a file selected by `GOOGLE_APPLICATION_CREDENTIALS`. The post correctly checks that variable earlier and limits the token test's conclusion to token acquisition rather than resource authorization.
- `google.auth.default()` can return `None` for the detected project ID when the environment does not provide one; the diagnostic safely reports that result.
- All official documentation links in the post resolve to the intended current Google Cloud pages. No deprecated commands or version-specific claims were found.
