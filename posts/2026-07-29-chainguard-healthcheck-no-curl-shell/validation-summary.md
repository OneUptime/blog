# Validation Summary: Health Checks for Chainguard Images Without curl, wget, or a Shell

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Chainguard Containers and the `static` base image
- Distroless container images
- Dockerfile `HEALTHCHECK`
- Docker Compose health checks
- Kubernetes startup, readiness, liveness, HTTP, TCP, and gRPC probes
- Python `urllib.request`
- Docker CLI inspection and Go-template formatting

## Sources Consulted

- [Dockerfile `HEALTHCHECK` reference](https://docs.docker.com/reference/dockerfile/#healthcheck)
- [Docker Compose `healthcheck` reference](https://docs.docker.com/reference/compose-file/services/#healthcheck)
- [Docker `inspect` CLI reference](https://docs.docker.com/reference/cli/docker/inspect/)
- [Kubernetes liveness, readiness, and startup probe concepts](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [Kubernetes probe configuration guide](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Chainguard container variants](https://edu.chainguard.dev/chainguard/chainguard-images/about/differences-development-production/)
- [Chainguard `static` image overview](https://images.chainguard.dev/directory/image/static/overview)
- [Chainguard `static` image specifications](https://images.chainguard.dev/directory/image/static/specifications)
- [Python `urllib.request` documentation](https://docs.python.org/3/library/urllib.request.html)
- [gRPC health checking protocol](https://github.com/grpc/grpc/blob/master/doc/health-checking.md)

## Issues Found

No technical issues found.

## Review Notes

- The Kubernetes Deployment manifest uses current `apps/v1` fields, valid named HTTP probe ports, and correct startup, readiness, and liveness probe semantics.
- Kubernetes gRPC probes are stable as of Kubernetes 1.27. The post does not depend on a newer or deprecated probe API.
- The Dockerfile uses the documented exec-array form for `HEALTHCHECK`. The `static` image currently has no shell, runs as UID/GID 65532, and is intended for fully static binaries.
- The Compose list-form `CMD` test avoids `/bin/sh`; Compose string-form tests and `CMD-SHELL` use the container's default shell as stated.
- The Python example invokes `urllib.request.urlopen()` without a shell, supplies a request timeout, and exits nonzero when an uncaught HTTP or connection error occurs.
- The `sha256:REPLACE_ME` values are clearly placeholders and must be replaced with a valid image digest before deployment.
- The documented URLs resolve to the intended official resources. The public `cgr.dev/chainguard/static:latest` image reference was also confirmed to be available for Linux AMD64 and ARM64.
