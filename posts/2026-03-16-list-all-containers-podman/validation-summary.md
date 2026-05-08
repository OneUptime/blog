# Validation Summary: How to List All Containers Including Stopped in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman CLI container listing commands
- Bash shell commands
- jq JSON filtering
- awk text processing

## Sources Consulted
- Official Podman `podman-ps` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html

## Issues Found
- Podman's current `status` filter documentation includes `initialized` as a valid container status. The post's state examples and inventory script listed running, exited, created, and paused, but omitted initialized. Added `status=initialized` examples and counts so the state coverage matches current Podman documentation.

## Review Notes
The core guidance is accurate: `podman ps` lists running containers by default, `podman ps -a` lists all Podman containers, and `--external` is needed to include external containers stored by other tools such as Buildah or CRI-O. The documented format placeholders, filters, sorting options, pod display, size display, no-trunc output, JSON formatting, and `podman container list` / `podman container ls` aliases are supported by the official Podman documentation.
