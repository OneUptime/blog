# Validation Summary: How to Use Volume Subpaths in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman named volumes
- Podman bind mounts
- Container image runtime configuration
- Docker Hub official images for Alpine, nginx, Node.js, and MySQL

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `--mount` option documentation: https://docs.podman.io/en/v4.4/markdown/options/mount.html
- Podman `podman-volume-inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-volume-inspect.1.html
- Podman `podman-volume-mount` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-volume-mount.1.html
- MySQL official image documentation: https://hub.docker.com/_/mysql

## Issues Found
- Podman does not document or support a `subpath` option for `type=volume` mounts. Replaced `--mount type=volume,source=...,target=...,subpath=...` examples with `podman volume inspect --format '{{ .Mountpoint }}' ...` followed by `type=bind` mounts of the required subdirectory.
- The post described Podman volume subpaths as a direct feature. Updated the title, description, headings, explanation, and summary to describe mounting volume subdirectories through bind mounts instead.
- The read-only example used the unsupported volume subpath syntax. Updated it to `type=bind` with `readonly=true`, which is documented for bind mounts.
- The bind mount section did not actually mount a subdirectory. Updated the source path from `/home/user/project` to `/home/user/project/src`.
- The MySQL example omitted a required initialization setting for the official MySQL image. Added `-e MYSQL_ROOT_PASSWORD=example`.

## Review Notes
Podman's `type=image` mount supports `subpath`, but the reviewed post is about named volumes. Docker has a `volume-subpath` option, but that is not Podman's documented syntax.
