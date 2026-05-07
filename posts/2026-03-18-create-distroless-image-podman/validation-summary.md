# Validation Summary: How to Create a Distroless Image with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Distroless container images
- Containerfile / Dockerfile multi-stage builds
- Go
- Java
- Node.js
- Python
- Rust
- Trivy

## Sources Consulted
- GoogleContainerTools distroless README: https://github.com/GoogleContainerTools/distroless
- Distroless Java image documentation: https://github.com/GoogleContainerTools/distroless/blob/main/java/README.md
- Distroless Node.js image documentation: https://github.com/GoogleContainerTools/distroless/blob/main/nodejs/README.md
- Distroless Python image documentation: https://github.com/GoogleContainerTools/distroless/blob/main/python3/README.md
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman build documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Dockerfile reference: https://docs.docker.com/reference/builder
- Go release history and support policy: https://go.dev/doc/devel/release
- Docker Official Image documentation for Go: https://hub.docker.com/_/golang
- Docker Official Image documentation for Node.js: https://hub.docker.com/_/node
- Docker Official Image documentation for Rust: https://hub.docker.com/_/rust
- Trivy container image scanning documentation: https://trivy.dev/docs/latest/guide/target/container_image/

## Issues Found
- The post described distroless images as stripping away the operating system. Distroless images are still Linux container images and may be Debian-based; they remove package managers, shells, and standard distribution utilities. Updated the wording to say they strip away traditional Linux distribution contents or the traditional distribution layer.
- The post listed and used `java21-debian12` and `nodejs22-debian12`, but current distroless documentation lists Java and Node.js language images under Debian 13. Updated Java, Node.js, Python, static, base, debug, and scan examples to Debian 13 variants.
- The Java example used `ENTRYPOINT ["java", "-jar", "/app.jar"]`. Distroless Java images document a default entrypoint equivalent to `java -jar` and expect the JAR path in `CMD`. Changed it to `CMD ["/app.jar"]`.
- The Python example used `ENTRYPOINT ["python3", "/app/main.py"]`. Distroless Python images document a default Python entrypoint and expect the script path in `CMD`. Changed it to `CMD ["/app/main.py"]`.
- The Python builder used Python 3.12 with `python3-debian12`; current `python3-debian13` uses Python 3.13. Updated the builder image to `python:3.13-slim` and the runtime to `gcr.io/distroless/python3-debian13:nonroot`.
- The Node.js builder and Trivy comparison command used Node.js 20 while the distroless runtime was Node.js 22. Updated them to Node.js 22 so native dependencies, runtime behavior, and scan comparisons align.
- The Go examples used `golang:1.22-alpine`, which is outside the currently supported Go release window. Updated the examples to `golang:1.26-alpine`.
- The Rust example used `rust:1.77-slim`, which is outdated compared with current official Rust image tags. Updated it to `rust:1.94-slim-trixie`.
- The debug image command used `/busybox/sh`; current distroless documentation shows launching debug images with `--entrypoint=sh`. Updated the command accordingly.

## Review Notes
Podman was not installed in the local workspace, so CLI validation was performed against official Podman documentation rather than local `--help` output. The examples are still generic templates and assume project-specific artifact names such as `/app/target/app.jar`, `./cmd/server`, `server.js`, `/app/main.py`, and `myapp` match the reader's project.
