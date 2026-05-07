# Validation Summary: How to Delete Images from a Registry with Skopeo

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Skopeo
- Podman
- Docker Registry HTTP API V2 / CNCF Distribution registry
- Bash
- jq
- Container image tags, manifests, digests, and garbage collection

## Sources Consulted
- Skopeo README and command documentation: https://github.com/containers/skopeo
- Skopeo delete man page: https://github.com/containers/skopeo/blob/main/docs/skopeo-delete.1.md
- Skopeo list-tags man page: https://github.com/containers/skopeo/blob/main/docs/skopeo-list-tags.1.md
- Skopeo inspect man page: https://github.com/containers/skopeo/blob/main/docs/skopeo-inspect.1.md
- CNCF Distribution garbage collection documentation: https://distribution.github.io/distribution/about/garbage-collection/
- CNCF Distribution configuration documentation: https://distribution.github.io/distribution/about/configuration/
- Podman login documentation: https://docs.podman.io/en/v5.6.0/markdown/podman-login.1.html

## Issues Found
- The post stated that deleting by tag removes only a specific tag reference, and that deleting by digest is required to remove the actual image layers. Current Skopeo documentation says deleting a tag resolves it to a digest and deletes the manifest by digest, which may affect other tags pointing to that manifest. I updated the relevant wording to describe manifest deletion and the need for garbage collection to reclaim unreferenced layers.
- The summary described Skopeo as removing container images from registries. I adjusted this to "container image manifests" to match Skopeo and Docker Distribution behavior more precisely.

## Review Notes
- The command syntax for `skopeo delete`, `skopeo list-tags`, `skopeo inspect`, `--creds`, and `--tls-verify=false` matches current Skopeo documentation.
- `podman login` is an acceptable authentication setup because Skopeo can use credentials written by Podman, Buildah, Skopeo, or Docker login.
- The garbage collection advice is correct for Docker Distribution / CNCF Distribution registries: deletion marks manifests or blobs for removal, and disk space is reclaimed by running registry garbage collection while the registry is stopped or in read-only mode.
