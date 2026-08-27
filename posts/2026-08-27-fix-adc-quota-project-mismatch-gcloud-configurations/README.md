# How to Fix ADC Quota Project Mismatch When Switching Between gcloud Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, gcloud, Application Default Credentials, Quotas, Authentication

Description: Fix local ADC quota errors after changing gcloud configurations by separating configuration state from the shared ADC quota project.

---

Named gcloud configurations make it convenient to switch accounts and projects:

```bash
gcloud config configurations activate team-a
gcloud config configurations activate team-b
```

However, activating a configuration changes gcloud properties such as `core/account` and `core/project`. It does not automatically replace an existing local Application Default Credentials (ADC) file. Local ADC is stored at one well-known path, so it is shared across named gcloud configurations.

As a result, client-library calls can continue using the previous ADC user or quota project after the CLI has switched to a new configuration.

## Recognize the mismatch

Typical symptoms include quota or service usage errors that name the wrong project, while `gcloud config get-value project` shows the expected project. A request might also work through gcloud but fail through application code.

Inspect all named configurations and the active configuration:

```bash
gcloud config configurations list
gcloud config list \
  --format='text(core.account,core.project,billing.quota_project)'
gcloud auth list
```

These commands describe gcloud CLI state. They do not show which ADC source an application ultimately selected.

Use code to inspect ADC without printing secrets. In Python:

```python
import google.auth

credentials, project_id = google.auth.default()
print("credential_type:", type(credentials).__name__)
print("detected_project_id:", project_id)
print("quota_project_id:", getattr(credentials, "quota_project_id", None))
```

Also check whether `GOOGLE_APPLICATION_CREDENTIALS` is set:

```bash
if [ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]; then
  echo 'ADC will check GOOGLE_APPLICATION_CREDENTIALS first'
fi
```

ADC checks that environment variable before the well-known local ADC file. If it points to another credential configuration, changing the local file will not affect the running application.

## Why the mismatch persists

The active gcloud configuration and the ADC file are separate state:

- `gcloud config configurations activate` selects a set of gcloud properties.
- `gcloud auth application-default login` writes user credentials to the local ADC file.
- `gcloud auth application-default set-quota-project` changes the quota project stored in the local ADC file.

During an ADC login, gcloud attempts to choose a quota project from `billing/quota_project` and then `core/project`, subject to the caller having the required permission. That selection occurs when the ADC file is written. A later configuration switch does not synchronize it.

The quota project is the project to which request quota and applicable billing are attributed. It is not necessarily the project containing the requested resource, and it does not grant access to that resource.

## Fix the quota project explicitly

Activate the desired configuration, verify its values, and update the shared ADC quota project:

```bash
gcloud config configurations activate CONFIGURATION_NAME

gcloud config list \
  --format='text(core.account,core.project,billing.quota_project)'

gcloud auth application-default set-quota-project QUOTA_PROJECT_ID
```

The identity represented by ADC must have `serviceusage.services.use` on `QUOTA_PROJECT_ID`. The predefined Service Usage Consumer role contains it:

```bash
gcloud projects add-iam-policy-binding QUOTA_PROJECT_ID \
  --member='user:DEVELOPER_EMAIL' \
  --role='roles/serviceusage.serviceUsageConsumer'
```

An administrator should scope this grant according to the organization's access policy. The required API must also be enabled in the quota project.

If the ADC identity itself should change, recreate local ADC after activating and verifying the desired account:

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project QUOTA_PROJECT_ID
```

The login command overwrites the existing local ADC file. Do not manually edit that file because it contains sensitive credential material and its schema is managed by the tooling.

## Use an environment override for per-shell workflows

For client libraries that support it, `GOOGLE_CLOUD_QUOTA_PROJECT` can set a quota project for a process without rewriting the shared ADC file:

```bash
export GOOGLE_CLOUD_QUOTA_PROJECT='QUOTA_PROJECT_ID'
python app.py
```

This can be clearer when two local shells intentionally target different environments. Environment and programmatic quota-project settings have higher precedence than the project stored in credentials. Support can depend on the client library and version, so verify the library's quota-project behavior before standardizing on the override.

Do not confuse `GOOGLE_CLOUD_QUOTA_PROJECT` with `GOOGLE_CLOUD_PROJECT`. The former controls quota attribution; the latter can supply a default resource project to libraries that honor it.

## Validate without leaking a token

Test that ADC can obtain a token while discarding the token value:

```bash
gcloud auth application-default print-access-token >/dev/null
echo 'ADC token creation succeeded'
```

Then make a low-risk application request against the intended resource and verify quota or audit information in the correct project. Token creation alone does not confirm IAM authorization, API enablement, resource selection, or quota attribution.

For repeatable development environments, document all of these values separately:

- The gcloud configuration name.
- The CLI account and default project.
- The ADC identity creation step.
- The ADC or process-level quota project.
- The actual resource project used by the application.

This avoids treating a configuration activation as a universal authentication switch.

## Official Documentation

- [Manage gcloud CLI configurations](https://cloud.google.com/sdk/docs/configurations)
- [Create local Application Default Credentials](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/login)
- [Set the ADC quota project](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/set-quota-project)
- [How Application Default Credentials works](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Set the quota project](https://cloud.google.com/docs/quotas/set-quota-project)
- [Print an ADC access token](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/print-access-token)

## Conclusion

Switching a named gcloud configuration does not switch the shared local ADC file. Diagnose the CLI configuration and ADC independently, then set the ADC quota project explicitly or use a supported per-process override. Keep quota attribution, resource selection, and IAM authorization separate to prevent the mismatch from returning.
