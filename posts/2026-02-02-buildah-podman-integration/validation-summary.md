# Validation Summary: How to Use Buildah with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Buildah (container image builder)
- Podman (container runtime)
- Docker / Dockerfile syntax
- OCI image format
- podman-compose
- Container registries (Docker Hub, Quay.io, ghcr.io)
- GitLab CI and GitHub Actions
- Rootless containers (subuid/subgid, user namespaces)
- Linux package managers (dnf, apt, brew)

## Sources Consulted
- Buildah official docs and man pages: https://github.com/containers/buildah/tree/main/docs
- Podman official docs: https://docs.podman.io/
- buildah-bud, buildah-from, buildah-copy, buildah-config, buildah-commit, buildah-containers, buildah-mount, buildah-push, buildah-tag, buildah-manifest, buildah-login man pages
- Podman installation guide: https://podman.io/docs/installation
- Containers/image storage docs: https://github.com/containers/storage
- SUSE/Kubic repository deprecation announcement (2023): https://podman.io/new/2023/01/15/the-end-of-an-era
- Debian/Ubuntu apt-key deprecation notice (Debian 11+, Ubuntu 22.04+)
- GitHub Actions docs for actions/checkout@v4
- GitLab CI/CD predefined variables documentation
- Alpine Linux package manager (apk) docs

## Issues Found

1. **Ubuntu/Debian install instructions used the deprecated Kubic repository.** The opensuse Kubic libcontainers stable repository was officially discontinued in early 2023 (announced by the Podman team). Since Ubuntu 20.10+ and Debian 11+, both Buildah and Podman have been available in the default OS repositories. Additionally, the example used `apt-key add`, which is deprecated in Debian 11/Ubuntu 22.04+. I replaced the section with the simpler, currently-correct flow (`apt install -y buildah podman` from default repos), aligning with the official Podman installation guide.

## Review Notes

- The example Dockerfiles use `golang:1.21-alpine` and `alpine:3.18`, which are not the latest tags but remain valid, pullable images. They could be bumped to `golang:1.23-alpine` / `alpine:3.20` to reflect current versions, but the examples remain functionally correct.
- `buildah inspect docker.io/library/nginx:latest` and `buildah manifest inspect docker.io/library/nginx:latest` operate on local storage, so they require a prior `podman pull` (which the example already performs immediately above). No fix needed.
- `podman inspect --format '{{.HostConfig.Privileged}}'` works because Podman maintains Docker-compatible inspect output, so the field is accessible at that path.
- The `buildah containers -a` flag is valid and includes externally-created (Podman) working containers in the listing, per the buildah-containers man page.
- The `buildah run $container -- sh -c '...'` syntax with the `--` separator is correct for passing shell commands.
- The `:Z` volume suffix correctly describes the SELinux relabeling behavior on Red Hat-family systems.
- `buildah bud` remains a valid alias for `buildah build`; both work in current versions.
- macOS install instructions are accurate: the default Podman machine image (Fedora CoreOS) ships with buildah pre-installed.
