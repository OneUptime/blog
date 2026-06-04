# Validation Summary: How to Optimize Container Image Layer Caching

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes
- containerd
- Docker and Dockerfile builds
- BuildKit
- Docker Registry
- crictl / cri-tools
- Prometheus metrics
- Go client-go examples
- Linux shell scripting

## Sources Consulted
- Docker Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker BuildKit documentation: https://docs.docker.com/build/buildkit/
- Node.js release schedule and EOL documentation: https://nodejs.org/en/about/releases/ and https://nodejs.org/en/about/eol
- Alpine Linux release branches: https://www.alpinelinux.org/releases/
- Go 1.26 release notes and release history: https://go.dev/doc/go1.26 and https://go.dev/doc/devel/release
- containerd CRI registry configuration: https://containerd.io/docs/1.7/cri/registry/
- containerd hosts.toml registry host configuration: https://containerd.io/docs/main/hosts/
- containerd CRI configuration: https://containerd.io/docs/2.1/cri/config/
- containerd garbage collection documentation: https://containerd.io/docs/2.1/garbage-collection/
- Kubernetes init containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes kubelet configuration API: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes kubelet command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes crictl node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/
- cri-tools crictl command documentation: https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md

## Issues Found
- Dockerfile layer explanation said every Dockerfile instruction creates a layer. Updated it to specify filesystem-changing instructions such as `RUN`, `COPY`, and `ADD`.
- Node Dockerfile used `node:18-alpine`, which is EOL by the validation date. Updated it to `node:22-alpine`.
- Node Dockerfile installed only production dependencies before running `npm run build`, which often breaks builds that depend on devDependencies. Updated it to run `npm ci`, build, then `npm prune --omit=dev`.
- Registry mirror Deployment used two replicas with a single `ReadWriteOnce` PVC. Reduced it to one replica to avoid multi-attach failures.
- containerd mirror configuration used deprecated `registry.mirrors` config and configured one Docker Hub proxy for `gcr.io`. Replaced it with current `config_path` plus a `hosts.toml` example for `docker.io`.
- containerd mirror endpoint used a Kubernetes service DNS name, which host-level containerd usually cannot resolve. Added a note requiring a node-reachable endpoint.
- Kubelet image GC thresholds were incorrectly shown under containerd config. Replaced them with `KubeletConfiguration` fields.
- Custom GC script depended on a non-portable `crictl inspecti .status.usedAt` field and could conflict with kubelet ownership. Replaced it with a limited emergency dangling-image cleanup example.
- Build examples used outdated Go and Alpine base images. Updated Go to `golang:1.26` and Alpine to `alpine:3.22`.
- BuildKit registry TOML used an array-of-tables form for `registry."docker.io"`. Replaced it with a registry table form.
- Prometheus examples used non-standard containerd metric names. Replaced them with documented kubelet image pull and image manager metrics.
- Query commands used unsupported examples such as `kubectl top nodes --sort-by=image_pull_duration` and `crictl stats --image-cache`. Replaced them with Kubernetes events, `crictl imagefsinfo`, and `crictl images --digests`.
- Layer deduplication section showed invalid containerd content/snapshotter settings and an unreliable `crictl images -v` layer parsing script. Replaced it with the default content-addressable behavior and a `ctr` content inspection example.
- Node cache warming YAML claimed init containers pull images in parallel. Updated the comment to state that init containers run sequentially.
- Go Job example omitted required pod template fields for a `batch/v1` Job. Added a regular container and `RestartPolicy: Never`.
- Pause image examples were updated from `registry.k8s.io/pause:3.9` to `registry.k8s.io/pause:3.10`.

## Review Notes
Some examples remain illustrative and require environment-specific values, such as reachable mirror DNS names, storage classes, image names, RBAC permissions, and controller setup. Pre-pull snippets that override container commands still assume the target image contains that command; production implementations should account for distroless or scratch images.
