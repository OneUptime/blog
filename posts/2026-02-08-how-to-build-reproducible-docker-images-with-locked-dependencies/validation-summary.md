# Validation Summary: How to Build Reproducible Docker Images with Locked Dependencies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker and Dockerfile syntax
- Docker BuildKit and buildx
- npm and package-lock.json
- pip, pip-tools, and requirements files with hashes
- Go modules
- Rust Cargo
- Debian APT packages
- Alpine APK packages
- Reproducible builds and SOURCE_DATE_EPOCH

## Sources Consulted
- Docker image digests documentation: https://docs.docker.com/dhi/core-concepts/digests/
- Dockerfile reference for `RUN --mount` and `SOURCE_DATE_EPOCH`: https://docs.docker.com/reference/builder
- Docker build context and `.dockerignore` documentation: https://docs.docker.com/build/building/context/
- Docker BuildKit reproducible builds documentation: https://docs.docker.com/build/ci/github-actions/reproducible-builds/
- npm `ci` documentation: https://docs.npmjs.com/cli/v8/commands/npm-ci
- pip install documentation for `--require-hashes`: https://pip.pypa.io/en/stable/cli/pip_install/
- Go modules reference: https://go.dev/ref/mod
- Go release policy: https://go.dev/doc/devel/release
- Cargo build documentation for `--locked`: https://doc.rust-lang.org/cargo/commands/cargo-build.html
- Rust release announcements: https://blog.rust-lang.org/
- Debian apt-get manpage: https://manpages.debian.org/unstable/apt/apt-get.8.en.html
- Debian package indexes for curl and ca-certificates: https://packages.debian.org/bookworm/web/curl and https://packages.debian.org/bookworm/ca-certificates
- Alpine package index: https://pkgs.alpinelinux.org/
- Reproducible Builds SOURCE_DATE_EPOCH specification: https://reproducible-builds.org/specs/source-date-epoch/
- Node.js release schedule and EOL guidance: https://github.com/nodejs/release and https://nodejs.org/en/about/eol

## Issues Found
- Node.js examples used `node:20-alpine`, which is past upstream end-of-life as of 2026-04-30. Updated examples to `node:24-alpine` and refreshed the digest examples.
- Several Dockerfile examples used shortened digest placeholders that are not valid pinned image references. Replaced them with full-length digest examples where the snippets use `FROM ...@sha256:`.
- The `docker inspect` command for reading `RepoDigests` omitted the required local image pull step. Added `docker pull` and used `docker image inspect`.
- npm examples used `npm ci --production`; current npm help documents `--omit=dev` for omitting development dependencies. Updated both snippets.
- The Python section described a constraints file while using a requirements file. Corrected the wording to a fully resolved requirements file.
- The Go section said `go mod verify` checks downloaded modules against `go.sum`. Updated the explanation: Go verifies downloads against `go.sum`, while `go mod verify` checks that cached modules have not been modified since download.
- The Go example used Go 1.22, which is outside the currently supported Go release window. Updated it to Go 1.26.
- The Rust example used Rust 1.75, which predates current Cargo security fixes. Updated it to Rust 1.96.
- The Rust Dockerfile used `touch src/main.rs`, introducing a build-time timestamp in a reproducibility-focused example. Removed the `touch`.
- Debian APT package pins were stale for current bookworm package indexes. Updated `curl` and `ca-certificates` versions.
- The APT version discovery command ran `apt-cache madison` without first populating package indexes in a slim image. Added `apt-get update`.
- Alpine APK package pins were stale for the v3.19 package index. Updated `curl` and `ca-certificates` versions.
- The system package section implied version pins alone are sufficient for long-term reproducibility. Added a caveat that exact versions must remain available from the configured repositories or from a snapshot/internal mirror.
- The automated digest update script searched for `node@sha256` even though the Dockerfile examples use `node:24-alpine@sha256`. Updated the `sed` expression.

## Review Notes
Docker Hub registry checks were rate-limited during validation, but `docker buildx imagetools inspect` returned the relevant manifest digests in the error paths before failing on anonymous pull limits. The examples still use illustrative application files and package names; real projects must ensure lock files, package indexes, target platforms, and build tooling match their own environment.
