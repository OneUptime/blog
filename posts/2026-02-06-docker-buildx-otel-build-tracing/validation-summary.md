# Validation Summary: How to Configure Docker Buildx OpenTelemetry Support for Build Stage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Buildx
- Docker BuildKit
- OpenTelemetry tracing
- Jaeger
- GitHub Actions
- Dockerfile multi-stage builds
- npm

## Sources Consulted
- Docker Docs: OpenTelemetry support for Buildx/BuildKit, https://docs.docker.com/build/building/opentelemetry/
- Docker Docs: Docker container Buildx driver options, https://docs.docker.com/build/builders/drivers/docker-container/
- Docker Docs: `docker buildx build` CLI reference, https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Docs: `docker buildx history trace` CLI reference, https://docs.docker.com/reference/cli/docker/buildx/history/trace/
- Moby BuildKit README: OpenTelemetry support, https://github.com/moby/buildkit#opentelemetry-support
- GitHub Docs: Workflow syntax for service containers, ports, and volumes, https://docs.github.com/actions/automating-your-workflow-with-github-actions/workflow-syntax-for-github-actions
- npm Docs: `npm ci`, https://docs.npmjs.com/cli/commands/npm-ci/

## Issues Found
- The post originally claimed that setting `OTEL_EXPORTER_OTLP_ENDPOINT` before `docker buildx build` enables BuildKit trace export. Docker's Buildx/BuildKit documentation currently documents Jaeger tracing through `JAEGER_TRACE` passed into the BuildKit daemon environment with `--driver-opt env.JAEGER_TRACE=...`. Updated the setup commands and explanation accordingly.
- The post originally configured an OpenTelemetry Collector OTLP receiver/exporter for BuildKit traces. Replaced that with the Docker-documented Jaeger all-in-one setup using UDP port `6831` for trace collection and port `16686` for the Jaeger UI.
- The GitHub Actions example used a relative bind mount in a service container volume. GitHub Actions service volumes require the source to be a named volume or an absolute host path. Removed the unnecessary Collector config volume and changed the service to Jaeger.
- The GitHub Actions example set OTLP environment variables on the build step, which would not configure the BuildKit daemon used by a `docker-container` builder. Updated it to create and bootstrap a traced Buildx builder with `env.JAEGER_TRACE=localhost:6831`.
- The direct BuildKit example used `OTEL_EXPORTER_OTLP_ENDPOINT`; updated it to use `JAEGER_TRACE` before running `buildctl`.
- The post stated that build traces directly show whether each layer was a cache hit or miss. Adjusted the wording to say traces show operations and timings, while BuildKit plain progress output marks cached steps as `CACHED`.
- The Dockerfile example used `npm ci --production`. Updated it to the current documented `npm ci --omit=dev` form for omitting development dependencies.

## Review Notes
- Docker Buildx now also has `docker buildx history trace` for viewing traces from completed build records. The post remains technically correct after the fixes, but a future update could mention that command as an alternative workflow.
