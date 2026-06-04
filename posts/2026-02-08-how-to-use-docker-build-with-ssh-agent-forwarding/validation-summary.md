# Validation Summary: How to Use Docker Build with SSH Agent Forwarding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker BuildKit
- Docker Buildx
- Dockerfile SSH mounts
- Docker Compose build configuration
- Docker Bake HCL configuration
- SSH agent and OpenSSH client tools
- Git over SSH
- npm git dependencies
- pip VCS requirements
- GitHub Actions
- GitLab CI/CD

## Sources Consulted
- Docker Build secrets and SSH mounts: https://docs.docker.com/build/building/secrets/
- Dockerfile `RUN --mount` reference: https://docs.docker.com/reference/builder
- Docker Buildx `build --ssh` CLI reference: https://docs.docker.com/engine/reference/commandline/build
- Docker Compose build `ssh` reference: https://docs.docker.com/reference/compose-file/build/
- Docker Compose `version` top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Bake file reference: https://docs.docker.com/build/bake/reference/
- Docker Buildx Bake CLI reference: https://docs.docker.com/reference/cli/docker/buildx/bake/
- Docker Build GitHub Actions documentation: https://docs.docker.com/build/ci/github-actions/
- GitLab Docker-in-Docker documentation: https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab SSH keys in CI/CD documentation: https://docs.gitlab.com/ci/jobs/ssh_keys/
- npm package.json git URL dependencies reference: local `npm help package-json`
- pip VCS support documentation: https://pip.pypa.io/en/stable/topics/vcs-support/
- OpenSSH manual index for `ssh-agent`, `ssh-add`, and `ssh-keyscan`: https://www.openssh.org/manual.html

## Issues Found
- The first Dockerfile comment said `ssh-keyscan` configures SSH to skip host key verification. Changed it to say it pre-populates host keys, because `ssh-keyscan` gathers host public keys for `known_hosts`; it does not disable verification.
- The Compose example used the obsolete top-level `version: "3.8"` field. Removed it so the snippet follows the current Compose Specification.
- The named SSH section described all named `--ssh` entries as agents, but Docker's `--ssh` option accepts an ID mapped to either an SSH agent socket or a key file. Renamed the section and wording to "SSH identities" and "mount IDs."
- The GitLab CI example used `docker:latest` and `docker:dind`. Changed those to pinned Docker image tags, matching GitLab's guidance to avoid unpinned `latest` images in Docker-in-Docker examples.
- The GitLab CI example used `ssh-agent` without ensuring the OpenSSH client package was installed. Added `apk add --no-cache openssh-client` before starting the agent.
- The troubleshooting section connected `ssh-keyscan` to "Could not resolve host" errors. Changed the label to "Host key verification failed" because missing `known_hosts` entries cause host key verification failures, while "Could not resolve host" is a DNS or URL issue.

## Review Notes
The main BuildKit SSH mount pattern, `docker buildx build --ssh default`, Dockerfile `RUN --mount=type=ssh`, Compose `build.ssh`, Bake `ssh`, npm git dependencies, and pip VCS requirements are technically correct. The examples remain illustrative and use placeholder image names and repository names; real CI pipelines still need registry authentication and runner configuration appropriate to the environment.
