# Validation Summary: How to Use RUN --mount=type=cache for Package Manager Caching

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfile
- BuildKit
- Docker Buildx
- GitHub Actions
- apt
- pip
- npm
- Yarn
- Go modules and Go build cache
- Maven
- Gradle
- Alpine apk

## Sources Consulted
- Docker Dockerfile reference for `RUN --mount=type=cache`, cache mount options, and apt cache examples: https://docs.docker.com/reference/dockerfile/
- Docker build cache optimization guide: https://docs.docker.com/build/cache/optimize/
- Docker GitHub Actions cache documentation: https://docs.docker.com/build/ci/github-actions/cache/
- Docker GitHub Actions cache backend documentation: https://docs.docker.com/build/cache/backends/gha/
- npm `npm ci` documentation: https://docs.npmjs.com/cli/commands/npm-ci/
- Node.js release schedule: https://github.com/nodejs/release
- Node Docker Official Image documentation: https://hub.docker.com/_/node
- Go module reference: https://go.dev/ref/mod
- Go release notes and release history: https://go.dev/doc/go1.26 and https://go.dev/doc/devel/release
- Maven repository configuration documentation: https://maven.apache.org/maven2/guides/mini/guide-configuring-maven.html
- Gradle-managed directories documentation: https://docs.gradle.org/current/userguide/directory_layout.html
- Gradle dependency caching documentation: https://docs.gradle.org/current/userguide/dependency_caching.html
- Alpine Linux release branches: https://www.alpinelinux.org/releases/
- Alpine Linux local APK cache documentation: https://wiki.alpinelinux.org/wiki/Local_APK_cache

## Issues Found
- The apt examples omitted Docker's documented apt cache setup. Debian and Ubuntu images remove downloaded package archives through Docker-specific apt cleanup configuration, so the `.deb` cache may not persist as described. Added the `docker-clean` removal and `Keep-Downloaded-Packages` configuration before apt cache mounts.
- The apt examples used cache mounts without `sharing=locked`. Docker documents that apt needs exclusive access to its cache data. Added `sharing=locked` to apt cache mounts and noted why it matters.
- The apt package-list cache mounted only `/var/lib/apt/lists`. Updated the explanation and example to cache `/var/lib/apt`, matching Docker's documented pattern for apt package state.
- The npm example used `npm ci --production`. Replaced it with the current `npm ci --omit=dev` form from npm documentation.
- Several base image tags were outdated as of 2026-06-04. Updated `node:20-alpine` to `node:24-alpine`, `golang:1.22-alpine` to `golang:1.26-alpine`, and `alpine:3.19` to `alpine:3.23`.
- The GitHub Actions example used older Docker action versions. Updated `docker/setup-buildx-action` from `v3` to `v4` and `docker/build-push-action` from `v5` to `v7`.
- The CI/CD section incorrectly stated that `type=gha` preserves cache mount contents by default. Docker documents that GitHub Actions cache does not preserve BuildKit cache mounts by default. Updated the text to distinguish layer cache export from cache mount directory persistence and mentioned `reproducible-containers/buildkit-cache-dance` as the documented workaround.

## Review Notes
- The remaining package manager cache paths and Dockerfile syntax are consistent with official documentation for root-based build steps. If examples are adapted to run package managers as non-root users, the cache mount target should move to that user's cache directory.
