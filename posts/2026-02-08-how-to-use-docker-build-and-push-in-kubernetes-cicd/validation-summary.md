# Validation Summary: How to Use Docker Build and Push in Kubernetes CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Kubernetes Jobs, Secrets, Services, and StatefulSets
- Kaniko
- BuildKit and buildctl
- Docker Buildx
- GitHub Actions and Actions Runner Controller
- Tekton Pipelines
- Container registry caching

## Sources Consulted
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Volumes documentation for `hostPath` security warnings: https://kubernetes.io/docs/concepts/storage/volumes/
- Kaniko README, including archived repository notice, context support, caching flags, and limitations: https://github.com/GoogleContainerTools/kaniko/blob/main/README.md
- BuildKit README and Kubernetes examples: https://github.com/moby/buildkit and https://github.com/moby/buildkit/tree/master/examples/kubernetes
- Docker Build cache backends documentation: https://docs.docker.com/build/cache/backends/
- Docker Buildx CLI reference: https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Build with GitHub Actions cache documentation: https://docs.docker.com/build/ci/github-actions/cache/
- Docker GitHub Actions repositories for current action versions: https://github.com/docker/build-push-action, https://github.com/docker/setup-buildx-action, and https://github.com/docker/login-action
- GitHub Actions checkout action README: https://github.com/actions/checkout
- GitHub Actions Runner Controller documentation: https://docs.github.com/en/actions/concepts/runners/actions-runner-controller
- Tekton Pipeline API documentation: https://tekton.dev/docs/pipelines/pipeline-api/
- Tekton Kaniko build and push guide: https://tekton.dev/docs/how-to-guides/kaniko-build-push/

## Issues Found
- The introduction implied all listed tools avoid privileged containers. Updated it to clarify that some tools avoid privileged containers, while others, such as the shown BuildKit daemon configuration, may require elevated permissions depending on the mode.
- The Kaniko section called Kaniko "recommended" and described it as Google's current tool. Updated the heading and description to reflect that the original `GoogleContainerTools/kaniko` repository was archived in 2025 and teams should confirm support requirements before standardizing on it.
- The BuildKit TCP daemon example exposed BuildKit over unauthenticated TCP. Added mTLS flags, a certificate secret mount, and matching `buildctl` client TLS flags because the official BuildKit documentation warns that unauthenticated TCP exposure is dangerous.
- The GitHub Actions workflow used older action major versions. Updated `actions/checkout`, `docker/setup-buildx-action`, `docker/login-action`, and `docker/build-push-action` to current documented major versions.
- The GitHub Actions workflow used `runs-on: self-hosted` while discussing ARC. Updated it to target an ARC runner scale set label placeholder.
- The BuildKit inline cache example imported cache from `myuser/myapp:cache` but only pushed `myuser/myapp:v1.0`. Updated it to import from and also push `myuser/myapp:latest`, matching Docker's inline cache pattern where cache metadata is embedded in the pushed image.
- The conclusion overstated Kaniko as the simplest, most secure approach for most teams, claimed zero privileged access while supporting all Dockerfile features, and promised seconds-long builds. Reworded it to a narrower, technically accurate summary.

## Review Notes
The examples remain illustrative and still require environment-specific setup, such as namespaces, RBAC, registry credentials, BuildKit certificate generation, installed Tekton Tasks, and deployment permissions. The Tekton example is structurally valid as a pipeline sketch, but the referenced `git-clone`, `kaniko`, and `kubernetes-actions` Tasks must be installed in the cluster with compatible params and workspaces.
