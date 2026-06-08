# Validation Summary: How to Handle Podman Image Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman (image management, build, push, pull, manifest, save/load, system commands)
- Buildah (advanced image building)
- Containerfile / Dockerfile (multi-stage builds, layer caching)
- OCI image format and registries (Docker Hub, Quay.io, GHCR)
- containers/registries.conf (registries configuration)
- containers/policy.json (signature trust policy)
- containers/registries.d (sigstore configuration)
- Trivy (vulnerability scanning)
- GPG signing
- Bash scripting for automation

## Sources Consulted
- Podman `podman-build(1)`: https://docs.podman.io/en/latest/markdown/podman-build.1.html
- Podman `podman-push(1)`: https://docs.podman.io/en/latest/markdown/podman-push.1.html
- Podman `podman-pull(1)`: https://docs.podman.io/en/latest/markdown/podman-pull.1.html
- Podman `podman-login(1)`: https://docs.podman.io/en/latest/markdown/podman-login.1.html
- Podman `podman-manifest(1)` family: https://docs.podman.io/en/latest/markdown/podman-manifest.1.html
- Podman `podman-images(1)` and `podman-inspect(1)` format fields
- `containers-registries.conf(5)` documentation
- `containers-policy.json(5)` and `containers-registries.d(5)` documentation
- Buildah `buildah-from`, `buildah-config`, `buildah-commit` man pages

## Issues Found
1. **Invalid `podman build --progress=plain` flag.** The post used `podman build --progress=plain -t myapp:v1 .` with comment "Build with progress output". `--progress` is a Docker BuildKit flag and is not present in `podman-build(1)`. Replaced with `podman build --pull=always -t myapp:v1 .` and updated the comment to "Always pull the latest base image during build", which is both valid and useful.

2. **Invalid `podman push --all-tags` flag.** The post used `podman push --all-tags myuser/myapp docker.io/myuser/myapp` with comment "Push all tags for an image". Per the current `podman-push(1)` man page, there is no `--all-tags` option (this is a Docker-only flag). Replaced with a shell loop that iterates over local tags and pushes each individually, which is the documented way to achieve the same outcome with Podman, and updated the comment to note that no built-in flag exists.

3. **Incorrect default `auth.json` path.** The post stated `~/.local/share/containers/auth.json` as the "Authentication file location". Per `podman-login(1)`, the default rootless authentication file is `${XDG_RUNTIME_DIR}/containers/auth.json` (typically `/run/user/$UID/containers/auth.json`). `~/.local/share/containers/` holds the rootless graph storage, not credentials. Updated the path to `"${XDG_RUNTIME_DIR}/containers/auth.json"` and clarified the comment to "Authentication file location (rootless default)".

## Review Notes
- `$XDG_RUNTIME_DIR` is ephemeral (cleared on reboot/logout on most systems). Users wanting persistent auth across reboots commonly set `REGISTRY_AUTH_FILE` to a path under `~/.config/containers/auth.json`; this was not added so as to avoid expanding scope, but it could be a useful follow-up note.
- The post says "Pod Support - Native Kubernetes-style pod management" in the Why Podman list — this is correct (`podman pod` and `podman kube` commands).
- The TOML snippet for `~/.config/containers/registries.conf` with `[[registry]]` and nested `[[registry.mirror]]` is valid syntax and matches `containers-registries.conf(5)`.
- The `podman save --format oci-archive`, `podman manifest push --all`, `buildah` workflow, and `policy.json` schema all match current documentation.
- `--log-level debug` (used later in Troubleshooting) is a Podman persistent flag inherited by `podman build`, so it works as written.
- The Containerfile examples (multi-stage Go build, Node.js layer caching, Alpine build cleanup) follow current best practices and use valid base image tags as of the time of writing (`golang:1.21`, `node:20-alpine`). These are pinned to versions that were current when the post was written and are still supported.
