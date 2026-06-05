# Validation Summary: How to Troubleshoot OpenTelemetry with Alpine Linux Docker Images

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry
- Docker and Dockerfiles
- Alpine Linux
- musl libc and glibc compatibility
- Python `grpcio`
- Node.js gRPC packages
- Kubernetes DNS
- TLS CA certificates

## Sources Consulted
- gRPC Python documentation: https://grpc.io/docs/languages/python/quickstart/
- PyPI `grpcio` package metadata and wheel availability: https://pypi.org/project/grpcio/
- gRPC Node repository and package comparison: https://github.com/grpc/grpc-node
- `@grpc/grpc-js` npm package documentation: https://www.npmjs.com/package/@grpc/grpc-js
- OpenTelemetry JavaScript exporter documentation: https://opentelemetry.io/docs/languages/js/exporters/
- `@opentelemetry/exporter-trace-otlp-grpc` npm package documentation: https://www.npmjs.com/package/@opentelemetry/exporter-trace-otlp-grpc
- Dockerfile reference, including `CMD` and `HEALTHCHECK`: https://docs.docker.com/reference/builder
- Official Python Docker Alpine Dockerfile: https://github.com/docker-library/python/blob/master/3.12/alpine3.23/Dockerfile
- musl libc functional differences from glibc: https://wiki.musl-libc.org/functional-differences-from-glibc.html
- Alpine `gcompat` package metadata: https://pkgs.alpinelinux.org/package/edge/main/x86_64/gcompat

## Issues Found
- The post claimed `grpcio` must be compiled on Alpine. Current `grpcio` releases provide musllinux wheels for common Python and CPU architecture combinations, so I changed the wording to explain that source builds happen only when a compatible wheel is unavailable or intentionally bypassed.
- The post described `gcc`, `g++`, `musl-dev`, and `linux-headers` as always required for Alpine `grpcio` installs. I narrowed that to source-build scenarios and noted that additional development packages such as `openssl-dev` and `libffi-dev` can be needed depending on the dependency set.
- The Node dependency example used older OpenTelemetry and `@grpc/grpc-js` package versions. I updated the example versions to the current published package versions checked during review.
- The CA certificate section implied `python:3.12-alpine` lacks `ca-certificates` by default. The official Python Alpine Dockerfile installs `ca-certificates`, so I clarified that the issue applies to plain/minimal Alpine images or custom runtime stages where the package is missing.
- The DNS section suggested `libc6-compat` as an alternative fix for resolver behavior. Glibc compatibility packages do not replace musl's resolver semantics, so I replaced that with a note that explicit service names are the correct DNS workaround and `gcompat` is only relevant for some glibc-linked binaries.
- The timezone section implied official `python:3.12-alpine` lacks `tzdata` and that missing timezone data causes span timestamp issues. The official image already installs `tzdata`, and OpenTelemetry span timestamps are not fixed by timezone packages, so I changed the wording to application-local time handling in minimal Alpine images.
- The complete Dockerfile template installed `libc6-compat`; for current Alpine-based images, `gcompat` is the more appropriate glibc compatibility package, so I updated the package name.

## Review Notes
The Dockerfile snippets are syntactically valid. The multi-stage build examples are reasonable, but real production images may still need additional runtime shared libraries depending on the exact Python packages installed.
