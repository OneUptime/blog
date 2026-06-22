# Validation Summary: How to Use Docker Socket Binding in CI/CD Pipelines

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine and Docker CLI
- Docker socket binding
- Docker Compose
- Docker socket proxy
- Docker-in-Docker and rootless Docker
- AppArmor/SELinux container confinement
- GitLab CI
- Jenkins Pipeline
- GitHub Actions self-hosted runners
- CircleCI machine executor
- Terraform AWS provider
- Kaniko and Buildah

## Sources Consulted
- Docker Engine security documentation: https://docs.docker.com/engine/security/protect-access/
- Docker rootless mode documentation: https://docs.docker.com/engine/security/rootless/
- Docker Compose file reference, version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker CLI `docker inspect` documentation: https://docs.docker.com/reference/cli/docker/inspect/
- Docker CLI formatting documentation: https://docs.docker.com/engine/cli/formatting/
- Docker Build cache documentation: https://docs.docker.com/build/cache/
- Tecnativa Docker Socket Proxy README: https://github.com/Tecnativa/docker-socket-proxy
- GitLab Docker build and socket binding documentation: https://docs.gitlab.com/ci/docker/using_docker_build/
- Jenkins Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/
- GitHub Actions container job documentation: https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/run-jobs-in-a-container
- CircleCI Ubuntu machine image documentation: https://circleci.com/developer/machine/image/ubuntu-2204
- Terraform AWS `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Kaniko README and caching documentation: https://github.com/GoogleContainerTools/kaniko
- Local Docker CLI help from Docker 29.4.2 for `docker run`, `docker build`, and `docker image prune`

## Issues Found
- Removed obsolete top-level `version: '3.8'` entries from Docker Compose examples. Modern Compose uses the current schema and warns that the top-level `version` property is obsolete.
- Changed the Terraform `aws_instance` example code fence from `yaml` to `hcl` because the snippet is Terraform HCL, not YAML.
- Corrected the Docker socket proxy examples by removing undocumented `PULL=1` and changing `LOG=1` to the documented `LOG_LEVEL=info`.
- Clarified that `POST=1` in Tecnativa Docker Socket Proxy enables write requests for allowed API sections, so enabled sections must be kept narrow.
- Clarified that mounting `/var/run/docker.sock` with `:ro` does not make Docker API operations read-only.
- Corrected the AppArmor/SELinux section to explain that MAC profiles constrain the CI container process but do not filter Docker API operations sent through the socket.
- Updated the `docker:dind-rootless` comment to state that privileged mode is still required when running `docker:dind-rootless` inside Docker, while the daemon itself runs rootless.
- Fixed the Dockerfile label example by adding `ARG BUILD_ID` and `ARG PIPELINE_NAME` before using those values in `LABEL` instructions.
- Revised the complete pipeline example so the builder only uses the build API through the proxy and no longer needs broad container API access for `docker create`, `docker cp`, and `docker rm`.
- Corrected the comparison table entry for Kaniko caching from "BuildKit cache" to "Layer cache".
- Adjusted recommendations for untrusted and multi-tenant CI to avoid implying that privileged Docker-in-Docker is the preferred isolation boundary for those cases.

## Review Notes
The remaining examples are illustrative and assume runners/hosts have the required Docker daemon access, registry credentials, and platform-specific runner configuration. Socket binding remains root-equivalent in practice; a proxy reduces API surface but does not make untrusted builds safe by itself.
