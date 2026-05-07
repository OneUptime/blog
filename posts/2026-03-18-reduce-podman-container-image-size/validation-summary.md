# Validation Summary: How to Reduce Podman Container Image Size

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- OCI container images
- Dockerfile / Containerfile builds
- Multi-stage builds
- Linux base images
- APT, DNF/YUM, apk, pip, npm, and Go modules
- Go, Python, Node.js, Java, and C/C++ container examples

## Sources Consulted
- Podman build documentation: https://docs.podman.io/en/stable/markdown/podman-build.1.html
- Podman history documentation: https://docs.podman.io/en/latest/markdown/podman-history.1.html
- Podman image tree documentation: https://docs.podman.io/en/stable/markdown/podman-image-tree.1.html
- Podman images documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman introduction / OCI image format notes: https://docs.podman.io/en/latest/Introduction.html
- Docker multi-stage build documentation: https://docs.docker.com/build/building/multi-stage/
- Docker build best practices: https://docs.docker.com/build/building/best-practices/
- Go release history: https://go.dev/doc/devel/release
- Alpine Linux release branches: https://www.alpinelinux.org/releases/
- npm ci documentation: https://docs.npmjs.com/cli/v9/commands/npm-ci/
- pip caching documentation: https://pip.pypa.io/en/stable/topics/caching.html
- DNF command reference: https://dnf.readthedocs.io/en/stable/command_ref.html

## Issues Found
- The base-image comparison table labeled the values as "Compressed Size", but the listed values are closer to local image sizes reported by image tooling than registry transfer sizes. Changed the column to "Approximate Image Size".
- The post used `alpine:3.20`, which reached end of support on April 1, 2026. Updated Alpine examples to `alpine:3.23`, a supported release branch on the validation date.
- The Go examples used `golang:1.22`, which is no longer supported under Go's two-newer-major-releases support policy. Updated the examples to `golang:1.26`.
- The Python multi-stage example ran `pip install -r requirements.txt` before copying `requirements.txt` into the build stage. Added `COPY requirements.txt .` before the install command.
- The UPX example used `apt-get install -y upx`, but Debian/Ubuntu package repositories provide UPX through the `upx-ucl` package/virtual provider. Updated the example to install `upx-ucl` explicitly and clean APT lists in the same layer.

## Review Notes
Podman was not installed in the local environment, so Podman CLI behavior was verified against official Podman documentation instead of local `--help` output. The remaining commands and snippets are technically valid, though real-world image sizes vary by architecture, tag date, registry compression, and whether tooling reports compressed transfer size or local unpacked size.
