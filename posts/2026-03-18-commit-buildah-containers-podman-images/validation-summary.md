# Validation Summary: How to Commit Buildah Containers as Podman Images

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Buildah
- Podman
- OCI container images
- Docker image manifest format
- Container registries
- Linux shell commands

## Sources Consulted
- Buildah `commit` official man page: https://github.com/containers/buildah/blob/main/docs/buildah-commit.1.md
- Buildah `config` official man page: https://github.com/containers/buildah/blob/main/docs/buildah-config.1.md
- Buildah `containers` official man page: https://github.com/containers/buildah/blob/main/docs/buildah-containers.1.md
- Podman `images` official documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `image inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Podman `history` official documentation: https://docs.podman.io/en/stable/markdown/podman-history.1.html
- Podman `tag` official documentation: https://docs.podman.io/en/stable/markdown/podman-tag.1.html
- Podman `push` official documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman `save` official documentation: https://docs.podman.io/en/stable/markdown/podman-save.1.html
- Podman `load` official documentation: https://docs.podman.io/en/stable/markdown/podman-load.1.html

## Issues Found
- The squash section claimed each `buildah run` command creates a separate layer. Buildah `commit` writes the working container's read-write layer along with any inherited base layers, while `--squash` squashes all layers, including inherited base layers, into a single new layer. Updated the comments to reflect this behavior.
- The compression section claimed default gzip compression and used `buildah commit --compression-format zstd`, but the current official `buildah commit` documentation does not list `--compression-format`, and `--disable-compression` is the default for local storage unless compression is required by the destination. Replaced the invalid zstd example with `--disable-compression=false` to show how to force compression.
- The nginx verification command passed `nginx -t` as arguments to an image that already had an nginx entrypoint configured, which would append those arguments to the existing entrypoint. Updated the command to override the entrypoint with `--entrypoint nginx` and pass `-t`.
- The cleanup command still referenced the old compression example image tags. Updated it to remove the corrected tags.
- The summary said Buildah commit can select compression algorithms. Updated it to say it can control layer compression.

## Review Notes
The commands could not be executed locally because `buildah` and `podman` are not installed in this environment, so validation was performed against official upstream documentation. The examples use short image names such as `alpine:3.19` and `ubuntu:22.04`; on systems without configured short-name aliases, Podman/Buildah may prompt for registry resolution.
