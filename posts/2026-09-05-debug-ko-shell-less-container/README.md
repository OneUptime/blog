# How to Debug a ko Container That Has No Shell, Package Manager, or Debug Utilities

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Debugging, Kubernetes, Container Security, Distroless

Description: Diagnose a minimal ko container with logs, metadata inspection, ephemeral containers, filesystem export, and Delve instead of modifying it.

---

A default `ko` application image is deliberately minimal. Trying `docker exec CONTAINER sh`, `apt install`, or `kubectl exec POD -- bash` may fail because there is no shell or package manager. That absence is not image corruption; it is part of reducing runtime surface.

Debug the process from the outside, or build a separate development image. Do not mutate a production replica and call the result a fix.

## Begin with Runtime Evidence

For Docker, collect state before restarting the container:

```bash
docker inspect api > /tmp/api-inspect.json
docker logs --timestamps api
docker inspect api --format '{{json .State}}'
```

For Kubernetes:

```bash
kubectl describe pod -n payments api-abc123
kubectl logs -n payments api-abc123 -c api --timestamps
kubectl logs -n payments api-abc123 -c api --previous --timestamps
kubectl get pod -n payments api-abc123 \
  -o jsonpath='{range .status.containerStatuses[*]}{.name}{" exit="}{.lastState.terminated.exitCode}{" reason="}{.lastState.terminated.reason}{"\n"}{end}'
```

`--previous` is essential after a crash loop because the current container may not have produced the useful failure. Events can reveal failed mounts and image pulls before application code starts, as well as probe failures after the container starts. Inspect container termination state for `OOMKilled`.

Confirm the exact deployed image ID. A tag in the workload specification and a digest in status can differ after tag movement.

## Inspect Image Metadata Without Running a Shell

Image configuration is data and does not require starting the application. Buildx can inspect manifests for a registry reference, while `docker image inspect` requires the image to be present in the selected local daemon:

```bash
docker buildx imagetools inspect "$IMAGE_REF"
docker image inspect "$IMAGE_REF" --format '{{json .Config}}'
```

If the image is local, create a stopped container and copy known files without starting its entrypoint:

```bash
cid=$(docker create "$IMAGE_REF")
mkdir -p /tmp/ko-app
docker cp "$cid:/ko-app/." /tmp/ko-app
docker rm "$cid"
```

This copies the application binary. To examine bundled `kodata`, read `KO_DATA_PATH` from the image configuration and copy that directory separately before removing the stopped container. Avoid copying secrets from live writable layers into shared incident artifacts.

The Go binary itself carries useful build information:

```bash
go version -m /tmp/ko-app/api
file /tmp/ko-app/api
```

`go version -m` can display module and VCS settings embedded by the Go toolchain. It does not guarantee that custom `-X` variables or OCI labels match; inspect those separately.

## Use an Ephemeral Debug Container in Kubernetes

Kubernetes ephemeral containers let a tooling image join namespaces of an existing Pod without changing the original image:

```bash
kubectl debug -n payments -it pod/api-abc123 \
  --image=busybox:1.37 \
  --target=api
```

The exact visibility depends on container runtime support and the Pod's process-namespace settings. The debug container does not automatically share the target container's root filesystem. It does share selected Pod namespaces, making network checks such as these possible:

```sh
wget -S -O- http://127.0.0.1:8080/healthz
nslookup dependency.payments.svc.cluster.local
ps
# After identifying the target PID:
cat /proc/TARGET_PID/status
```

Use an approved, digest-pinned debug image in protected clusters. Ephemeral containers can expose process, network, and mounted-data context, so RBAC for `pods/ephemeralcontainers` should be restricted and audited.

If the Pod never starts or the cluster does not support ephemeral containers, `kubectl debug --copy-to` can make a diagnostic copy with changed settings. Be explicit that it is a copy; traffic, volumes, identity, and timing may differ from the failing replica.

## Build a Delve Image with ko

For source-level development, `ko` has a dedicated debug mode:

```bash
export KO_DOCKER_REPO=ko.local
debug_image_ref=$(ko build ./cmd/api --debug)
```

`--debug` includes Delve, changes the entrypoint to run the application under Delve, listens on port `40000`, and retains information needed for debugging. Run it locally:

```bash
docker run --rm -p 127.0.0.1:40000:40000 "$debug_image_ref"
```

Connect a Delve-compatible client to `127.0.0.1:40000` and continue execution; the application initially waits for the debugger. This mode is explicitly for development and must not be used for production: a remotely accessible debugger can control the process.

For debugging without Delve, `--disable-optimizations` can make stack traces and stepping easier, at a performance cost. Keep release and debug images under distinct tags and digests.

## Add Diagnostics to the Application

The most reliable minimal-image debugging surface is the Go process itself:

- emit structured logs to standard output and error;
- expose narrowly scoped readiness and liveness endpoints;
- include a version endpoint with commit and build metadata;
- publish useful counters, latency histograms, and error attributes;
- enable `net/http/pprof` only on an authenticated or private listener;
- handle termination signals and log shutdown deadlines.

Avoid logging credentials, tokens, request bodies, or customer data. A debug endpoint that is safe on localhost may be exposed by a Service or sidecar unexpectedly.

For crash diagnosis, configure the orchestrator to retain termination messages and centralize logs. Core dumps require additional kernel, filesystem, and security policy configuration; plan them before the incident rather than weakening a Pod ad hoc.

## Diagnose Common Minimal-Image Symptoms

| Symptom | Better diagnostic |
| --- | --- |
| `exec: sh: not found` | Do not exec a shell; use metadata, logs, or an ephemeral container |
| Executable exists but says `no such file` | Check ELF loader and CGO library compatibility |
| HTTPS fails with unknown authority | Inspect trust roots and corporate CA configuration |
| Timezone lookup fails | Supply tzdata or import Go's `time/tzdata` where suitable |
| Health probe fails | Call the endpoint from the Pod network namespace |
| Exit 137 / `OOMKilled` | Exit 137 commonly indicates SIGKILL, not necessarily OOM; confirm the termination reason, then inspect memory limits, working set, and Go heap telemetry |
| Permission denied | Inspect effective user, volume modes, and security context |

A package manager would not directly solve most of these problems.

## Use a Larger Base Only for an Explicit Contract

If on-call policy genuinely requires a shell inside every application container, configure a reviewed base that provides it. Understand the cost: more files, packages, CVEs, and patching responsibility. An external debug image often provides better tools without expanding every production workload.

Do not use a mutable `debug` tag for incident evidence. Record both the failing image digest and the diagnostic image digest so someone else can reproduce the session.

## Conclusion

A shell-less container changes the debugging method, not the amount of available evidence. Capture logs, exit state, image metadata, and the deployed digest; inspect files from outside; join namespaces with a controlled ephemeral container; and use `ko build --debug` for a separate Delve-enabled development build. Keep production images immutable throughout the investigation.

## Official Documentation

- [ko: Debugging](https://ko.build/features/debugging/)
- [ko: Get Started and Default Image Layout](https://ko.build/get-started/)
- [Kubernetes: Debug Running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Kubernetes: Ephemeral Containers](https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/)
- [Go: `go version` Command](https://pkg.go.dev/cmd/go#hdr-Print_Go_version)
- [Go: Diagnostics](https://go.dev/doc/diagnostics)
