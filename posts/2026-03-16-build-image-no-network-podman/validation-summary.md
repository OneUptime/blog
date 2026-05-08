# Validation Summary: How to Build an Image with No Network Access with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman container builds
- Containerfile / Dockerfile build syntax
- Python pip offline installs
- Node.js npm installs
- Go modules vendoring
- Rust Cargo vendoring
- Debian apt and dpkg package installation
- CI/CD shell scripting

## Sources Consulted
- Podman `podman build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- pip `pip install` documentation: https://pip.pypa.io/en/stable/cli/pip_install/
- npm `npm ci` documentation: https://docs.npmjs.com/cli/v8/commands/npm-ci/
- Go Modules Reference, vendoring and `-mod=vendor`: https://go.dev/ref/mod
- Cargo `cargo vendor` documentation: https://doc.rust-lang.org/nightly/cargo/commands/cargo-vendor.html
- Cargo source replacement documentation: https://doc.rust-lang.org/cargo/reference/source-replacement.html
- Debian `apt-get` man page: https://manpages.debian.org/bookworm/apt/apt-get.8.en.html
- Debian `dpkg` man page: https://manpages.debian.org/unstable/dpkg/dpkg.1.en.html
- Dockerfile reference for general Containerfile-compatible concepts: https://docs.docker.com/reference/builder

## Issues Found
- The post originally claimed that building without network access "guarantees" no external resources are fetched and makes builds fully reproducible and secure. This was too broad because Podman's `--network=none` applies to `RUN` instructions, while base image pulls can still happen unless images are local or `--pull=never` is used. I qualified the claim and added guidance about local base images and `--pull=never`.
- The main `--network=none` examples could still pull missing base images. I added `--pull=never` to the offline build commands so the examples match the "no external fetches" goal.
- The "Reproducibility" bullet overstated that builds always produce the same result. I changed it to clarify that offline builds avoid network-state dependence only when inputs are pinned and available locally.
- The Node.js preparation snippet contained a non-shell phrase in a shell code block. I replaced it with commands consistent with the later Node.js example: `npm ci` followed by archiving `node_modules`.
- The Debian package example used `apt-get download`, which downloads only the named binary packages and not necessarily their dependencies, then tried `apt-get -f install` inside a no-network build. I changed it to use `apt-get install --download-only` on the connected machine and `dpkg -i` only during the offline build.
- The hybrid multi-stage section implied a normal build can make only later stages networkless through the Podman CLI. I adjusted the wording so it accurately says later steps install only from local files.
- The CI script used a cached target build as the dependency step, then ran a no-network build that could still fail if the dependency stage were not cached. I changed the dependency step to pre-download Python wheels into the build context before running the offline Podman build.

## Review Notes
- Podman was not installed in the local environment, so local `podman build --help` verification was not possible. The review used official Podman documentation instead.
- The examples still require the referenced base images to exist in local container storage when `--pull=never` is used.
- For stronger reproducibility, future improvements could pin base images by digest and pin language dependencies with lock files or hashes.
