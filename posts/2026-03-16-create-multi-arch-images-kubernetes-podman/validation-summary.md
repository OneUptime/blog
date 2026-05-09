# Validation Summary: How to Create Multi-Arch Images for Kubernetes with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman manifest lists and OCI image indexes
- Containerfile / Dockerfile syntax
- Go cross-compilation with GOOS and GOARCH
- QEMU user-mode emulation
- Kubernetes Deployments, Pods, node selectors, and container image pulling
- Skopeo
- GNU Make

## Sources Consulted
- Podman build documentation: https://docs.podman.io/en/latest/markdown/podman-build.1.html
- Podman manifest add documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-add.1.html
- Podman manifest create documentation: https://docs.podman.io/en/stable/markdown/podman-manifest-create.1.html
- Podman manifest push documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- Kubernetes image documentation, including multi-architecture image indexes: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes node documentation, including scheduling with node labels/selectors: https://kubernetes.io/docs/concepts/architecture/nodes/
- Kubernetes node labels populated by the kubelet: https://kubernetes.io/docs/reference/node/node-labels/
- Skopeo project documentation for image inspection and docker:// transports: https://github.com/containers/skopeo

## Issues Found
- The Containerfile claimed that Podman automatically sets `TARGETOS` and `TARGETARCH` from `--platform`. The Podman build documentation covers `--platform` and `--build-arg`, but does not document those Docker BuildKit-style automatic build args. Because the Containerfile defaulted `TARGETARCH` to `amd64`, the original examples could build an amd64 Go binary into every platform image. I changed the text to say those args are passed from the build command, and updated both the shell script and Makefile to pass `TARGETOS` and `TARGETARCH` explicitly.
- The Makefile used `$(subst $(comma), ,$(PLATFORMS))` without defining `comma`, so the platform list splitting was not valid GNU Make syntax for this use. I added `comma := ,`.
- The summary described QEMU emulation as being used "for cross-compilation." For this Go example, `GOOS` and `GOARCH` perform the cross-compilation; QEMU is needed when foreign-architecture `RUN` steps must execute. I changed the wording to "foreign-architecture build steps."

## Review Notes
Podman was not installed in the local environment, so CLI behavior was verified against the current official Podman documentation rather than local `--help` output. The Kubernetes Deployment and Pod snippets use current API versions and the standard `kubernetes.io/arch` node label. The post could be improved in the future by mentioning Podman's `podman build --manifest` workflow for multi-platform builds, but the existing manifest-list approach is still valid.
