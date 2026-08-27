# How to Pass Local Google Application Default Credentials into Docker Without Baking In a Key

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, Docker, Application Default Credentials, Containers, Security

Description: Mount local Google ADC into a development container as a read-only file while keeping credentials out of images, layers, and source control.

---

A local application can use credentials created by:

```bash
gcloud auth application-default login
```

Moving the same application into Docker changes its filesystem. The container cannot see the host's Application Default Credentials (ADC) file unless you expose it deliberately. Copying that file into a Docker image is unsafe because credentials can remain in image layers, registries, caches, and build logs.

For local development, bind-mount the ADC file read-only at runtime and point `GOOGLE_APPLICATION_CREDENTIALS` to the container path.

## Create and locate local ADC

Create local user ADC on the host:

```bash
gcloud auth application-default login
```

On Linux and macOS, the well-known file is normally:

```bash
HOST_ADC="${HOME}/.config/gcloud/application_default_credentials.json"
test -r "${HOST_ADC}"
```

On Windows, the well-known location is `%APPDATA%\gcloud\application_default_credentials.json`. Adapt the host path and Docker shell syntax to the terminal in use.

The file can contain a refresh token. Restrict access to the developer account and never print or commit its contents.

## Bind-mount the file into a container

Choose a fixed path inside the container and mount only the ADC file:

```bash
IMAGE='example/app:dev'
HOST_ADC="${HOME}/.config/gcloud/application_default_credentials.json"

test -r "${HOST_ADC}"

docker run --rm \
  --mount "type=bind,src=${HOST_ADC},dst=/var/run/google/adc.json,readonly" \
  --env GOOGLE_APPLICATION_CREDENTIALS=/var/run/google/adc.json \
  "${IMAGE}"
```

ADC checks `GOOGLE_APPLICATION_CREDENTIALS` first, so a supported Google authentication library in the container reads `/var/run/google/adc.json`. The host credential does not become part of the image.

Mount the single file instead of the entire `~/.config/gcloud` directory. The broader directory can contain other CLI accounts, configuration, logs, and credentials that the application does not need.

On Docker Desktop, the host directory may need to be allowed by file-sharing settings. File ownership and permission mapping can also prevent a non-root container user from reading the mount. Fix host sharing and least-privilege read access rather than making the credential world-readable.

## Use Docker Compose

Place non-secret paths in environment variables rather than embedding machine-specific home directories in a shared Compose file:

```bash
export IMAGE='example/app:dev'
export HOST_ADC="${HOME}/.config/gcloud/application_default_credentials.json"
docker compose up
```

A Compose service can then mount the file read-only:

```yaml
services:
  app:
    image: ${IMAGE}
    environment:
      GOOGLE_APPLICATION_CREDENTIALS: /var/run/google/adc.json
    volumes:
      - ${HOST_ADC}:/var/run/google/adc.json:ro
```

Do not put the credential JSON itself in `.env`, Compose YAML, Docker secrets committed to the repository, a build argument, or an `ENV` instruction.

## Verify ADC without exposing a token

For a Python image with `google-auth` installed, use this diagnostic:

```python
import google.auth

credentials, project_id = google.auth.default()
print("credential_type:", type(credentials).__name__)
print("project_id:", project_id)
print("quota_project_id:", getattr(credentials, "quota_project_id", None))
```

This confirms which credential class ADC found and whether it detected a project. It does not expose a token. Follow it with a low-risk API call against the intended project to validate IAM and API enablement.

If no credential is found, check inside the container without printing the file:

```bash
test -r /var/run/google/adc.json
test "${GOOGLE_APPLICATION_CREDENTIALS:-}" = /var/run/google/adc.json
```

If the credential is found but the project is `None`, configure the resource project explicitly in the application. A quota project in ADC is not the same as an application's default resource project.

## Handle federated credential configurations carefully

An external account credential configuration can reference another file or an executable that supplies a subject token. Mounting only the top-level JSON is insufficient if its referenced dependency is absent or appears at a different path inside the container.

Use the documented federation layout for that credential type, mount every required dependency read-only, and keep the paths in the configuration consistent with container paths. Do not expand access to the entire host home directory as a shortcut.

## Keep this pattern out of production

This bind-mount pattern is for a trusted developer's local machine. It gives the container access equivalent to the local ADC identity for as long as the mount and refresh credential are usable.

For production workloads:

- On Google Cloud, attach a user-managed service account to the runtime and grant it minimum IAM roles.
- On GKE, use Workload Identity Federation for GKE.
- Outside Google Cloud, use Workload Identity Federation where supported.
- Avoid long-lived service account keys.

Do not deploy `GOOGLE_APPLICATION_CREDENTIALS=/var/run/google/adc.json` in production service configuration. ADC checks that variable before an attached service account, so a stale development setting can override the intended runtime identity.

Use `--rm` for one-off development containers, stop containers when testing is complete, and review whether container processes or debugging tools can read mounted credentials.

## Official Documentation

- [Set up ADC for a containerized development environment](https://cloud.google.com/docs/authentication/set-up-adc-containerized-environment)
- [Set up ADC for a local development environment](https://cloud.google.com/docs/authentication/set-up-adc-local-dev-environment)
- [How Application Default Credentials works](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Create local Application Default Credentials](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/login)
- [Authentication methods at Google](https://cloud.google.com/docs/authentication)

## Conclusion

Pass local ADC to a development container with a read-only runtime bind mount and an explicit `GOOGLE_APPLICATION_CREDENTIALS` path. Keep the credential out of the Dockerfile, image, registry, and repository. In production, replace the mount with an attached identity or workload federation so no developer credential crosses the deployment boundary.
