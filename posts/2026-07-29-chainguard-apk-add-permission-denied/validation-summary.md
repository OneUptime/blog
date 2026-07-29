# Validation Summary: Why Does `apk add` Return Permission Denied in a Chainguard Image?

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Chainguard Containers
- Wolfi and APK
- Docker and Dockerfiles
- Multi-stage container builds
- Non-root container users
- Rootless BuildKit and Podman
- Kubernetes security contexts
- Python virtual environments

## Sources Consulted

- [Chainguard Python image overview](https://images.chainguard.dev/directory/image/python/overview)
- [Chainguard Python image versions](https://images.chainguard.dev/directory/image/python/versions)
- [Chainguard container variants](https://edu.chainguard.dev/chainguard/chainguard-images/about/differences-development-production/)
- [Installing APK packages in distroless variants](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/install-apks-in-distroless-variants/)
- [Overview of Chainguard Custom Assembly](https://edu.chainguard.dev/chainguard/chainguard-images/features/ca-docs/custom-assembly/)
- [Chainguard private APK repositories](https://edu.chainguard.dev/chainguard/chainguard-images/features/packages/private-apk-repos/)
- [Chainguard `wolfi-base` image overview](https://images.chainguard.dev/directory/image/wolfi-base/overview)
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Docker: Understanding the Docker `USER` instruction](https://www.docker.com/blog/understanding-the-docker-user-instruction/)
- [Docker `image inspect` reference](https://docs.docker.com/reference/cli/docker/image/inspect/)
- [Docker `container run` reference](https://docs.docker.com/reference/cli/docker/container/run/)
- [Docker rootless UID/GID mapping](https://docs.docker.com/engine/security/rootless/uid-gid-mapping/)
- [Podman rootless mode documentation](https://docs.podman.io/en/latest/markdown/podman.1.html)
- [Alpine Package Keeper documentation](https://wiki.alpinelinux.org/wiki/Apk)
- [Kubernetes security context documentation](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
- Live OCI metadata and filesystem manifests for `cgr.dev/chainguard/python:latest` and `cgr.dev/chainguard/python:latest-dev`, checked on 2026-07-29

## Issues Found

- `docker image inspect` only inspects an image in the local image store. Added `docker pull "$IMAGE"` so the diagnostic sequence also works when the development image has not already been pulled.
- The build example switched to UID `65532` before ensuring `/app` was writable. Because a newly created `WORKDIR` is root-owned by default, `python -m venv /app/venv` could fail with `Permission denied`. Added a root-only step that creates `/app` and assigns it to UID/GID `65532` before switching back to the non-root user.
- The Kubernetes note described `readOnlyRootFilesystem: true` as preventing all runtime writes. Corrected it to state that the container's root filesystem is read-only while separately mounted writable volumes remain unaffected.
- Two Chainguard migration links redirected from their former paths. Updated them to the current canonical URLs.

## Review Notes

- Live Chainguard registry metadata and filesystem manifests confirmed that both Python variants configure UID `65532` and `/usr/bin/python`, while `latest-dev` contains `apk` and the standard `latest` variant does not.
- The package names `build-base` and `libffi-dev` are currently available from the configured public Chainguard APK repository.
- The use of floating `latest` tags follows the cited Chainguard examples, but production builds may prefer digests or controlled version tags for reproducibility.
