# Validation Summary: How to Fix `docker-credential-gcloud Not in System PATH` for Artifact Registry

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud Artifact Registry
- Google Cloud CLI (`gcloud`)
- Docker CLI and Docker credential helpers
- `docker-credential-gcloud`
- `docker-credential-gcr`
- Application Default Credentials (ADC)
- Google Cloud IAM
- POSIX shell and `jq`

## Sources Consulted
- [Authenticate Docker to Artifact Registry](https://cloud.google.com/artifact-registry/docs/docker/authentication)
- [`gcloud auth configure-docker` reference](https://cloud.google.com/sdk/gcloud/reference/auth/configure-docker)
- [Google Cloud CLI installation guide](https://cloud.google.com/sdk/docs/install)
- [Artifact Registry repository and image names](https://cloud.google.com/artifact-registry/docs/docker/names)
- [Push and pull Artifact Registry images](https://cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling)
- [Troubleshoot Artifact Registry container image issues](https://cloud.google.com/artifact-registry/docs/docker/troubleshoot)
- [Docker CLI configuration](https://docs.docker.com/reference/cli/docker/)
- [Docker login and credential-helper configuration](https://docs.docker.com/reference/cli/docker/login/)
- [Docker Engine Linux post-installation guidance](https://docs.docker.com/engine/install/linux-postinstall/)
- [Official `docker-credential-gcr` repository](https://github.com/GoogleCloudPlatform/docker-credential-gcr)
- [Google Cloud workload identities](https://cloud.google.com/iam/docs/workload-identities)
- [Best practices for using service accounts securely](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [POSIX `command` utility specification](https://pubs.opengroup.org/onlinepubs/9799919799.2024edition/utilities/command.html)

## Issues Found
- The original Docker configuration diagnostic printed only `HOME` and ran `docker info`, which did not identify a configuration selected through `DOCKER_CONFIG`. It now prints the computed `config.json` path, and the explanation documents that Docker's global `--config` option takes precedence for that invocation.
- The original text said every `command -v` check should resolve to an executable file, but `command -v` can also resolve shell aliases and functions. The text now distinguishes general command availability from Docker's requirement that `docker-credential-gcloud` be an external executable discoverable on `PATH`.
- The original PATH guidance did not cover Docker installed through Snap. Google documents that the Docker snap does not expose a credential-helper interface, so the post now explains that a PATH change cannot fix that installation and that a Docker installation supporting external helpers is required.
- The `sudo` and standalone-helper examples passed `LOCATION-docker.pkg.dev` literally. They now use the concrete `us-west1-docker.pkg.dev` hostname used throughout the post, so the examples can be run as written.

## Review Notes
- The `credHelpers` format, helper executable naming, exact-host matching, `gcloud auth configure-docker` syntax, `docker-credential-gcr --registries` syntax, Artifact Registry image format, `sudo` behavior, and `roles/artifactregistry.writer` guidance are current and correct.
- Google currently documents credential-helper support for Docker 18.03 or later. The post does not otherwise depend on a specific Docker or Google Cloud CLI version.
- The optional configuration-inspection command requires `jq` to be installed.
