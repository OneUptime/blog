# Validation Summary: How to Use COPY --from in Podman Multi-Stage Builds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containerfile / Dockerfile syntax
- Multi-stage container builds
- `COPY --from`
- Alpine Linux packages
- Go, Node.js, Python, Rust container build patterns

## Sources Consulted
- Podman `podman build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Containerfile manual page from containers-common: https://man.archlinux.org/man/extra/containers-common/Containerfile.5.en
- Alpine Linux `gettext-envsubst` package page: https://pkgs.alpinelinux.org/package/v3.19/main/x86/gettext-envsubst
- Buildah release notes for image/container copy behavior: https://buildah.io/releases/2024/07/26/Buildah-version-v1.37.0.html

## Issues Found
- The external image example copied only `/usr/bin/curl` from `curlimages/curl:latest` into `alpine:3.19`. That can leave required shared libraries behind and make the runtime command fail. I changed the example to copy `/bin/busybox` from `busybox:1.36` and read `/etc/debian_version` from `debian:bookworm`, preserving the external-image `COPY --from` demonstration with a self-contained runtime command.
- The multi-stage config example used `apk add --no-cache envsubst`, but Alpine packages the binary as `gettext-envsubst` in Alpine 3.19. I changed the package name accordingly.
- The same config example copied `config.template.json` from the build context without creating it and wrote to `/etc/app/config.json` before ensuring `/etc/app` existed. I changed the snippet to create the template in the build stage, create `/etc/app`, and generate the config with `envsubst`.

## Review Notes
Podman was not installed in the local environment, so CLI flags were verified against the current official Podman documentation rather than local `podman --help` output. The remaining examples are pattern snippets that assume the referenced application files, such as `package.json`, `Cargo.toml`, and `app.py`, exist in the build context.
