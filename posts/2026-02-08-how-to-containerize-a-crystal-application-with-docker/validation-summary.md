# Validation Summary: How to Containerize a Crystal Application with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crystal
- Shards
- Kemal
- Docker
- Docker multi-stage builds
- Docker BuildKit cache mounts
- Docker Compose
- Alpine Linux
- musl static linking

## Sources Consulted
- Crystal releases: https://crystal-lang.org/releases/
- Crystal compiler manual: https://crystal-lang.org/reference/latest/man/crystal/index.html
- Crystal static linking guide: https://crystal-lang.org/reference/latest/guides/static_linking.html
- Crystal Shards command reference: https://crystal-lang.org/reference/latest/the_shards_command/index.html
- Kemal official site: https://kemalcr.com/
- Kemal guide: https://kemalcr.com/guide/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Alpine Linux release branches: https://www.alpinelinux.org/releases/

## Issues Found
- The project setup commands did not create the `src/` directory before asking readers to create `src/server.cr`. Added `mkdir -p src`.
- The examples used old Crystal `1.10.1` and Alpine `3.19` image tags. Updated examples to Crystal `1.20.2` and Alpine `3.22`, matching currently released/supported versions.
- The Kemal dependency was pinned to the older `~> 1.4.0` series while the official Kemal site lists `v1.11.0` as current. Updated the shard constraint to `~> 1.11.0` and the Crystal requirement to `>= 1.20.0`.
- The `/compute` endpoint used `primes.last`, which raises when `limit` is less than `2`. Changed it to `primes.last?` so the JSON response can represent no largest prime as `null`.
- Docker build commands wrote to `bin/server` without ensuring the `bin/` directory exists. Added `mkdir -p bin &&` before each build command that outputs to `bin/server`.
- The `.dockerignore` snippet excluded `shard.lock`, which conflicts with the Dockerfiles' `COPY shard.yml shard.lock* ./` pattern and prevents reproducible locked dependency installs. Removed `shard.lock` from `.dockerignore`.
- The BuildKit cache example used `RUN --mount=type=cache` without a Dockerfile syntax directive. Added `# syntax=docker/dockerfile:1`.
- The Compose example used the obsolete top-level `version: "3.8"` field. Removed it to align with the current Compose Specification.
- The development Dockerfile claimed sentry/sentinel-style auto-rebuild behavior but only ran `crystal run src/server.cr`. Reworded the section and comments to describe quick iteration without auto-rebuild.
- The startup timing command overrode the container command with `/server --help`, which is only valid for one of the later image layouts and does not represent starting the web service. Replaced it with a detached `docker run` command that starts the image and gives `docker stats` a named running container.

## Review Notes
- I verified the current `crystallang/crystal:1.20.2` and `crystallang/crystal:1.20.2-alpine` image tags with Docker and confirmed `crystal build` still supports `--release`, `--static`, `--no-debug`, and `-o`.
- A full temporary Docker build of the sample app was not run because the host filesystem was full during validation. The edited snippets were checked against official documentation and Docker/Crystal CLI output.
