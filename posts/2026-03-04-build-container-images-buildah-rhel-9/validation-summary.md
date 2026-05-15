# Validation Summary: How to Build Container Images with Buildah on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Buildah
- Podman
- Skopeo
- UBI and UBI Minimal container images
- Containerfile / Dockerfile syntax
- OCI container images
- DNF and microdnf

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Building container images with Buildah - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/assembly_building-container-images-with-buildah
- Buildah build man page - https://github.com/containers/buildah/blob/main/docs/buildah-build.1.md
- Buildah config man page - https://github.com/containers/buildah/blob/main/docs/buildah-config.1.md
- Buildah from man page - https://github.com/containers/buildah/blob/main/docs/buildah-from.1.md
- Buildah images man page - https://github.com/containers/buildah/blob/main/docs/buildah-images.1.md
- Buildah rmi man page - https://github.com/containers/buildah/blob/main/docs/buildah-rmi.1.md

## Issues Found
- The installation section referred to `container-tools` as a module. For RHEL 9, Red Hat documents `container-tools` as a meta-package, so the wording was corrected.
- The `scratch` image example installed `coreutils-single` directly into an empty installroot. Red Hat's Buildah scratch-image guidance says to initialize the RPM database and add a release package before using `dnf` or `rpm` in the image, so the example now installs `redhat-release` first.
- The layer-management section said `--layers=false` squashes all layers and that `--layers=true` is the default. Buildah documents `--layers` as false by default, preserving base layers and adding one new layer, while `--squash` is the option that squashes all layers including base image layers. The section was corrected accordingly.

## Review Notes
The commands and examples are otherwise consistent with Buildah's documented `from`, `run`, `copy`, `config`, `commit`, `build`, `push`, `images`, and `rmi` behavior. The `buildah build` command is documented as valid alongside `buildah bud`, although many Red Hat examples still use `buildah bud`.
