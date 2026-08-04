# `COPY --from` External Images: Pin Digests, Not Mutable Tags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Dockerfile, COPY, Image Digests, Multi-Stage Build, Supply Chain Security, Reproducible Builds

Description: Treat external copy sources as supply-chain inputs by pinning a reviewed digest, choosing the correct platform scope, recording provenance, and updating deliberately.

---

`COPY --from` can read from an image that is not declared as a local Dockerfile stage. Docker pulls that image when necessary and copies the selected path from its filesystem root. If the source uses a mutable tag, rebuilding the same commit can silently copy different bytes.

Pinning the external image's digest turns that input into an immutable content reference. Keep a human-readable tag beside the digest so reviewers can see the intended release.

## Use a Tag-and-Digest Reference

This valid example copies the CA bundle from a specific multi-platform Alpine image index current at the time of writing:

```dockerfile
# syntax=docker/dockerfile:1
FROM scratch
COPY --from=alpine:3.23@sha256:fd791d74b68913cbb027c6546007b3f0d3bc45125f797758156952bc2d6daf40 \
  /etc/ssl/certs/ca-certificates.crt \
  /etc/ssl/certs/ca-certificates.crt
```

The tag documents intent; the digest controls identity. Before adopting this exact reference, independently confirm the publisher, current policy, and desired update level. A digest does not expire or follow security fixes, so dependency automation or a scheduled review must propose new values.

For a larger tool source, declare the external image as a named stage:

```dockerfile
ARG TOOL_IMAGE=registry.example.com/acme/migrator:4.7.2@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
FROM ${TOOL_IMAGE} AS migrator

FROM debian:bookworm-slim AS runtime
COPY --from=migrator --chmod=0555 \
  /usr/local/bin/migrate /usr/local/bin/migrate
ENTRYPOINT ["/usr/local/bin/migrate"]
```

The 64-hex digest in this private-registry template demonstrates syntax and must be replaced by the actual manifest or index digest. Supplying the reference as a global `ARG` makes updates easy, but release CI should restrict or record overrides so an unreviewed build argument cannot change the source silently.

## Resolve and Record the Digest

Inspect a public tag with Buildx:

```bash
docker buildx imagetools inspect alpine:3.23
```

Record the top-level digest for a multi-platform image index when the Dockerfile must support several target platforms. BuildKit can select the matching platform manifest from that pinned index. A platform-specific manifest digest pins one architecture. If it does not match the requested target, current BuildKit can emit an `InvalidBaseImagePlatform` warning and continue, so CI must treat that warning as a failure rather than assuming the build will stop.

After updating the Dockerfile, build every supported platform and review the source image's release notes and contents. Do not obtain a digest from an untrusted mirror and assume it identifies the intended publisher.

## Understand What `COPY` Does and Does Not Import

The source path is always resolved from the external image's filesystem root:

```dockerfile
COPY --from=vendor.example/tool@sha256:<reviewed-digest> \
  /opt/tool/bin/tool /usr/local/bin/tool
```

Only the selected filesystem content enters the current stage. The external image's `ENV`, `USER`, labels, entrypoint, health check, and package database are not merged into the output image. If the copied binary relies on shared libraries, configuration, licenses, CA roots, or plugins, copy or install that complete runtime closure deliberately.

Pinning verifies content identity, not compatibility or trustworthiness. Scan the resulting image, retain license notices, verify signatures or attestations where policy requires them, and test the copied artifact on every target platform.

## Tags Are Useful but Not Immutable

Docker's best-practices documentation states that tags are mutable. A publisher can move `tool:4.7.2`, and `--pull` asks Docker to resolve the latest value of that tag. A digest reference always selects the same content; `--pull` does not advance it.

That reproducibility creates an update obligation. A sound workflow is:

1. monitor the upstream tag or security feed;
2. resolve the proposed new digest from the trusted registry;
3. review the content, release notes, and platform coverage;
4. update the tag-and-digest pair in a pull request;
5. rebuild, scan, and test every output platform;
6. retain the change as the audit trail.

Avoid digest-only references in review-facing files when losing the release label would make maintenance harder. Avoid tag-only references when rebuilds must be reproducible.

## Prevent Name Ambiguity

Prefer local stage aliases that cannot be confused with external image names:

```dockerfile
FROM registry.example.com/acme/tool:4.7.2@sha256:<reviewed-digest> AS external_tool
FROM scratch AS output
COPY --from=external_tool /opt/tool/artifact /artifact
```

If `COPY --from=build` does not match a local stage or named context, Docker may try to resolve `build` as an image reference. A registry pull error for an expected stage name often indicates a misspelled alias.

## Official Documentation

- [Dockerfile COPY from an image, stage, or context](https://docs.docker.com/reference/dockerfile/#copy---from)
- [Docker multi-stage builds and external images](https://docs.docker.com/build/building/multi-stage/#use-an-external-image-as-a-stage)
- [Docker best practices for pinning image digests](https://docs.docker.com/build/building/best-practices/#pin-base-image-versions)
- [Docker Buildx imagetools inspect](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/)
- [Docker pull by digest](https://docs.docker.com/reference/cli/docker/image/pull/#pull-an-image-by-digest-immutable-identifier)
