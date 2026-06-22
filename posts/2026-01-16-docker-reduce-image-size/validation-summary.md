# Validation Summary: Using Alpine, Distroless, and Multi-Stage Builds for Smaller Docker Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfiles
- Docker multi-stage builds
- Alpine Linux
- Google Distroless images
- scratch images
- Node.js and npm
- Python and pip
- Go
- Rust
- Java / Eclipse Temurin
- .NET container images
- Dive
- container-diff

## Sources Consulted
- Docker multi-stage builds documentation: https://docs.docker.com/build/building/multi-stage/
- Docker build best practices documentation: https://docs.docker.com/build/building/best-practices/
- Alpine Docker Official Image documentation: https://hub.docker.com/_/alpine
- Alpine Package Keeper documentation: https://docs.alpinelinux.org/user-handbook/0.1a/Working/apk.html
- Alpine Linux release branches: https://alpinelinux.org/releases/
- GoogleContainerTools Distroless README: https://github.com/GoogleContainerTools/distroless
- Distroless Node.js README: https://github.com/GoogleContainerTools/distroless/blob/main/nodejs/README.md
- Distroless Python README: https://github.com/GoogleContainerTools/distroless/blob/main/python3/README.md
- Node.js previous releases: https://nodejs.org/en/about/previous-releases
- Node Docker Official Image documentation: https://hub.docker.com/_/node
- npm ci documentation: https://docs.npmjs.com/cli/commands/npm-ci/
- npm prune documentation: https://docs.npmjs.com/cli/v11/commands/npm-prune/
- Go release policy: https://go.dev/doc/devel/release
- Python Docker Official Image metadata: https://hub.docker.com/_/python
- Rust Docker Official Image documentation: https://hub.docker.com/_/rust
- Debian upx-ucl package information: https://packages.debian.org/bookworm-backports/upx-ucl
- Eclipse Temurin Docker Official Image documentation: https://hub.docker.com/_/eclipse-temurin
- Docker Buildx image metadata checks for `alpine:3.24`, `node:22-alpine`, `node:22-trixie`, `python:3.13-slim-trixie`, and current distroless Debian 13 images.

## Issues Found
- The post used Node.js 20 images and `gcr.io/distroless/nodejs20-debian12`, but Node.js 20 is now EOL. Updated examples and the image-size table to use Node.js 22 and `gcr.io/distroless/nodejs22-debian13`.
- The post used `alpine:3.19`, which is no longer a supported Alpine release branch. Updated Alpine examples to `alpine:3.24`.
- The distroless examples and image table used Debian 12 tags or unsuffixed image names that are no longer the current recommended tags. Updated them to Debian 13-specific distroless image names.
- The npm examples used `--only=production` and `--production`. Updated them to `--omit=dev`, which matches current npm documentation for omitting development dependencies.
- The Alpine Node and Python examples removed build dependencies in separate Dockerfile layers. Updated them to use virtual build-dependency packages and remove them in the same `RUN` instruction so the examples actually reduce final image size.
- The selective Node copy example built `node_modules` on a Debian-based Node image and copied them into an Alpine runtime, which can break native modules because Alpine uses musl. Updated the builder to `node:22-alpine`.
- The Python distroless example used a Python 3.11 Debian 12 build image with a Debian 12 distroless runtime. Updated it to `python:3.13-slim-trixie` with `gcr.io/distroless/python3-debian13`, matching the current distroless Python compatibility guidance.
- The Go examples used `golang:1.21`, which is outside Go's supported release window. Updated them to `golang:1.25`.
- The Rust scratch example used an old Rust image tag. Updated it to `rust:1.93`.
- The UPX example installed `upx`, but Debian packages UPX as `upx-ucl` in current package metadata. Updated the install command and also made the Go binary static before copying it into `scratch`.

## Review Notes
The exact image sizes in the comparison tables remain approximate and can vary by architecture, registry metadata, compression, and tag updates. The post now uses current, plausible image tags and current CLI flags as of June 22, 2026.
