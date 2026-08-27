# Validation Summary: Pass Local Application Default Credentials into Docker Safely

## Status

validated

## Post Type

Technical tutorial and security guide

## Technologies Covered

- Google Cloud Application Default Credentials (ADC)
- Google Cloud CLI (`gcloud`)
- Docker Engine bind mounts
- Docker Compose
- Python `google-auth`
- Workload Identity Federation and Workforce Identity Federation
- Workload Identity Federation for GKE
- Google Cloud IAM and service accounts

## Sources Consulted

- [Set up ADC for a containerized development environment](https://cloud.google.com/docs/authentication/set-up-adc-containerized-environment)
- [Set up ADC for a local development environment](https://cloud.google.com/docs/authentication/set-up-adc-local-dev-environment)
- [How Application Default Credentials works](https://cloud.google.com/docs/authentication/application-default-credentials)
- [`gcloud auth application-default login` reference](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/login)
- [AIP-4110: Application Default Credentials](https://google.aip.dev/auth/4110)
- [`google.auth.default()` reference](https://googleapis.dev/python/google-auth/latest/reference/google.auth.html#google.auth.default)
- [Current `google.oauth2.credentials.Credentials` source](https://github.com/googleapis/google-cloud-python/blob/main/packages/google-auth/google/oauth2/credentials.py)
- [Current `google.oauth2.service_account.Credentials` source](https://github.com/googleapis/google-cloud-python/blob/main/packages/google-auth/google/oauth2/service_account.py)
- [Current `google.auth.identity_pool.Credentials` source](https://github.com/googleapis/google-cloud-python/blob/main/packages/google-auth/google/auth/identity_pool.py)
- [Quota project overview](https://cloud.google.com/docs/quotas/quota-project)
- [AIP-4117: External Account Credentials](https://google.aip.dev/auth/4117)
- [Configure Workload Identity Federation with other identity providers](https://cloud.google.com/iam/docs/workload-identity-federation-with-other-providers)
- [Identities for workloads](https://cloud.google.com/iam/docs/workload-identities)
- [Docker bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)
- [`docker container run` reference](https://docs.docker.com/reference/cli/docker/container/run/)
- [Docker Compose service volume syntax](https://docs.docker.com/reference/compose-file/services/#volumes)
- [Docker Compose variable interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)
- [Docker Desktop file sharing settings](https://docs.docker.com/desktop/settings-and-maintenance/settings/#file-sharing)
- [Docker build secrets](https://docs.docker.com/build/building/secrets/)
- [Docker build cache backends](https://docs.docker.com/build/cache/backends/)

## Issues Found

- The Python diagnostic printed only `type(credentials).__name__`. Authorized-user, service-account, and identity-pool implementations all use the class name `Credentials`, so that output could not reliably identify which implementation ADC loaded. It now prints the fully qualified module and class name without exposing a token.
- The troubleshooting guidance treated `project_id is None` as always requiring an explicitly configured resource project. A missing discovered project is valid when the client or request identifies its target another way. The guidance now makes explicit configuration conditional on the client or request needing a project and distinguishes that project from quota and billing attribution.
- The production recommendation implied that every Google Cloud runtime supports attaching a service account. It now scopes that advice to supported Google Cloud runtimes.
- The federation guidance said every dependency should be mounted read-only. Executable-sourced configurations can also use an output/cache path that may need narrowly scoped write access. The sentence now applies read-only mounting specifically to input dependencies.

## Review Notes

All remaining commands, flags, paths, configuration fields, lookup-order claims, security guidance, and documentation links were verified against current official Google Cloud, `google-auth`, and Docker documentation. The Docker bind-mount example and Compose interpolation were also smoke-tested with Docker 29.4.3 and Docker Compose v5.1.4, and the `gcloud auth application-default login` syntax was checked with local CLI help.

Docker Compose's short bind-mount syntax creates a directory at a missing source path for backward compatibility. The example is correct when `HOST_ADC` names the existing ADC file; long syntax with `bind.create_host_path: false` would provide stricter failure behavior but is not required for correctness. Executable-sourced external-account credentials additionally require `GOOGLE_EXTERNAL_ACCOUNT_ALLOW_EXECUTABLES=1`; the post correctly directs readers to follow the documented layout for their federation type.
