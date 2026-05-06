# Validation Summary: How to Choose the Right Base Image for Containers in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Official Images
- Distroless container images
- Trivy
- Alpine Linux
- Node.js
- Python

## Sources Consulted
- Docker Docs, Trusted content: https://docs.docker.com/docker-hub/image-library/trusted-content/
- Docker Docs, Base images: https://docs.docker.com/build/building/base-images/
- Portainer Documentation, Images: https://docs.portainer.io/user/docker/images
- Trivy Docs, Container Image: https://trivy.dev/docs/latest/target/container_image/
- Distroless README: https://github.com/GoogleContainerTools/distroless
- Distroless Python requirements example: https://raw.githubusercontent.com/GoogleContainerTools/distroless/main/examples/python3-requirements/Dockerfile
- Node.js Releases: https://nodejs.org/en/about/previous-releases
- Alpine Linux release branches: https://www.alpinelinux.org/releases/

## Issues Found
- The image size table had stale values. I updated the figures to current approximate amd64 image sizes and clarified the column as typical size.
- The table used `distroless` as if it were a concrete image tag. I replaced it with `gcr.io/distroless/base-debian12`, which is an actual published Distroless base image.
- The post referenced `node:20-alpine`, but Node.js 20 reached end-of-life on March 24, 2026. I updated the examples to `node:24-alpine`, which is a current LTS line as of May 6, 2026.
- The post used `alpine:3.19`, which Alpine lists as out of mainstream support after November 1, 2025. I updated the Alpine examples and scan command to `alpine:3.23`.
- The Distroless Python example was broken. It built dependencies with `python:3.12`, then copied `/root/.local/lib` into `gcr.io/distroless/python3-debian12`, whose runtime Python is 3.11 and whose default `sys.path` does not include `/root/.local/lib`. I replaced it with the Distroless project's documented virtualenv-based pattern using a Debian 12 build stage and an explicit venv Python entrypoint.
- The "Security Scanning in Portainer" steps claimed a current Portainer image-level **Scan** action that is not present in the current Portainer Images documentation. I corrected the section to use Portainer for identifying the deployed image and Trivy for the actual scan workflow.
- The summary said `ubuntu:latest` and `debian:latest` are "large and change frequently". I tightened that statement to focus on the technically accurate concerns: they are larger than slim or Alpine variants, and `latest` is mutable over time.

## Review Notes
- The `trivy image ...` commands are valid per current Trivy documentation.
- The `scratch` description is technically correct, but readers should remember that `scratch` is a reserved minimal base used in `FROM` and is only suitable for binaries with no runtime dependencies.
- The multi-example `Dockerfile` block under "Size vs. Functionality Trade-off" is illustrative rather than a single buildable Dockerfile, which is acceptable in this context.
