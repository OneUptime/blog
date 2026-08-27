# `gcloud auth login` vs `gcloud auth application-default login`: Which Credentials Does Your Code Use?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, gcloud, Application Default Credentials, Authentication, IAM

Description: Learn why the gcloud CLI and local application code can use different identities, and how to inspect and select each credential source safely.

---

Google Cloud has two local authentication flows whose names look similar but whose consumers are different:

```bash
gcloud auth login
gcloud auth application-default login
```

The first command normally authenticates the `gcloud` CLI. The second creates local Application Default Credentials (ADC) for Google client libraries and other software that implements ADC. Running one does not normally update the credentials managed by the other.

This distinction explains a common debugging puzzle: a `gcloud` command succeeds while an application receives a permission error, or the application acts as a different user than `gcloud` reports.

## What each command changes

`gcloud auth login` obtains user credentials and stores them in the gcloud CLI credential store. It also sets the account as active in the current gcloud configuration unless command options change that behavior. Commands such as these inspect the CLI state:

```bash
gcloud auth list
gcloud config list --format='text(core.account,core.project)'
```

`gcloud auth application-default login` obtains user credentials and writes them to the well-known local ADC file. On Linux and macOS, that file is normally:

```text
$HOME/.config/gcloud/application_default_credentials.json
```

On Windows, it is normally:

```text
%APPDATA%\gcloud\application_default_credentials.json
```

The ADC file can contain a refresh token. Treat it as a secret: do not print it, commit it, copy it into an image, or send it to another person.

The gcloud CLI does not use ADC for its own authentication. Likewise, a Google client library does not generally consult the active account from `gcloud auth list`. The two flows may happen to use the same user, but that is a result of how you logged in, not a shared credential store.

## How application code selects credentials

ADC searches for credentials in this order:

1. The file named by `GOOGLE_APPLICATION_CREDENTIALS`.
2. The local ADC file created by `gcloud auth application-default login`.
3. The attached service account exposed by the metadata server when the workload runs on Google Cloud.

The order is important. If `GOOGLE_APPLICATION_CREDENTIALS` is set, code can ignore both the local ADC file and an attached runtime identity. Check whether the variable is set without printing its target file:

```bash
if [ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]; then
  echo 'GOOGLE_APPLICATION_CREDENTIALS is set'
else
  echo 'GOOGLE_APPLICATION_CREDENTIALS is not set'
fi
```

For Python, this small diagnostic identifies the ADC credential class and detected project without exposing a token:

```python
import google.auth

credentials, project_id = google.auth.default()
print("credential_type:", type(credentials).__name__)
print("project_id:", project_id)
print("quota_project_id:", getattr(credentials, "quota_project_id", None))
```

Do not serialize the credentials object or log access and refresh tokens.

## A reliable local workflow

First, authenticate the CLI account you want administrators' commands to use:

```bash
gcloud auth login
gcloud auth list
```

Then create ADC for local application development:

```bash
gcloud auth application-default login
```

Confirm that ADC can mint an access token without displaying the token in a shared terminal or log:

```bash
gcloud auth application-default print-access-token >/dev/null
echo 'ADC token creation succeeded'
```

This test proves that ADC can obtain a token. It does not prove that the identity has permission to access a particular resource, that an API is enabled, or that the correct quota project is configured.

`gcloud auth login` also has an `--update-adc` option. When deliberately supplied, it writes the obtained credentials to ADC and overwrites a previous local ADC file. Because this couples two otherwise separate actions, use it only when that is the intended outcome and recheck the ADC quota project afterward.

## Understand account, resource project, and quota project

Three values are often conflated:

- The authenticated account identifies the caller.
- The resource project tells an API which resources to read or change.
- The quota project attributes request quota and, where applicable, billing.

Changing `core/project` in a gcloud configuration does not grant permissions and does not automatically rewrite an existing ADC file. Similarly, a quota project does not select a resource project or authorize access to it.

Inspect the relevant gcloud configuration values with:

```bash
gcloud config list \
  --format='text(core.account,core.project,billing.quota_project)'
```

If local ADC needs a different quota project, use the supported command rather than editing the JSON file:

```bash
gcloud auth application-default set-quota-project QUOTA_PROJECT_ID
```

The ADC principal must have the `serviceusage.services.use` permission on that project. The predefined `roles/serviceusage.serviceUsageConsumer` role contains this permission. The relevant API must also be enabled in the quota project.

## Production authentication is different

Local user ADC is intended for development. In production on Google Cloud, prefer an attached user-managed service account and grant it only the required IAM roles. For external workloads, use Workload Identity Federation where supported. Avoid exporting a local ADC file or a service account key into a production container.

Also remove development-only `GOOGLE_APPLICATION_CREDENTIALS` settings from deployed service configuration. Otherwise that variable takes precedence over an attached identity and can make a workload use an unintended credential source.

## Official Documentation

- [Authorize the gcloud CLI](https://cloud.google.com/sdk/gcloud/reference/auth/login)
- [List credentialed gcloud accounts](https://cloud.google.com/sdk/gcloud/reference/auth/list)
- [Create local Application Default Credentials](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/login)
- [How Application Default Credentials works](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Provide credentials to ADC](https://cloud.google.com/docs/authentication/provide-credentials-adc)
- [Set the ADC quota project](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/set-quota-project)
- [Set the quota project](https://cloud.google.com/docs/quotas/set-quota-project)

## Conclusion

Use `gcloud auth login` for the identity used by gcloud CLI commands and `gcloud auth application-default login` for local application ADC. When behavior differs, inspect the two stores separately, check ADC's search order, and distinguish the authenticated identity from the resource and quota projects. That model turns most local Google Cloud credential mismatches into a short, safe diagnostic.
