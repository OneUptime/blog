# Prevent ARM Builders from Shipping the Wrong AMD64 Runtime Binary

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Buildx, ARM64, AMD64, Multi-Platform Builds, Cross-Compilation, BuildKit, ELF

Description: Prevent architecture-label mismatches by aligning the compiler with the target, asserting the produced ELF machine, inspecting the manifest, and testing on AMD64.

---

BuildKit can package an ARM64 binary into an image declared as `linux/amd64`. It cannot infer that a compiler emitted the wrong machine code. This usually happens when a build stage is pinned to `$BUILDPLATFORM` to avoid emulation but the compiler is left at its host defaults.

The image builds successfully because `COPY` treats the program as bytes. It fails later with `exec format error` on an AMD64 node.

## The Mislabeled-Artifact Pattern

On an ARM64 builder, this Dockerfile is wrong for an AMD64 target:

```dockerfile
# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM golang:1.25-bookworm AS build
WORKDIR /src
COPY . .
RUN go build -o /out/service ./cmd/service

FROM scratch
COPY --from=build /out/service /service
ENTRYPOINT ["/service"]
```

Run with:

```bash
docker buildx build \
  --platform linux/amd64 \
  --load \
  --tag service:amd64 \
  .
```

The compiler stage runs as ARM64 and `go build` defaults to its running platform, so `/out/service` is ARM64. The final stage defaults to the requested target and is labeled AMD64. Nothing in the copy operation reconciles the two.

## Fix It with Explicit Cross-Compilation

```dockerfile
# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM golang:1.25-bookworm AS build
RUN apt-get update \
    && apt-get install -y --no-install-recommends binutils \
    && rm -rf /var/lib/apt/lists/*
ARG TARGETOS
ARG TARGETARCH
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS="$TARGETOS" GOARCH="$TARGETARCH" \
    go build -trimpath -o /out/service ./cmd/service

RUN case "$TARGETARCH" in \
      amd64) expected='Advanced Micro Devices X86-64' ;; \
      arm64) expected='AArch64' ;; \
      *) echo "unsupported architecture: $TARGETARCH" >&2; exit 1 ;; \
    esac; \
    machine="$(readelf --file-header /out/service \
      | awk -F: '/Machine:/ { sub(/^[[:space:]]+/, "", $2); print $2 }')"; \
    test "$machine" = "$expected"

FROM scratch
COPY --from=build --chmod=0555 /out/service /service
ENTRYPOINT ["/service"]
```

The assertion reads and normalizes the ELF `Machine` field without executing the target binary. If compiler flags regress, the build fails before it creates a misleading image. Extend the mapping and test it with known fixtures before adding more target architectures.

## Alternative: Run the Target Toolchain

If the compiler does not support clean cross-compilation, do not pin the build stage to `$BUILDPLATFORM`:

```dockerfile
FROM golang:1.25-bookworm AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -o /out/service ./cmd/service

FROM scratch
COPY --from=build /out/service /service
ENTRYPOINT ["/service"]
```

For this Go-to-`scratch` example, `CGO_ENABLED=0` avoids a dynamically linked libc dependency. A cgo or other dynamically linked build instead needs a final stage containing its compatible loader and runtime libraries.

`FROM` defaults to the requested target platform. For `--platform linux/amd64`, BuildKit therefore needs an AMD64-capable worker or emulation to run the compiler stage. This is slower under QEMU but keeps the compiler's default architecture aligned with the image target.

Docker documents three choices: use emulation, attach multiple native nodes to the builder, or configure real cross-compilation. Pick one explicitly rather than combining a native ARM compiler with an AMD64 label.

## Verify Both Metadata and Bytes

For a single locally loaded image:

```bash
docker image inspect service:amd64 \
  --format '{{.Os}}/{{.Architecture}}'
```

For a pushed multi-platform tag:

```bash
docker buildx imagetools inspect \
  registry.example.com/acme/service:2026.08
```

These commands verify manifest metadata. They do not inspect `/service`. Export the artifact or image filesystem and examine the file as well:

```bash
container_id=$(docker create --platform linux/amd64 service:amd64)
docker cp "$container_id":/service ./service-amd64
docker rm "$container_id"
file ./service-amd64
readelf --file-header ./service-amd64
```

Finally, execute a smoke test on a native AMD64 runner:

```bash
docker run --rm --platform linux/amd64 service:amd64 --version
```

An ARM workstation with QEMU may successfully emulate an AMD64 image, which is useful but does not replace a native test. Conversely, QEMU on the host can mask scheduling assumptions that fail on a production node without emulation.

## Check Every Native Extension

The main executable is not the only architecture-sensitive artifact. Node native addons, Python extension modules, JNI libraries, and copied `.so` files must match the target OS, libc, architecture, and ABI. Never copy host `node_modules`, a host virtual environment, or host-built native libraries into a target image.

Build dependencies inside the target-aware graph, inspect representative native files, and publish only after both the manifest and payload agree. The manifest routes the image to a node; it does not transform its contents.

## Official Documentation

- [Docker multi-platform builds](https://docs.docker.com/build/building/multi-platform/)
- [Dockerfile automatic platform arguments](https://docs.docker.com/reference/dockerfile/#automatic-platform-args-in-the-global-scope)
- [Docker Buildx platform option](https://docs.docker.com/reference/cli/docker/buildx/build/#platform)
- [Docker Buildx imagetools inspect](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/)
- [GNU readelf documentation](https://sourceware.org/binutils/docs/binutils/readelf.html)
