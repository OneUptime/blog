# Validation Summary: How to Understand Docker Image Manifest Specification

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker image manifests
- Docker Registry HTTP API V2
- OCI image manifest and image index
- Docker Buildx multi-platform builds
- Docker CLI manifest commands
- crane
- skopeo

## Sources Consulted
- Docker CLI `docker manifest` documentation: https://docs.docker.com/reference/cli/docker/manifest/
- Docker CLI `docker buildx build` documentation: https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker multi-platform build documentation: https://docs.docker.com/build/building/multi-platform/
- Docker Image Manifest V2 Schema 2 specification: https://distribution.github.io/distribution/spec/manifest-v2-2/
- OCI Image Manifest specification: https://github.com/opencontainers/image-spec/blob/main/manifest.md
- OCI Image Index specification: https://github.com/opencontainers/image-spec/blob/main/image-index.md
- crane manifest command documentation: https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane_manifest.md
- skopeo inspect documentation: https://github.com/podman-container-tools/skopeo/blob/main/docs/skopeo-inspect.1.md
- Local Docker CLI help for `docker manifest inspect`, `docker manifest create`, `docker manifest annotate`, `docker manifest push`, `docker buildx build`, and `docker inspect`.

## Issues Found
- The Docker Hub `curl` example requested only `application/vnd.docker.distribution.manifest.v2+json`. For a multi-architecture tag such as `nginx:latest`, clients should also advertise support for Docker manifest lists and OCI indexes/manifests so the registry can return the correct top-level document. Updated the `Accept` header to include Docker manifest list, Docker manifest, OCI index, and OCI manifest media types.
- The config blob fetch example said to use the digest from "the manifest", which is ambiguous after fetching a manifest list. Updated the note to specify that the digest must come from a platform-specific manifest's `config` descriptor.
- The local `docker inspect --format '{{json .Config}}'` example was followed by text implying `.Config` includes layer diff IDs. Docker exposes runnable configuration under `.Config` and layer information separately under `.RootFS`; the image config blob itself contains `rootfs.diff_ids`. Updated the explanation to distinguish these.

## Review Notes
Docker marks the `docker manifest` command group as experimental in the current CLI documentation and local help output. The commands and flags used in the post are still documented and valid, but future Docker releases may change this command group.
