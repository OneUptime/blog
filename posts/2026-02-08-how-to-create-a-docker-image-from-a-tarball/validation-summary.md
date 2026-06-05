# Validation Summary: How to Create a Docker Image from a Tarball

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker CLI
- Docker images and containers
- Tar archives and compressed tar archives
- Debian debootstrap
- Alpine Linux minirootfs
- Fedora/DNF install roots
- Makefile automation

## Sources Consulted
- Docker CLI reference for `docker image import`: https://docs.docker.com/reference/cli/docker/image/import/
- Docker CLI reference for `docker container export`: https://docs.docker.com/reference/cli/docker/container/export/
- Docker CLI reference for `docker image load`: https://docs.docker.com/reference/cli/docker/image/load/
- Docker CLI reference for `docker image save`: https://docs.docker.com/reference/cli/docker/image/save/
- Dockerfile reference for CMD, ENTRYPOINT, ENV, EXPOSE, WORKDIR, and related metadata instructions: https://docs.docker.com/reference/dockerfile/
- Alpine Linux release branches and supported versions: https://www.alpinelinux.org/releases/
- Alpine Linux stable release announcement for 3.23.4: https://www.alpinelinux.org/posts/Alpine-3.20.10-3.21.7-3.22.4-3.23.4-released.html
- Fedora release lifecycle documentation: https://docs.fedoraproject.org/en-US/releases/lifecycle/
- DNF command reference for `--installroot` and `--releasever`: https://dnf.readthedocs.io/en/stable/command_ref.html

## Issues Found
- The supported `docker import --change` instruction list was incomplete. Updated it to include HEALTHCHECK, LABEL, and STOPSIGNAL, matching Docker's current CLI reference.
- The Alpine minirootfs example used Alpine 3.19.0, which is end-of-life as of the review date. Updated the example to Alpine 3.23.4, a currently supported stable release.
- The Fedora/DNF example used Fedora 39, which is end-of-life. Updated `--releasever=39` to `--releasever=44`, a current supported Fedora release as of June 5, 2026.
- The custom application image script copied shared libraries into a flat `/lib` directory, which can break dynamically linked binaries that expect architecture-specific library paths. Updated the example to use `cp --parents` so library paths are preserved in the root filesystem.
- The `nginx:alpine` layer count example used a hard-coded number that can change as the tag is updated. Replaced it with a version-dependent placeholder while preserving the technical point that `docker load` keeps the original layers.
- The Makefile example used shell brace expansion even though Make uses `/bin/sh` by default, where brace expansion is not portable. Replaced it with explicit directory paths.

## Review Notes
The Docker import/export/load/save command usage, stdin import examples, compressed archive import examples, and save/load versus export/import explanations are technically correct. The post could be improved in the future by noting that `docker export` does not include mounted volume contents and that imported images require metadata such as CMD or ENTRYPOINT if users want default runtime behavior.
