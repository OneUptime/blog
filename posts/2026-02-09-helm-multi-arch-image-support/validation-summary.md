# Validation Summary: How to Build Helm Charts with Multi-Architecture Image Support Using Values

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm charts and Go templates
- Kubernetes Deployments, node selectors, node affinity, tolerations, init containers, and sidecars
- Docker multi-platform images and manifest lists
- Docker Buildx and Dockerfile platform build arguments
- GitHub Actions for Docker image builds
- Go container builds
- Alpine Linux container images

## Sources Consulted
- Docker multi-platform builds: https://docs.docker.com/build/building/multi-platform/
- Docker multi-platform images with GitHub Actions: https://docs.docker.com/build/ci/github-actions/multi-platform/
- Docker buildx build CLI reference: https://docs.docker.com/reference/cli/docker/buildx/build/
- Dockerfile reference for automatic platform ARGs: https://docs.docker.com/reference/builder
- Kubernetes node labels populated by kubelet: https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes assigning Pods to nodes: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Helm template function list: https://helm.sh/docs/chart_template_guide/function_list/
- Go release history and support policy: https://go.dev/doc/devel/release
- Alpine Linux release branches: https://alpinelinux.org/releases/
- Docker GitHub Actions repositories and examples: https://github.com/docker/build-push-action, https://github.com/docker/metadata-action, https://github.com/docker/login-action
- GitHub checkout action: https://github.com/actions/checkout

## Issues Found
- The values example said an empty `image.platform` would "auto-detect" the platform. Helm templates do not know the node architecture at render time, and the default behavior in the post is actually to use the image tag and let the container runtime select the manifest-list entry. Changed the comment to say it uses the default image tag if empty.
- The helper description said it selected an image based on node architecture. The template only selects based on values, not live node data. Updated the sentence to describe an optional platform override.
- The default values included `tolerations`, but the Deployment template did not render them. Added the standard `with .Values.tolerations` block so the values key works as described.
- The GitHub Actions workflow used older major versions of Docker and checkout actions. Updated to current major versions used by current official Docker examples: `actions/checkout@v4`, `docker/setup-qemu-action@v4`, `docker/setup-buildx-action@v4`, `docker/login-action@v4`, `docker/metadata-action@v6`, and `docker/build-push-action@v7`.
- The Dockerfile used `golang:1.21` and `alpine:3.18`; both are outside current support as of the validation date. Updated them to `golang:1.26` and `alpine:3.23`.
- The chart README example used nested Markdown fences incorrectly and closed YAML examples with `bash` / `text` fences. Replaced the outer fence with a four-backtick Markdown fence and corrected the inner fence closings.

## Review Notes
Docker Buildx flags used in the workflow (`platforms`, `push`, `tags`, `labels`, `cache-from`, and `cache-to`) match current Docker action and CLI documentation. Kubernetes `kubernetes.io/arch`, `nodeSelector`, `nodeAffinity`, and toleration usage match current Kubernetes docs. Helm and kubectl are not installed in this workspace, so local `helm template` / Kubernetes API validation was not run.
