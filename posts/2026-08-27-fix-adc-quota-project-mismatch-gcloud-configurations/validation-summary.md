# Validation Summary: How to Fix ADC Quota Project Mismatch When Switching Between gcloud Configurations

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Google Cloud CLI (`gcloud`) named configurations and properties
- Google Cloud Application Default Credentials (ADC)
- Google Auth Library for Python (`google-auth`)
- Google Cloud quota projects and Service Usage
- Google Cloud IAM roles and permissions
- Google Cloud authentication and quota-project environment variables

## Sources Consulted

- [Managing gcloud CLI configurations](https://cloud.google.com/sdk/docs/configurations)
- [gcloud config get](https://cloud.google.com/sdk/gcloud/reference/config/get)
- [gcloud config list](https://cloud.google.com/sdk/gcloud/reference/config/list)
- [gcloud config configurations list](https://cloud.google.com/sdk/gcloud/reference/config/configurations/list)
- [gcloud auth list](https://cloud.google.com/sdk/gcloud/reference/auth/list)
- [How Application Default Credentials works](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Set up ADC for a local development environment](https://cloud.google.com/docs/authentication/set-up-adc-local-dev-environment)
- [gcloud auth application-default login](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/login)
- [gcloud auth application-default set-quota-project](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/set-quota-project)
- [gcloud auth application-default print-access-token](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/print-access-token)
- [Quota project overview](https://cloud.google.com/docs/quotas/quota-project)
- [Set the quota project](https://cloud.google.com/docs/quotas/set-quota-project)
- [Troubleshoot your ADC setup](https://cloud.google.com/docs/authentication/troubleshoot-adc)
- [Service Usage roles and permissions](https://cloud.google.com/iam/docs/roles-permissions/serviceusage)
- [gcloud projects add-iam-policy-binding](https://cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding)
- [google.auth package reference](https://google-auth.readthedocs.io/en/latest/reference/google.auth.html)
- [google.auth environment variables reference](https://google-auth.readthedocs.io/en/latest/reference/google.auth.environment_vars.html)
- [Google Auth Library for Python ADC source](https://github.com/googleapis/google-auth-library-python/blob/main/google/auth/_default.py)
- [Google Auth Library for Python Cloud SDK integration source](https://github.com/googleapis/google-auth-library-python/blob/main/google/auth/_cloud_sdk.py)

## Issues Found

- The post referred to `gcloud config get-value project`. That command is now a backward-compatibility alias and an internal implementation detail that may disappear. It was replaced with the current `gcloud config get project` command.
- The Python diagnostic did not explain that, for local user ADC, the `project_id` returned by `google.auth.default()` can be derived from the active gcloud configuration. A clarification was added so readers do not mistake `detected_project_id` for the ADC identity or stored quota project.
- The explanation said quota-project selection during ADC login was subject to the "caller" having permission, which could be confused with the active CLI account. It now identifies the account written into ADC as the identity that needs the permission.
- The quota-project explanation was too broad for resource-based APIs, which always use the resource-containing project for quota. The wording and API-enablement guidance were qualified to apply to client-based APIs that use the configured quota project.
- The identity-change instructions used bare `gcloud auth application-default login` after activating a named configuration. ADC login uses a separate sign-in flow and does not deterministically inherit `core/account`, so the command now passes `DEVELOPER_EMAIL` explicitly.
- The token-validation snippet printed `ADC token creation succeeded` even when token generation failed because `echo` ran unconditionally. The commands are now joined with `&&`, so success is reported only after a zero exit status.

## Review Notes

- The Python snippet is syntactically valid, uses the current `google.auth.default()` API, and avoids printing credential secrets or tokens.
- `type(credentials).__name__` is correct but can display the generic name `Credentials` for multiple credential implementations. A fully qualified class name could make this diagnostic more specific in a future revision.
- The post correctly notes that `GOOGLE_CLOUD_QUOTA_PROJECT` support depends on the client language and library version. Current Google documentation lists it for C#, Go, Java, Node.js, Python, and PHP, but not Ruby; C++ uses a different variable.
- No unresolved technical issues or version-specific deprecations remain after the corrections.
