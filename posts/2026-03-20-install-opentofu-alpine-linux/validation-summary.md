# Validation Summary: How to Install OpenTofu on Alpine Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Alpine Linux
- `apk`
- Docker
- musl libc
- HCL

## Sources Consulted
- OpenTofu installation overview: https://opentofu.org/docs/intro/install/
- OpenTofu Alpine installation docs: https://opentofu.org/docs/intro/install/alpine/
- OpenTofu Docker image / container docs: https://opentofu.org/docs/intro/install/docker/
- OpenTofu latest release: https://github.com/opentofu/opentofu/releases/tag/v1.11.6
- OpenTofu v1.9.0 release assets: https://github.com/opentofu/opentofu/releases/tag/v1.9.0
- OpenTofu upstream Dockerfile: https://github.com/opentofu/opentofu/blob/main/Dockerfile
- Alpine package index for `opentofu` on v3.19 community: https://pkgs.alpinelinux.org/package/v3.19/community/x86_64/opentofu
- Alpine package search for `opentofu` on v3.17 community: https://pkgs.alpinelinux.org/packages?name=opentofu&branch=v3.17&repo=community&arch=x86_64&origin=&maintainer=&flagged=
- Alpine release support status: https://www.alpinelinux.org/releases/

## Issues Found
- The post said Alpine Linux 3.17 or later could install OpenTofu from the stable community repository. Current Alpine package data shows the stable `community` package exists from Alpine 3.19 onward, not 3.17. I updated the prerequisite and Method 1 wording accordingly.
- The repository-enabling command claimed to add the community repository only when needed, but it always appended another line. I changed it to a conditional `grep ... || echo ...` form so the command matches the comment.
- The manual binary install hardcoded the `linux_amd64` artifact. That breaks on non-`amd64` Alpine systems such as `aarch64`. I added architecture detection based on `apk --print-arch` and mapped Alpine architectures to the correct OpenTofu release asset names.
- The Dockerfile repeated the same `amd64` assumption and also pinned `alpine:3.19`, which is out of support as of April 30, 2026. I updated it to `alpine:3.23`, bumped the sample OpenTofu version to the current stable `1.11.6`, and made the download architecture-aware.
- The musl verification step hardcoded `/usr/local/bin/tofu`, which is not correct for the APK-installed package, and the expected `ldd` output was too narrow. I changed it to `ldd "$(command -v tofu)"` and updated the note to reflect the actual static-binary result.

## Review Notes
- OpenTofu’s official Alpine docs still mention the testing repository, but Alpine’s official package index shows `opentofu` in stable `community` beginning with Alpine 3.19. The post now reflects current package availability.
- I locally verified that the OpenTofu release assets exist for the referenced filenames, that the standalone Linux binary is statically linked, and that the sample `tofu init` / `tofu apply -auto-approve` workflow succeeds with the provided minimal configuration.
- The official `ghcr.io/opentofu/opentofu` image is currently Alpine-based, but upstream discourages using that official image as a base image starting with OpenTofu 1.10. This post only runs the image directly, so no content change was required there beyond clarifying that the Alpine base is current behavior.
