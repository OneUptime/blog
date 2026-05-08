# Validation Summary: How to Save an Image to a Tar File with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container images
- Docker archive and OCI archive formats
- Tar archives
- gzip, bzip2, and zstd compression
- Unix shell scripting

## Sources Consulted
- Official Podman `podman-save` documentation: https://docs.podman.io/en/latest/markdown/podman-save.1.html
- Official Podman `podman-load` documentation: https://docs.podman.io/en/latest/markdown/podman-load.1.html
- Official Podman `podman-images` documentation: https://docs.podman.io/en/latest/markdown/podman-images.1.html

## Issues Found
- The post said archive files could be compressed "using the `--compress` flag." Official Podman documentation says `--compress` is only for directory output with `--format=docker-dir`, not for compressing regular tar archive output. I changed the text to recommend piping through gzip, bzip2, or zstd.
- The introductory syntax showed multiple images as ordinary positional arguments. I changed the basic syntax to a single image and noted that `-m` is used for multi-image Docker archives.
- The multi-image save example omitted `-m`. Official Podman documentation says `--multi-image-archive, -m` allows archives with more than one image and is supported for `docker-archive`. I added `-m` to the multi-image example and added a short explanatory sentence.
- The multiple-tags example used multiple image references without `-m`. I added `-m` so the example consistently creates a multi-image Docker archive.
- The scripting example appended multiple independent `podman save` streams into one `.tar` file with `>>`, which does not create a proper Podman multi-image archive. I changed it to call `podman save -m -o all-myapp-images.tar` once with the filtered image list.

## Review Notes
Podman was not installed in the local environment, so command behavior was validated against the official Podman documentation rather than local `--help` output. The transfer workflow using `gunzip -c ... | podman load` is valid because `podman load` reads from stdin by default, and the official documentation also notes that compressed input files are supported when using `--input`.
