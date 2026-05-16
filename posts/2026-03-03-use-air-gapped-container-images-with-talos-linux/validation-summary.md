# Validation Summary: How to Use Air-Gapped Container Images with Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- Docker CLI
- Docker Registry
- Container registry mirrors
- Air-gapped Kubernetes deployments

## Sources Consulted
- Talos v1.7 CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli
- Talos v1.7 machine configuration reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config
- Talos official air-gapped environments guide: https://docs.siderolabs.com/talos/v1.10/platform-specific-installations/air-gapped
- Talos image cache / registry mirror documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/images-container-runtime/image-cache-registry-mirror
- Docker image CLI reference: https://docs.docker.com/reference/cli/docker/image/
- Docker image tag reference: https://docs.docker.com/engine/reference/commandline/tag/
- Docker image load reference: https://docs.docker.com/reference/cli/docker/image/load/
- Docker image push reference: https://docs.docker.com/engine/reference/commandline/image_push/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The post used `talosctl images --talos-version v1.7.0`, which is not the Talos 1.7 CLI command for listing default images. Changed it to `talosctl image default`.
- The post listed `containerd` as a Talos system container image. Talos does not require mirroring a `containerd` image in the default image list. Updated the wording and example list to include installer, kubelet, and CNI installer images.
- The hard-coded image collection list omitted default Talos images such as the installer and CNI-related images. Replaced the fixed list with `talosctl image default > images.txt` and appended workload images.
- The registry push script tagged images as `local-registry.internal:5000/<original-registry>/<repo>:<tag>`, but Talos registry mirrors strip the source registry host when resolving images. Updated the script to strip the source registry host and add `library/` for Docker Hub official images.
- The registry mirror configuration included `tls.insecureSkipVerify` for a plain HTTP endpoint and described it as appropriate when not using TLS. Removed the incorrect TLS block and added a note to use trusted roots for HTTPS registries with private or self-signed certificates.
- The Kubernetes component image overrides used local-registry-prefixed image names, which conflicted with the mirror-based setup. Changed them back to the original image references so Talos can resolve them through the configured mirrors.
- The bootstrap sequence ran `talosctl health` before `talosctl bootstrap`. Moved the health check after bootstrap and added explicit `--endpoints` and `--talosconfig` flags consistent with Talos getting-started guidance.
- The workload verification example used the local registry image path directly. Changed it to use the normal image reference so it verifies the registry mirror path.
- The Talos upgrade example pushed the installer image under the wrong mirrored path and then used a local-registry-prefixed upgrade image. Updated it to push `siderolabs/installer` and use the original `ghcr.io/siderolabs/installer` reference so the configured mirror resolves it.

## Review Notes
The post is now technically valid for the mirror-based air-gapped workflow it describes. For production environments, the local registry should generally use HTTPS with a trusted internal CA instead of plain HTTP.
