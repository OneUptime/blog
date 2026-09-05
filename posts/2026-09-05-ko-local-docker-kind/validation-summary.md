# Validation Summary: How to Load ko Images Directly into Docker or kind Without Pushing to a Registry

## Status
validated

## Post Type
Tutorial / local development guide

## Technologies Covered
- Go and ko v0.19.1
- Docker Engine, Docker CLI contexts, and Docker Desktop
- kind and its container runtime providers
- Kubernetes Deployments, image pull policies, kubectl, and JSONPath
- Container image naming, tags, digests, and platform compatibility

## Sources Consulted
- ko configuration and local publishing: https://ko.build/configuration/
- ko Kubernetes integration: https://ko.build/features/k8s/
- ko build CLI reference: https://ko.build/reference/ko_build/
- ko v0.19.1 release: https://github.com/ko-build/ko/releases/tag/v0.19.1
- ko v0.19.1 naming options: https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/options/publish.go
- ko v0.19.1 publisher selection: https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/resolver.go
- ko v0.19.1 build output: https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/build.go
- ko v0.19.1 Docker publisher: https://github.com/ko-build/ko/blob/v0.19.1/pkg/publish/daemon.go
- ko v0.19.1 kind publisher: https://github.com/ko-build/ko/blob/v0.19.1/pkg/publish/kind.go
- ko v0.19.1 node loading and tagging: https://github.com/ko-build/ko/blob/v0.19.1/pkg/publish/kind/write.go
- ko dependency versions: https://github.com/ko-build/ko/blob/v0.19.1/go.mod
- go-containerregistry v0.21.7 daemon client configuration: https://github.com/google/go-containerregistry/blob/v0.21.7/pkg/v1/daemon/options.go
- kind quick start, named clusters, and image loading: https://kind.sigs.k8s.io/docs/user/quick-start/#loading-an-image-into-your-cluster
- kind v0.32.0 provider selection: https://github.com/kubernetes-sigs/kind/blob/v0.32.0/pkg/cluster/provider.go
- kind Docker node command execution: https://github.com/kubernetes-sigs/kind/blob/v0.32.0/pkg/cluster/internal/providers/docker/node.go
- Docker contexts: https://docs.docker.com/engine/manage-resources/contexts/
- Docker context inspection: https://docs.docker.com/reference/cli/docker/context/inspect/
- Docker image inspection: https://docs.docker.com/reference/cli/docker/image/inspect/
- Docker run options: https://docs.docker.com/reference/cli/docker/container/run/
- Docker daemon information: https://docs.docker.com/reference/cli/docker/system/info/
- Docker container listing and label filtering: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker Desktop VM behavior: https://docs.docker.com/desktop/troubleshoot-and-support/faqs/general/
- Kubernetes image pull policies: https://kubernetes.io/docs/concepts/containers/images/#image-pull-policy
- Kubernetes Deployment rollout behavior: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kubectl JSONPath syntax: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Author link: https://github.com/nawazdhandala

## Issues Found
1. **Docker context selection was inaccurate.** The post said ko follows the active Docker CLI context. The v0.19.1 daemon publisher uses go-containerregistry's environment-configured API client. Corrected the explanation to distinguish `DOCKER_HOST` and the default socket from CLI contexts and `DOCKER_CONTEXT`; added endpoint and environment inspection to the existing troubleshooting block.
2. **The `--local` reference prefix was stated unconditionally.** An existing `KO_DOCKER_REPO` supplies the prefix even when `--local` selects Docker publication. Clarified the unset-environment assumption and override behavior, and noted that import paths are lowercased.
3. **Missing images do not always trigger pulls.** Qualified the failed-node-load explanation: `IfNotPresent` attempts a pull when the image is missing, whereas `Never` fails startup without fetching it.
4. **The inspection command omitted the pull policy it promised to display.** Added `.spec.containers[0].imagePullPolicy` to the existing JSONPath output.
5. **Rollout advice implied a manual rollout was necessary after changing the image reference.** Explained that a changed Deployment Pod template automatically triggers a rollout and advised checking rollout status when old Pods remain.
6. **The kind troubleshooting explanation conflated two publishing clients.** Clarified that Docker-backed kind loading invokes Docker through kind's provider, distinct from ko's direct Docker API publisher.
7. **The manifest used an example import path without identifying the required substitution.** Clarified that readers must use their actual Go main package and save the manifest under the `config/` directory used by the commands.

## Review Notes
- Confirmed both special publishing destinations, cluster-name selection, full-import-path naming, default package-plus-MD5 naming, stdout references versus progress logs, and the `--image-refs` file option. That option requires a file path.
- Confirmed from v0.19.1 source that both local publishers return image-digest-derived hexadecimal tags, and that kind loads all selected nodes sequentially and returns on the first error. The CLI example's claim that local mode always preserves paths remains inconsistent with its implementation; the post correctly calls this out.
- Confirmed the Deployment selector and labels match, `ko apply` forwards arguments after `--`, and `ko resolve` emits resolved YAML. The Docker example assumes an existing Go main package whose service listens on port 8080.
- All five official documentation links in the post resolved to the intended resources; the author link redirects to the expected GitHub profile. GitHub's latest-release endpoint returned v0.19.1 during review.
- The Docker-focused kind examples are appropriate for Docker-backed clusters. ko's embedded kind provider also has runtime autodetection; Docker commands do not inspect clusters backed by another runtime.
- Avoiding an image push does not guarantee an offline build: base images and Go dependencies may still require downloads. No offline guarantee is made in the post.
- Validation used official documentation, versioned source inspection, shell syntax checks, JSON parsing, and diff whitespace checks. No Go application was built, Docker image loaded, or live Kubernetes deployment performed; the post provides illustrative application paths rather than a complete runnable application.
