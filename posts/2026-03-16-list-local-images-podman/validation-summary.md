# Validation Summary: How to List Local Images with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container images
- Command-line image management
- Go template output formatting
- JSON output processing with jq

## Sources Consulted
- Podman `podman-images` official documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `podman-system-df` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman `podman-info` official documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman `podman-image` official documentation: https://docs.podman.io/en/v4.4/markdown/podman-image.1.html

## Issues Found
- The JSON processing example used `jq '.[].Names'`, but Podman's `--format json` output uses lowercase JSON keys such as `names`. Changed it to `jq '.[].names'`.
- The size sorting comment said `podman images --sort size` sorts largest first. The official documentation confirms `size` is a supported sort key but does not state descending order. Changed the comment to "Sort images by size."

## Review Notes
The remaining commands and flags reviewed are valid according to the official Podman documentation, including `podman images`, `podman image list`, `--all`, `--digests`, `--quiet`, `--no-trunc`, supported image filters, `--sort`, Go template formatting, `podman image exists`, `podman info --format`, and `podman system df -v`.
