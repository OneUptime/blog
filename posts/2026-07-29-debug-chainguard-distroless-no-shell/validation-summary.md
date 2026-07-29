# Validation Summary: How to Debug a Chainguard Distroless Container When `/bin/sh` Is Missing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Chainguard Containers
- Chainguard Python and Wolfi Base container images
- Distroless and development container variants
- Docker CLI and Docker Buildx
- Kubernetes Pods and ephemeral containers
- `kubectl debug`
- Linux process namespaces and `/proc/<pid>/root`
- Software bills of materials (SBOMs) and image provenance

## Sources Consulted
- Chainguard Academy, Debugging distroless container images — https://edu.chainguard.dev/chainguard/chainguard-images/troubleshooting/debugging-distroless-images/
- Chainguard Academy, Chainguard container variants — https://edu.chainguard.dev/chainguard/chainguard-images/about/differences-development-production/
- Chainguard Python container overview — https://images.chainguard.dev/directory/image/python/overview
- Chainguard Academy, Using the Chainguard Console — https://edu.chainguard.dev/platform/console/
- Kubernetes, Ephemeral Containers — https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- Kubernetes, Debug Running Pods — https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes, `kubectl debug` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes, Pod API reference (`EphemeralContainer`) — https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/#EphemeralContainer
- Kubernetes, Share Process Namespace between Containers in a Pod — https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace/
- Kubernetes, Pod Security Standards — https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes, kubectl Quick Reference — https://kubernetes.io/docs/reference/kubectl/quick-reference/
- Docker CLI reference, `docker image inspect` — https://docs.docker.com/reference/cli/docker/image/inspect/
- Docker CLI reference, `docker container run` — https://docs.docker.com/reference/cli/docker/container/run/
- Docker CLI reference, `docker buildx imagetools inspect` — https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/
- Docker CLI reference, `docker image history` — https://docs.docker.com/reference/cli/docker/image/history/

## Issues Found
1. **The process-namespace condition was imprecise**: The original text referred generally to the runtime sharing the target process namespace. Updated it to state that `--target` must be supported and must place the debug container in the target container's process namespace, matching the Kubernetes API and `kubectl debug` documentation.
2. **The target-filesystem example assumed an `/app` directory**: `/proc/1/root/app` is not present in every target image. Changed the listing command to `/proc/1/root/`, which demonstrates access without assuming an application-specific filesystem layout.
3. **The event command sorted on a legacy timestamp field**: Replaced `.lastTimestamp` with `.metadata.creationTimestamp`, the field used by the current Kubernetes kubectl quick reference. The events.k8s.io/v1 API replaced the deprecated last-timestamp model with `eventTime` and `series.lastObservedTime`, while metadata creation time remains consistently available for this generic listing command.
4. **The first local image inspection assumed that the image had already been pulled**: `docker image inspect` reads the local image store and does not pull a missing image. Added `docker pull "$IMAGE"` before the inspection so the command sequence also works on a host without the image cached.

## Review Notes
- Current Linux AMD64 registry manifests for `cgr.dev/chainguard/python:latest`, `cgr.dev/chainguard/python:latest-dev`, and `cgr.dev/chainguard/wolfi-base:latest` were successfully inspected. The Python runtime and development variants currently declare UID 65532 and `/usr/bin/python` as their entrypoint; Wolfi Base declares `/bin/sh -l` as its command and UID 0.
- The current Chainguard Python documentation confirms that `latest` is the minimal shell-free runtime variant and that `latest-dev` includes `bash`, `ash`, `sh`, `apk`, `pip`, and `uv`.
- The Docker and kubectl command syntax and flags were checked against official references and locally installed CLI help. Remote manifest inspection worked, but container execution could not be exercised because the local Docker daemon was unavailable.
- Chainguard tags such as `latest` and `latest-dev` are floating tags. The post correctly warns readers to compare digests, versions, and architectures rather than assuming two pulls made at different times are equivalent.
- Access through `/proc/<pid>/root` remains runtime-, namespace-, and permission-dependent, as the post explains. Ephemeral containers also do not automatically copy the target container's volume mounts.
