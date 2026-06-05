# Validation Summary: How to Fix Docker 'COPY Failed: No Source Files Were Specified' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker
- Dockerfile `COPY` and `ADD`
- Docker BuildKit / `docker build`
- Docker Compose build configuration
- `.dockerignore`
- Multi-stage Docker builds

## Sources Consulted
- Docker Docs: Build context - https://docs.docker.com/build/concepts/context/
- Docker Docs: Dockerfile reference - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Compose Build Specification - https://docs.docker.com/reference/compose-file/build/
- Docker Docs: CopyIgnoredFile build check - https://docs.docker.com/reference/build-checks/copy-ignored-file/
- Local Docker CLI help and behavior checks with Docker Engine 29.4.2, Buildx 0.33.0, and Docker Compose 5.1.3.

## Issues Found
- The post said a `COPY *.conf /etc/app/` instruction fails when no `.conf` files exist. Current Docker/BuildKit behavior can treat that top-level unmatched wildcard as a no-op, so the example was too broad. I changed the example to `COPY config/*.conf /etc/app/`, where a missing or excluded `config/` directory does fail.
- The post said Docker does not follow symlinks when building the context and only includes the symlink itself. Current Docker/BuildKit can copy through symlinks that resolve inside the build context. I changed the section to explain the actual failure case: symlinks pointing outside the build context cannot provide their target to `COPY`.

## Review Notes
Current Docker/BuildKit error messages differ from older legacy-builder wording in some cases, but the troubleshooting guidance remains valid after the fixes above.
