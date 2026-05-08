# Validation Summary: How to Load an Image from a Tar File with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container images
- Docker archive format
- OCI archive format
- Shell pipelines and compression tools

## Sources Consulted
- Podman `podman-load` official documentation: https://docs.podman.io/en/latest/markdown/podman-load.1.html
- Podman `podman-save` official documentation: https://docs.podman.io/en/latest/markdown/podman-save.1.html
- Podman `podman-run` official documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman-tag` official documentation: https://docs.podman.io/en/latest/markdown/podman-tag.1.html

## Issues Found
- The air-gapped workflow used `podman save docker.io/library/nginx:1.27 docker.io/library/redis:7` to save two images into one archive. Current Podman documentation says additional image names are treated as separate images only when `--multi-image-archive`/`-m` is enabled for Docker archives, unless that default is changed in `containers.conf`. Updated the command to `podman save --multi-image-archive docker.io/library/nginx:1.27 docker.io/library/redis:7 | gzip > app-images.tar.gz`.

## Review Notes
Podman was not installed in the local workspace, so validation was performed against the current official Podman documentation. The `podman load -i` option now also supports compressed files and server URLs directly; the post's decompression and piping examples remain valid.
