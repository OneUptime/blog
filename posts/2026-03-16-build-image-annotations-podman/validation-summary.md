# Validation Summary: How to Build an Image with Annotations with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- OCI image manifests and image indexes
- Container image labels and annotations
- Skopeo
- Bash
- Containerfile/Dockerfile syntax

## Sources Consulted
- Podman `podman build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman `podman manifest create` documentation: https://docs.podman.io/en/stable/markdown/podman-manifest-create.1.html
- Podman `podman manifest add` documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-add.1.html
- Podman `podman manifest annotate` documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-annotate.1.html
- Podman `podman inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Skopeo `inspect` documentation: https://github.com/containers/skopeo/blob/main/docs/skopeo-inspect.1.md
- OCI Image Specification annotations section: https://specs.opencontainers.org/image-spec/annotations/?v=v1.1.1
- OCI Image Specification manifest section: https://specs.opencontainers.org/image-spec/manifest/?v=v1.1.0

## Issues Found
- The post said Podman supports adding annotations during builds without noting the OCI image format limitation. Podman documents that build annotations are discarded when writing Docker image formats, so the text now states that build annotations apply when writing images in OCI format.
- The labels section described labels as runtime metadata visible inside the container. Labels are image configuration metadata and are visible through image/container inspection, so the wording and example comment were corrected.
- The manifest-list example claimed `podman manifest annotate` was adding annotations to the manifest list itself. Official Podman documentation says `manifest add --annotation` annotates an entry and `manifest create --annotation` annotates the newly created image index, so the example now adds the image-index annotation at `podman manifest create` time.
- The registry query comment said plain `skopeo inspect` queried annotations. Skopeo's default output is general image metadata, while `--raw` returns the manifest where top-level annotations can be read. The comment was changed to "Query image metadata".

## Review Notes
Podman and Skopeo were not installed in the local workspace, so CLI behavior was validated against official documentation rather than local `--help` output. Multi-architecture builds with `--platform` may require suitable emulation or native builders for non-host architectures, but the command syntax shown is current.
