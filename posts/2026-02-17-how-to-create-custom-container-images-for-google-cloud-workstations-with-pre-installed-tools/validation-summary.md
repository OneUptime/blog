# Validation Summary: How to Create Custom Container Images for Google Cloud Workstations with

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Workstations
- Google Cloud SDK (`gcloud`)
- Artifact Registry
- Docker and Dockerfiles
- Cloud Build
- Code OSS for Cloud Workstations
- Go, Node.js, Python, kubectl, Terraform

## Sources Consulted
- Google Cloud Workstations: Customize container images: https://docs.cloud.google.com/workstations/docs/customize-container-images
- Google Cloud Workstations: Preconfigured base images: https://docs.cloud.google.com/workstations/docs/preconfigured-base-images
- Google Cloud SDK reference: `gcloud workstations configs update`: https://docs.cloud.google.com/sdk/gcloud/reference/workstations/configs/update
- Google Cloud SDK reference: `gcloud artifacts repositories create`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Google Cloud Artifact Registry: Push and pull images: https://docs.cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling
- Google Cloud Build configuration file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Docker Docs: Install Docker Engine on Debian: https://docs.docker.com/engine/install/debian/
- Kubernetes Docs: Install and set up kubectl on Linux: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- HashiCorp Terraform releases: https://releases.hashicorp.com/terraform/1.7.0/
- NodeSource distributions documentation: https://github.com/nodesource/distributions

## Issues Found
- The minimal Cloud Workstations base image was listed as `base-image`, but the documented image is `base`. Updated the image path.
- The Dockerfile used `mysql-client`, which is not the portable Debian package name for current Debian-based images. Updated it to `default-mysql-client`.
- The Dockerfile set `EDITOR=vim` but did not install `vim`. Added `vim` to the system package list.
- The Docker CLI installation used an older keyring path and hard-coded Debian `bookworm`. Updated it to use Docker's current `/etc/apt/keyrings/docker.asc` pattern, `dpkg --print-architecture`, and the image's `VERSION_CODENAME`.
- The Code OSS extension install command used `code-oss-cloud-workstations`, but Google documents `/opt/code-oss/bin/codeoss-cloudworkstations`. Replaced the build-time command with a startup script that runs after the Cloud Workstations default user is created.
- The Dockerfile ended with `USER user`, but Cloud Workstations creates the `user` account during container startup and startup scripts are expected to run as root by default. Removed the final `USER user`.
- The post did not mention that private Artifact Registry images must be pullable by the workstation configuration service account. Added a short note after the push commands.
- The Cloud Build snippet comment implied that `machineType` sets the build region. Updated the comment to accurately describe the field as a machine size setting.

## Review Notes
The specific Go, Node.js, and Terraform versions in the example are valid but dated. In a future refresh, consider updating pinned tool versions and pinning extension versions for reproducible image builds.
