# Validation Summary: How to Use RUN Instruction Best Practices in Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Containerfile / Dockerfile syntax
- Buildah-backed image builds
- Linux package managers (`apt`, `dnf`, `apk`)
- `npm`
- Multi-stage container builds
- Build secrets and cache mounts

## Sources Consulted
- Podman build reference: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Dockerfile reference: https://docs.docker.com/reference/dockerfile
- Buildah build reference: https://github.com/containers/buildah/blob/main/docs/buildah-build.1.md
- npm config reference: https://docs.npmjs.com/cli/v10/using-npm/config/?v=true
- npm ci reference: https://docs.npmjs.com/cli/v10/commands/npm-ci/?v=true
- Debian package reference for `curl`: https://packages.debian.org/en/bookworm/curl
- Debian package reference for `ca-certificates`: https://packages.debian.org/bookworm/ca-certificates

## Issues Found
- The `npm ci --only=production` example used a deprecated npm config alias. I changed it to `npm ci --omit=dev`, which is the current documented form.
- The `apt` cache-mount example was incomplete for Debian/Ubuntu-style images because the default `docker-clean` configuration removes downloaded package archives. I updated the example to disable that cleanup and enable `APT::Keep-Downloaded-Packages` before using cache mounts.
- The shell-failure example under "Mistake 3" was incorrect: `cd /nonexistent && echo ...` would stop at the failed `cd` and would not demonstrate a masked failure. I changed it to `cd /nonexistent; echo ...` so it accurately shows why `set -e` or `&&` matters.
- The pinned Debian package versions were outdated. I updated them to current Debian 12 package versions and marked the snippet as a Debian 12-specific example.
- The `podman build --secret` command was changed to the canonical documented `--secret=id=...` form for consistency with Podman's reference syntax.

## Review Notes
- Podman's build reference documents `--layers` as enabled by default, which matches the post's layer-caching discussion.
- The heredoc examples were checked against the Dockerfile reference; Podman's build docs state that Containerfiles use Dockerfile syntax internally.
