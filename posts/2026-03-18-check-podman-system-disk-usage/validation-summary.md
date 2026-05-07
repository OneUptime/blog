# Validation Summary: How to Check Podman System Disk Usage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container storage
- Podman CLI
- Shell scripting
- jq
- Linux disk usage tools

## Sources Consulted
- Podman `system df` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman `images` official documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `ps` official documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-ps.1.html
- Podman `container inspect` official documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Podman `volume ls` official documentation: https://docs.podman.io/en/v5.1.1/markdown/podman-volume-ls.1.html
- Podman `info` official documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html

## Issues Found
- The post stated that `podman system df` shows four categories including Build Cache. Current official Podman documentation describes disk usage for images, containers, and volumes, so the text was changed to describe categories such as Images, Containers, and Local Volumes.
- The JSON examples used `ReclaimableSize`, which is not a documented `podman system df --format json` field. The examples were changed to use `Reclaimable`.
- The image total example claimed to sum image disk usage but only printed human-readable size values. It was replaced with `podman images --format json | jq '[.[].size] | add'`, using the JSON byte-size field documented in Podman examples.
- The container inspect example used `.SizeRw` without `--size`. Podman documents that `.SizeRw` requires the `--size` option, so the command was changed to `podman container inspect --size --format '{{.SizeRw}}' my-container`.
- The alert script defined `THRESHOLD_GB` but checked a hard-coded filesystem percentage. The variable was corrected to `THRESHOLD_PERCENT` and used in the comparison.

## Review Notes
The `podman system df` documentation notes that image reclaimable size can be inaccurate when images share layers, so future revisions could mention that caveat if the post expands beyond command usage.
