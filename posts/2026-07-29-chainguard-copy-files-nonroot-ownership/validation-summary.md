# Validation Summary: How to Copy Files into Chainguard Images with Nonroot Ownership

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Chainguard Containers and the Chainguard Python container image
- Docker and Dockerfiles
- Docker multi-stage builds
- Linux UID, GID, ownership, and permission modes
- Kubernetes Pod and container security contexts
- Kubernetes PersistentVolumes and `fsGroup`
- Red Hat OpenShift arbitrary UID execution

## Sources Consulted

- [Chainguard Python container image overview](https://images.chainguard.dev/directory/image/python/overview)
- [Migrating to Python Chainguard Containers](https://edu.chainguard.dev/get-started/migration/migration-guides/migrating-python/)
- [Migrating to .NET Chainguard Containers](https://edu.chainguard.dev/get-started/migration/migration-guides/migrating-dotnet/)
- [How to Use Chainguard Containers with OpenShift](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/use-with-openshift/)
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Docker `image inspect` reference](https://docs.docker.com/reference/cli/docker/image/inspect/)
- [Docker `container create` reference](https://docs.docker.com/reference/cli/docker/container/create/)
- [Docker `container export` reference](https://docs.docker.com/reference/cli/docker/container/export/)
- [Docker `container run` reference](https://docs.docker.com/reference/cli/docker/container/run/)
- [Kubernetes: Configure a Security Context for a Pod or Container](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
- [BusyBox command reference](https://busybox.net/downloads/BusyBox.html)

## Issues Found

- The inspection sequence called `docker image inspect` before ensuring that the image existed locally. Added `docker pull "$IMAGE"` because `docker image inspect` operates on local image metadata and otherwise fails on a clean machine.
- The nonroot builder used `/home/nonroot/build`, whose creation and ownership could depend on builder behavior. Changed the working directory to the image's existing nonroot-owned `/home/nonroot` directory and updated the multi-stage copy path so the virtual environment is reliably writable during creation.
- The OpenShift note mentioned group `0` ownership but did not make the required matching group permissions explicit. Added the documented `chmod -R g=u` requirement alongside `--chown=65532:0`.
- The `WORKDIR` explanation stated too broadly that a created work directory would not become owned by the configured nonroot user. Updated it to reflect current BuildKit behavior while preserving the warning that pre-existing directories retain their ownership and other builders can differ.

## Review Notes

- The `latest` and `latest-dev` tags are mutable. Production builds should pin image digests when reproducibility is required.
- `COPY --chmod` requires Dockerfile syntax version 1.2 or newer; the post correctly advises pinning an appropriate frontend when necessary.
- `fsGroup` ownership handling remains volume-type and CSI-driver dependent, as the post notes.
