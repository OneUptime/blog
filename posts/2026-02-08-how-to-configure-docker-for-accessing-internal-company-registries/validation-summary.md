# Validation Summary: How to Configure Docker for Accessing Internal Company Registries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker Engine daemon configuration
- Docker credential helpers
- Docker registry TLS certificates
- Docker registry mirrors
- Docker Compose
- AWS ECR
- GitHub Actions
- GitLab CI/CD
- Docker Desktop
- Kubernetes image pull secrets

## Sources Consulted
- Docker CLI `docker login` documentation: https://docs.docker.com/reference/cli/docker/login/
- Docker Engine certificate documentation: https://docs.docker.com/engine/security/certificates/
- Docker Engine `dockerd` reference for insecure registries: https://docs.docker.com/reference/cli/dockerd/
- Docker Hub registry mirror documentation: https://docs.docker.com/docker-hub/image-library/mirror/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Desktop settings documentation: https://docs.docker.com/desktop/settings-and-maintenance/settings/
- Docker Desktop certificate FAQ for macOS/Windows behavior: https://docs.docker.com/desktop/troubleshoot-and-support/faqs/macfaqs/ and https://docs.docker.com/desktop/troubleshoot-and-support/faqs/windowsfaqs/
- GitLab Container Registry authentication documentation: https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Amazon ECR Docker Credential Helper documentation: https://github.com/awslabs/amazon-ecr-credential-helper

## Issues Found
- The credential storage section stated that `docker login` always saves credentials in `~/.docker/config.json`. Docker stores credentials in the configured credential store when one is available, and only falls back to base64-encoded credentials in `config.json` when no store/helper is configured. Updated the wording and clarified that the value is base64 of `username:password`, not encryption.
- The TLS section said no Docker restart is needed after adding certificates. Docker Desktop requires a restart after keychain or `~/.docker/certs.d` changes. Updated the wording to distinguish Docker Desktop from Linux Docker Engine hosts.
- The insecure registry section said Docker skips TLS verification entirely. Docker's insecure registry mode allows plain HTTP and/or HTTPS with an untrusted CA. Updated the explanation to match Docker's terminology.
- The registry mirror section described mirrors as caching Docker Hub or other public registries. Docker's daemon registry mirror support is for Docker Hub pull-through cache behavior. Updated the wording to scope it to Docker Hub.
- The Compose example used a top-level `version: "3.8"` field. Current Docker Compose uses the Compose Specification and no longer requires the legacy version field, so the example was updated to omit it.
- The GitLab CI example used `docker login -p`, which conflicts with Docker and GitLab recommendations to use `--password-stdin`. Updated the command to pipe `$CI_REGISTRY_PASSWORD` into `docker login --password-stdin`.

## Review Notes
The examples are intentionally generic and use placeholder registry names, users, and secrets. In production, teams should prefer scoped tokens, short-lived cloud credentials, and organization-specific certificate distribution processes.
