# Validation Summary: How to Build Docker Images with BuildKit Secrets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker BuildKit
- Dockerfile secret mounts
- Dockerfile SSH mounts
- Docker Compose build secrets
- npm
- pip
- Trivy

## Sources Consulted
- Docker Docs: Build secrets - https://docs.docker.com/build/building/secrets/
- Docker Docs: Dockerfile reference, RUN --mount=type=secret and RUN --mount=type=ssh - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Compose Build Specification, build secrets and ssh - https://docs.docker.com/reference/compose-file/build/
- Docker Docs: Compose file secrets reference - https://docs.docker.com/reference/compose-file/secrets/
- Docker Docs: SecretsUsedInArgOrEnv build check - https://docs.docker.com/reference/build-checks/secrets-used-in-arg-or-env/
- Local Docker CLI help: `docker build --help`
- Local Docker Compose CLI help: `docker compose build --help`
- Local Docker Compose config validation with build secrets and top-level `environment` secret source.

## Issues Found
- The post said build arguments always bake secrets into image layers. Docker's official guidance is more precise: build arguments and environment variables are inappropriate for secrets because they can persist in image metadata, history, provenance, or layers depending on how they are used. Updated the wording and diagram to avoid the incorrect absolute claim.
- The post said BuildKit secrets are never persisted in the final image. The mount itself is ephemeral, but a build command can still copy the secret into the filesystem. Updated the wording to clarify that secrets are not persisted unless the build command explicitly writes them there.
- The Python multiple-secrets example mounted a PyPI token but did not consume it. Updated the `RUN` instruction to use the token through `PIP_EXTRA_INDEX_URL` for the `pip install` command.
- The post said `# syntax=docker/dockerfile:1.4` gives access to the latest BuildKit features. Version `1.4` is not the latest Dockerfile frontend. Updated the wording to say it supports the BuildKit features used in the post.
- The layer inspection command listed archive entries while excluding `layer.tar`, which did not actually inspect layer file names. Replaced it with commands that extract the saved image and inspect layer tar contents for suspicious secret-related file names.

## Review Notes
- The Docker Compose example uses `file: ~/.npmrc`; local `docker compose config` expanded this to the user's home directory successfully.
- The examples intentionally use placeholder registry and repository values, so they require project-specific package files, registry URLs, and credentials to run unchanged.
