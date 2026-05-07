# Validation Summary: How to Run Podman Inside Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Kubernetes Pods, Jobs, volumes, ResourceQuota, and Pod Security Standards
- Tekton Tasks
- Jenkins Kubernetes plugin pipelines
- Buildah
- OCI container image builds and multi-architecture manifests

## Sources Consulted
- Podman documentation: rootless mode, storage driver behavior, and `STORAGE_DRIVER`: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman documentation: `podman build --platform` and `--manifest`: https://docs.podman.io/en/v4.3/markdown/podman-build.1.html
- Podman documentation: `podman system events --stream`: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman documentation: Kubernetes YAML generation: https://docs.podman.io/en/v5.8.0/markdown/podman-kube-generate.1.html
- Red Hat technical article on running Podman inside Kubernetes: https://www.redhat.com/en/blog/podman-inside-kubernetes
- Kubernetes documentation: ResourceQuota fields: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes documentation: Pod Security Standards namespace labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes documentation: `hostPath` volumes and `CharDevice`: https://kubernetes.io/docs/concepts/storage/volumes/
- Tekton documentation: Task API, params, workspaces, scripts, and security contexts: https://tekton.dev/docs/pipelines/tasks/
- Jenkins Kubernetes plugin documentation: YAML pod templates and `container` step: https://plugins.jenkins.io/kubernetes/
- Buildah documentation: `buildah build`: https://github.com/containers/buildah/blob/main/docs/buildah-build.1.md
- Buildah release notes confirming the stable Buildah image location: https://buildah.io/releases/2024/07/26/Buildah-version-v1.37.0.html

## Issues Found
- The Docker-in-Docker comparison said Podman "eliminates" the security risk. This was too broad because many examples in the post still use privileged pods or host device access. Changed the wording to say Podman reduces some risks.
- The Tekton Task used `apiVersion: tekton.dev/v1beta1`. Tekton documents `tekton.dev/v1` as the stable Task API, so the example was updated to `tekton.dev/v1`.
- The Buildah section said to use Buildah directly but the Job used the Podman image and `podman build/login/push`. Updated the image to `quay.io/buildah/stable` and the commands to `buildah build`, `buildah login`, and `buildah push`.
- The multi-architecture build example built separate tagged images and assembled a manifest manually. Podman documentation recommends using `--manifest` instead of `--tag` when building for multiple platforms in one build command, so the example now uses `podman build --platform linux/amd64,linux/arm64 --manifest myapp:latest`.
- The troubleshooting command `podman system events --since 1h` would continue streaming by default. Added `--stream=false` so it prints recent events and exits.

## Review Notes
- The rootless Podman example depends on cluster policy allowing `/dev/fuse` exposure via `hostPath`; some clusters instead require a device plugin or stricter admission configuration.
- The multi-architecture example may require binary emulation, such as `qemu-user-static`, if the Containerfile has `RUN` steps for non-native architectures.
