# Validation Summary: How to Debug a ko Container That Has No Shell, Package Manager, or Debug Utilities

## Status
validated

## Post Type
Technical troubleshooting guide with Docker, Kubernetes, and ko command examples.

## Technologies Covered
- Go build metadata, CGO, diagnostics, pprof, and timezone data
- ko image builds, static assets, minimal base images, and debug mode
- Docker containers, image inspection, file copying, and port publishing
- Kubernetes logs, termination state, probes, ephemeral containers, namespaces, and RBAC
- Delve and BusyBox diagnostic utilities
- Linux executable loading, signals, permissions, and memory diagnostics

## Sources Consulted
- [ko debugging](https://ko.build/features/debugging/)
- [ko get started and binary layout](https://ko.build/get-started/)
- [ko build CLI reference](https://ko.build/reference/ko_build/)
- [ko configuration and local publishing](https://ko.build/configuration/)
- [ko static assets and KO_DATA_PATH](https://ko.build/features/static-assets/)
- [ko limitations](https://ko.build/advanced/limitations/)
- [ko root CA certificates](https://ko.build/advanced/root-ca-certificates/)
- [Docker container inspect](https://docs.docker.com/reference/cli/docker/container/inspect/)
- [Docker container logs](https://docs.docker.com/reference/cli/docker/container/logs/)
- [Docker container create](https://docs.docker.com/reference/cli/docker/container/create/)
- [Docker container cp](https://docs.docker.com/reference/cli/docker/container/cp/)
- [Docker image inspect](https://docs.docker.com/reference/cli/docker/image/inspect/)
- [Docker Buildx imagetools inspect](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/)
- [Docker port publishing](https://docs.docker.com/engine/network/port-publishing/)
- [Kubernetes debugging running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Kubernetes ephemeral containers](https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/)
- [kubectl logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [kubectl debug](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/)
- [kubectl JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes Pod lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes memory resources and OOM termination](https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/)
- [Kubernetes termination messages](https://kubernetes.io/docs/tasks/debug/debug-application/determine-reason-pod-failure/)
- [Go version command](https://pkg.go.dev/cmd/go#hdr-Print_Go_version)
- [Go diagnostics](https://go.dev/doc/diagnostics)
- [Go time/tzdata](https://pkg.go.dev/time/tzdata)
- [Go net/http/pprof](https://pkg.go.dev/net/http/pprof)
- [BusyBox utility documentation](https://busybox.net/downloads/BusyBox.html)
- [Docker Official Image BusyBox versions](https://github.com/docker-library/busybox/blob/master/versions.json)
- [Linux execve manual](https://man7.org/linux/man-pages/man2/execve.2.html)
- Local `kubectl logs --help`, `docker cp --help`, and `file --version`; a local shell check of SIGKILL exit status.

## Issues Found
1. **Failure timing and evidence:** The text grouped probe failures and OOM kills with failures before application startup. Distinguished pre-start mount/image-pull failures from probes after container startup and directed readers to container termination state for `OOMKilled`.
2. **Registry metadata wording:** Clarified that the unformatted Buildx command inspects manifests. The adjacent local image-inspect command displays application image configuration; the two outputs are different.
3. **Static asset extraction:** Copying `/ko-app` extracts the binary, not bundled `kodata`. Corrected the explanation to use the image's `KO_DATA_PATH` and copy that directory before removing the temporary container.
4. **Repeatable copy destination:** An existing `/tmp/ko-app` directory made the original copy nest another `ko-app` directory, invalidating the following binary paths on repeat runs. Added directory creation and copied `/ko-app/.` so the contents land directly in the intended directory.
5. **Local debugger exposure and startup:** The original Docker port mapping published Delve on all host interfaces despite describing local use. Bound it to `127.0.0.1`, updated the client address, and clarified that execution initially waits for the debugger to continue.
6. **Exit-status interpretation:** Exit 137 alone does not establish an OOM kill. Clarified its common SIGKILL interpretation and the need to confirm the termination reason before following the memory diagnostics.
7. **Conclusion command:** Replaced the incomplete `ko --debug` shorthand with the documented `ko build --debug` command.

## Review Notes
- This was a documentation and command-syntax review. No application source, target image, or example Kubernetes workload was supplied for end-to-end execution; no production containers or clusters were modified.
- Confirmed documented support for `--debug`, `--disable-optimizations`, local publishing through `KO_DOCKER_REPO=ko.local`, the default binary layout, and Delve port 40000. The `api` binary path assumes the example `./cmd/api` main package.
- The Kubernetes JSONPath intentionally reads the previous termination state; missing values are expected if no previous termination exists. `--previous` requires a previous container instance with retained logs.
- Ephemeral process visibility remains runtime-dependent. Cluster admission policies and RBAC may reject debugging containers, and protected clusters should replace the illustrative BusyBox tag with an approved digest. The DNS example assumes the cluster domain is `cluster.local`.
- Go build metadata is conditional on what the toolchain embedded. The existing caution about custom version variables and OCI labels is appropriate.
- Minimal-image TLS, timezone, ELF loader, permissions, and diagnostic endpoint guidance is technically sound. A Pod-local HTTP request checks the application but does not reproduce every kubelet probe condition.
- The post's six official documentation links resolved to the intended resources; the author link redirects to the matching GitHub profile. No deprecated flags were identified in the examples reviewed.
- All shell code blocks passed Bash syntax checking, and validation.json was parsed to verify its exact fields and date. The local SIGKILL check returned status 137 without an OOM condition.
