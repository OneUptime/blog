# Validation Summary: How to Pin Package Versions in Dockerfiles for Reproducible Builds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker and Dockerfiles
- BuildKit Dockerfile syntax frontend
- Debian/Ubuntu apt
- Alpine apk
- Red Hat/Rocky Linux dnf/yum and RPM packages
- Python pip and pip-tools
- Node.js npm
- Go modules
- Rust Cargo
- Ruby Bundler
- Renovate, Dependabot, and Hadolint

## Sources Consulted
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker image pull reference: https://docs.docker.com/reference/cli/docker/image/pull/
- Docker BuildKit custom Dockerfile syntax: https://docs.docker.com/build/buildkit/frontend/
- npm ci documentation and npm config reference: https://docs.npmjs.com/cli/commands/npm-ci/ and https://docs.npmjs.com/cli/using-npm/config/
- pip secure installs / hash-checking mode: https://pip.pypa.io/en/stable/topics/secure-installs/
- pip-tools pip-compile documentation: https://pip-tools.readthedocs.io/en/stable/cli/pip-compile/
- Go Modules Reference: https://go.dev/ref/mod
- Cargo CLI help for `cargo fetch --locked`
- Bundler bundle install documentation: https://bundler.io/man/bundle-install.1.html
- Renovate Docker manager documentation: https://docs.renovatebot.com/docker/
- Hadolint rule documentation: https://github.com/hadolint/hadolint/wiki/DL3008
- Local Docker package-manager checks against `ubuntu:22.04`, `alpine:3.19`, `rockylinux:9`, and `hadolint/hadolint`

## Issues Found
- The Docker digest lookup command showed `docker inspect` before `docker pull`. Docker's documentation says to pull the image first to know its digest, so the command sequence was updated.
- The exact Ubuntu 22.04 apt package versions were stale and no longer resolved from the current repositories for `ubuntu:22.04`. They were updated to currently available versions verified with `apt-cache policy` and simulated `apt-get install`.
- The exact Alpine 3.19 package versions for `curl` and `git` were stale and no longer resolved from the current repositories for `alpine:3.19`. They were updated to currently available versions verified with `apk list` and simulated `apk add`.
- The Rocky Linux 9 example used stale package versions and attempted to install `curl`, which conflicts with `curl-minimal` in the base image. It was updated to pin `curl-minimal` and the current `git` package version verified with `dnf repoquery` and a simulated install.
- The npm example used deprecated `--only=production`. It was updated to the current `npm ci --omit=dev` form.
- The Bundler example used deprecated `bundle install --frozen`. It was updated to `bundle config set frozen true && bundle install`, and the explanatory text was adjusted to refer to the `frozen` setting.

## Review Notes
The remaining guidance is technically sound for functional reproducibility. Exact OS package pins tied to mutable distro repositories will continue to age, so future maintenance should either refresh these examples periodically or discuss snapshot repositories for stronger long-term rebuild reproducibility.
