# Validation Summary: Why Does `google.auth.default()` Find Credentials but Return No Google Cloud Project ID?

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- Python
- Google Auth Library for Python (`google-auth`)
- Application Default Credentials (ADC)
- Google Cloud CLI (`gcloud`)
- Google Cloud Storage Python client
- Google Cloud project and quota-project configuration
- Google Cloud IAM and API enablement

## Sources Consulted

- [Google Auth Library for Python: `google.auth.default()` reference](https://google-auth.readthedocs.io/en/latest/reference/google.auth.html#google.auth.default)
- [Google Auth Library for Python: credential interfaces](https://google-auth.readthedocs.io/en/latest/reference/google.auth.credentials.html)
- [Google Auth Library for Python: environment variables](https://google-auth.readthedocs.io/en/latest/reference/google.auth.environment_vars.html)
- [Google Auth Library for Python: `google.auth._default` source](https://github.com/googleapis/google-auth-library-python/blob/main/google/auth/_default.py)
- [Google Auth Library for Python: authorized-user credential source](https://github.com/googleapis/google-auth-library-python/blob/main/google/oauth2/credentials.py)
- [Google Cloud: How Application Default Credentials works](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Google Cloud: Set up ADC for a local development environment](https://cloud.google.com/docs/authentication/set-up-adc-local-dev-environment)
- [Google Cloud CLI: `gcloud auth application-default login`](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/login)
- [Google Cloud CLI: `gcloud auth login`](https://cloud.google.com/sdk/gcloud/reference/auth/login)
- [Google Cloud: Set the quota project](https://cloud.google.com/docs/quotas/set-quota-project)
- [Google Cloud: Quota project overview](https://cloud.google.com/docs/quotas/quota-project)
- [Google Cloud Storage Python client: `Client`](https://cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.client.Client)

## Issues Found

- The post said that returning a credential object without an exception meant ADC had found a usable credential source. `google.auth.default()` can load a recognized credential configuration without refreshing it, so a revoked or otherwise unusable refresh token may fail only on refresh or the first authenticated request. Changed the text to say that ADC found and loaded a recognized source and that this alone does not prove refresh or authentication will succeed.
- The attached-service-account guidance mentioned only development credential path overrides. ADC also checks the well-known local ADC file before consulting the metadata server. Changed the guidance to say not to deploy a local ADC file when the application is intended to use its attached service account.

## Review Notes

- The Python examples are syntactically valid, and `storage.Client(project=project_id, credentials=credentials)` uses current, non-deprecated constructor parameters.
- The shell snippets are syntactically valid, and `gcloud auth application-default login` remains a current command.
- The explanations of `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_QUOTA_PROJECT`, the `quota_project_id` argument, Cloud SDK project detection, ADC precedence, IAM authorization, and API enablement are accurate.
- All external links in the post resolve to the intended current documentation or author profile.
