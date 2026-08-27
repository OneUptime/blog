# Why `google.auth.default()` Returns No Google Cloud Project ID

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, Python, Application Default Credentials, google-auth, Authentication

Description: Understand why Python ADC can authenticate successfully without detecting a project, and configure the resource project explicitly and safely.

---

Python's `google.auth.default()` returns two values:

```python
credentials, project_id = google.auth.default()
```

The credential can be valid while `project_id` is `None`. This is expected because credential discovery and project discovery answer different questions. Credentials identify and authenticate a caller. A project ID identifies the default Google Cloud project an application should use for resources.

Not every credential source contains project information. In particular, authorized user credentials created for local development do not contain a resource project ID that `google-auth` can always return.

## Inspect the result safely

Use a diagnostic that does not print tokens or serialize credentials:

```python
import google.auth

credentials, project_id = google.auth.default()

print("credential_type:", type(credentials).__name__)
print("detected_project_id:", project_id)
print("quota_project_id:", getattr(credentials, "quota_project_id", None))
```

If a credential class appears and no exception was raised, ADC found and loaded a recognized credential source. This alone does not prove that the credential can refresh or authenticate an API request. A `None` project is a separate configuration issue.

Do not log the credential object, its refresh token, or an access token. A successful token refresh also does not prove that the identity has permission to access the intended project.

## Why local user ADC often has no resource project

Local ADC is commonly created with:

```bash
gcloud auth application-default login
```

That file primarily carries user authentication material. It can also carry a quota project, but a quota project is not a default resource project. Quota projects attribute request quota and applicable billing. They do not tell an application which bucket, dataset, subscription, or other resource project to use.

ADC searches several sources, including `GOOGLE_APPLICATION_CREDENTIALS`, the well-known local ADC file, and an attached service account on Google Cloud. Some sources or environments expose a project ID and some do not. The `google-auth` API therefore documents the returned project as optional.

The gcloud CLI's `core/project` property is also not a universal application setting. `google.auth.default()` may use Cloud SDK project configuration as one project-detection source, but application behavior should not rely on a developer's mutable gcloud configuration when an explicit project is required.

## Configure the project explicitly

For a deployed application, keep the resource project in application configuration and fail early when it is absent:

```python
import os

import google.auth
from google.cloud import storage

credentials, detected_project = google.auth.default()

project_id = (
    os.environ.get("APP_GOOGLE_CLOUD_PROJECT")
    or detected_project
)

if not project_id:
    raise RuntimeError("APP_GOOGLE_CLOUD_PROJECT must be configured")

client = storage.Client(
    project=project_id,
    credentials=credentials,
)
```

Set the application-specific variable in the runtime configuration:

```bash
export APP_GOOGLE_CLOUD_PROJECT='example-resource-project'
python app.py
```

An application-specific name makes the configuration contract explicit. Google authentication libraries also define `GOOGLE_CLOUD_PROJECT` as an explicit project environment variable:

```bash
export GOOGLE_CLOUD_PROJECT='example-resource-project'
python app.py
```

Whichever approach you choose, pass the project to clients or requests whose behavior depends on it. Avoid silently falling back to a production project when configuration is missing.

## Do not use a quota setting as the fix

These values are deliberately separate:

```bash
export GOOGLE_CLOUD_PROJECT='example-resource-project'
export GOOGLE_CLOUD_QUOTA_PROJECT='example-quota-project'
```

`GOOGLE_CLOUD_PROJECT` can supply a resource project to supported libraries. `GOOGLE_CLOUD_QUOTA_PROJECT` controls quota attribution for supported credentials and requests. Setting the latter does not make the `project_id` return value become the former.

Similarly, passing `quota_project_id` to `google.auth.default()` applies a quota project to credentials when supported. It does not select the resource project returned to the application.

## Check the credential source when results are surprising

ADC evaluates credential sources in a defined order. Check whether an explicit credential path is taking precedence:

```bash
if [ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]; then
  echo 'GOOGLE_APPLICATION_CREDENTIALS is set'
fi
```

On Google Cloud, remove development-only credential path overrides and do not deploy a local ADC file so ADC can use the attached service account. For local development, remember that `gcloud auth application-default login` manages ADC separately from the account selected by `gcloud auth login`.

After setting the project, validate both dimensions independently:

1. Confirm ADC can obtain credentials.
2. Confirm the configured project is the intended resource project.
3. Make a low-risk API call and verify the identity has the required IAM permission.
4. Confirm the relevant API is enabled and the quota project is correct where required.

This prevents a non-null project ID from being mistaken for authorization.

## Official Documentation

- [google.auth.default reference](https://google-auth.readthedocs.io/en/latest/reference/google.auth.html#google.auth.default)
- [google-auth environment variables](https://google-auth.readthedocs.io/en/latest/reference/google.auth.environment_vars.html)
- [How Application Default Credentials works](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Set up ADC for local development](https://cloud.google.com/docs/authentication/set-up-adc-local-dev-environment)
- [Set the quota project](https://cloud.google.com/docs/quotas/set-quota-project)

## Conclusion

`google.auth.default()` can return valid credentials and no project because authentication and resource-project selection are independent. Treat a missing project as normal configuration input, set it explicitly, and keep it separate from the quota project. Then validate IAM access with the discovered identity rather than assuming project detection grants authorization.
