# Validation Summary: How to Optimize Containerfile Layer Ordering for Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containerfile/Dockerfile syntax
- Container image layer caching
- Node.js and npm
- Ubuntu apt package installation
- Alpine Linux apk package installation
- Python and pip
- Go multi-stage container builds

## Sources Consulted
- Podman `podman build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Containerfile manual page: https://www.mankier.com/5/Containerfile
- Podman `.containerignore` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html#containerignore-dockerignore
- Node.js release schedule: https://nodejs.org/en/about/previous-releases
- Node official Docker image supported tags: https://hub.docker.com/_/node
- NodeSource setup script documentation: https://docs.nodesource.com/docs/nsolid/quickstart/local/
- Go official Docker image supported tags: https://hub.docker.com/_/golang
- Python official Docker image supported tags: https://hub.docker.com/_/python
- Go release policy and release history: https://go.dev/doc/devel/release
- Alpine Linux release branches: https://alpinelinux.org/releases/

## Issues Found
- The Node.js examples used `node:20-alpine` and the NodeSource `setup_20.x` script. Node.js 20 is EOL as of the review date, while Node.js 24 is LTS. Updated these examples to `node:24-alpine` and `setup_24.x`.
- The ARG/ENV example used `FROM alpine:3.19` but later ran `pip install` and `python` without installing Python or pip. Updated the base image to `python:3.12-alpine`, which provides the Python runtime while preserving the Alpine `apk` example.
- The Go multi-stage example used `golang:1.22-alpine`. Go supports each major release until two newer major releases exist, and Go 1.26 is current as of the review date. Updated the builder image to `golang:1.26-alpine`.
- The runtime image in the Go example used `alpine:3.19`, whose standard support ended on 2025-11-01. Updated it to `alpine:3.23`.

## Review Notes
- The local environment did not have `podman` installed, so `podman build --help` and live cache-output checks could not be run locally. CLI behavior and `.containerignore` handling were verified against official Podman documentation instead.
- The post's cache-ordering guidance, specific `COPY` guidance, multi-stage build pattern, `ARG`/`ENV` placement guidance, and `.containerignore` usage are technically consistent with the consulted documentation.
