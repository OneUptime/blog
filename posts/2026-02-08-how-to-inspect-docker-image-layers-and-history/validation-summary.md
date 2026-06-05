# Validation Summary: How to Inspect Docker Image Layers and History

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker images and layers
- Docker CLI (`docker history`, `docker image inspect`, `docker save`, `docker buildx imagetools inspect`)
- Dockerfile instructions
- dive image analysis tool
- GitHub Actions
- TruffleHog
- Unix shell tools (`tar`, `grep`, `find`, `diff`, `sed`)

## Sources Consulted
- Docker CLI reference: `docker image save` - https://docs.docker.com/reference/cli/docker/image/save/
- Docker CLI reference: `docker image inspect` - https://docs.docker.com/reference/cli/docker/image/inspect/
- Docker image layers concept guide - https://docs.docker.com/get-started/docker-concepts/building-images/understanding-image-layers/
- Docker storage drivers: images and layers - https://docs.docker.com/engine/storage/drivers/
- Docker CLI local help for Docker 29.4.2: `docker history --help`, `docker image inspect --help`, `docker buildx imagetools inspect --help`
- dive official repository and CLI help - https://github.com/wagoodman/dive
- TruffleHog Docker scanning documentation - https://docs.trufflesecurity.com/scan-docker
- TruffleHog local Docker image CLI help: `trufflehog docker --help`
- GitHub Actions workflow syntax - https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions

## Issues Found
- The post described `docker history` as one entry per layer. Docker history also includes metadata-only instructions, so the wording was changed to describe history entries instead of layers only.
- The introductory layer-count explanation implied every filesystem-modifying Dockerfile instruction count mapped directly from the example. It was clarified that only filesystem changes create layers, while metadata-only instructions appear in history without creating filesystem layers.
- The `.RootFS.Layers` values were described broadly as layer digests. They were clarified as diff IDs for uncompressed filesystem layers.
- The dive CI workflow used invalid threshold flags: `--highestImageEfficiency` and `--lowestImageEfficiency`. These were replaced with current flags `--lowestEfficiency` and `--highestWastedBytes`.
- The `docker save` extraction example assumed only a legacy Docker-layout archive with per-layer `layer.tar` directories. It was updated to mention current OCI-layout exports with blobs under `blobs/sha256/` as well as legacy Docker-layout exports.
- The large-file example piped `docker save` through nested `tar` commands in a way that does not produce a valid tar stream. It was replaced with a save-to-file workflow that lists archived blobs or layer files and then inspects extracted archive members.
- The manual layer loop only handled legacy `*/layer.tar` paths and used `tar tzf`, which is not appropriate for all saved layer archive forms. It was updated to cover OCI blobs and legacy `layer.tar` files using `tar tf`.
- The TruffleHog example used `docker save ... | trufflehog docker --stdin`, but the current TruffleHog Docker source accepts images through `--image`. It was replaced with `trufflehog docker --image=docker://myapp:latest`.

## Review Notes
The GitHub Actions example still uses `actions/checkout@v4`, which remains a pinned version and is syntactically valid. New GitHub examples may use newer checkout versions, so this could be refreshed in a future maintenance pass if the blog standard prefers latest action majors.
