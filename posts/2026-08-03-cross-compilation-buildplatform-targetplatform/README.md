# Docker Cross-Compilation with `$BUILDPLATFORM` and `$TARGETPLATFORM`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Buildx, Multi-Platform Builds, Cross-Compilation, BuildKit, BUILDPLATFORM, TARGETPLATFORM

Description: Run the compiler on the builder’s native architecture while explicitly producing artifacts for each requested target platform and packaging them into matching images.

---

Multi-platform builds involve two platforms at once. `BUILDPLATFORM` describes the node running BuildKit. `TARGETPLATFORM` describes one requested output, such as `linux/amd64` or `linux/arm64`.

Pinning a compiler stage to `$BUILDPLATFORM` prevents that compiler from running through emulation. It does not cross-compile the program by itself. The Dockerfile must pass `$TARGETOS`, `$TARGETARCH`, and, when relevant, `$TARGETVARIANT` into a compiler that supports those targets.

## Build Natively, Emit for the Target

Go provides a compact example for code that does not require cgo:

```dockerfile
# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM golang:1.25-bookworm AS build
ARG BUILDPLATFORM
ARG TARGETPLATFORM
ARG TARGETOS
ARG TARGETARCH
WORKDIR /src

RUN printf 'compiler runs on %s; output targets %s\n' \
  "$BUILDPLATFORM" "$TARGETPLATFORM"

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .
RUN --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS="$TARGETOS" GOARCH="$TARGETARCH" \
    go build -trimpath -o /out/service ./cmd/service

FROM scratch AS runtime
COPY --from=build --chmod=0555 /out/service /service
USER 65532:65532
ENTRYPOINT ["/service"]
```

Automatic platform arguments exist in Dockerfile global scope. They can be used in `FROM`, but they must be redeclared with `ARG` inside a stage before a `RUN` can read them. No default values are needed because BuildKit supplies them.

The final `FROM scratch` uses the target platform by default. Docker's build check documentation calls `FROM --platform=$TARGETPLATFORM` redundant, so omit it. Each target receives the artifact produced for that target.

## Build and Push a Manifest List

First inspect the builder's available worker platforms:

```bash
docker buildx inspect --bootstrap
```

Then request both outputs:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag registry.example.com/acme/service:2026.08 \
  --push \
  .
```

Buildx evaluates the Dockerfile once per target platform. The compiler process remains native to the build worker because its stage uses `$BUILDPLATFORM`; the Go environment changes for each target. The registry tag points to an image index containing platform-specific manifests.

Verify the published index:

```bash
docker buildx imagetools inspect \
  registry.example.com/acme/service:2026.08
```

A normal local image store often cannot load a multi-platform index with `--load`. Push the multi-platform result, or build and load one platform at a time for local testing.

## Export and Inspect the Binaries

Add an artifact-only target before the final `runtime` stage, or keep selecting `runtime` explicitly for image builds:

```dockerfile
FROM scratch AS artifact
COPY --from=build /out/service /service
```

Export both filesystems:

```bash
docker buildx build \
  --target artifact \
  --platform linux/amd64,linux/arm64 \
  --output type=local,dest=./out \
  .

file ./out/linux_amd64/service
file ./out/linux_arm64/service
```

The local exporter splits multi-platform output into platform subdirectories by default. This check inspects the artifact itself, not only the manifest's declared platform.

## Handle Variants Deliberately

For targets such as `linux/arm/v7`, BuildKit also provides `TARGETVARIANT`. A compiler may expect the numeric portion separately. In a shell instruction:

```dockerfile
ARG TARGETARCH
ARG TARGETVARIANT
RUN case "$TARGETARCH/$TARGETVARIANT" in \
      arm/v*) export GOARM="${TARGETVARIANT#v}" ;; \
    esac; \
    CGO_ENABLED=0 GOOS=linux GOARCH="$TARGETARCH" \
      go build -o /out/service ./cmd/service
```

Do not discard the variant if the compiler uses it to select an instruction baseline.

## Know When Cross-Compilation Is Not Enough

Docker documents three broad multi-platform strategies: emulation, multiple native nodes, and cross-compilation. The `$BUILDPLATFORM` pattern is the third strategy and depends on language support.

`CGO_ENABLED=0` is not valid for every Go application. A project using C libraries needs an appropriate target compiler, target headers, and target libraries, or should build on a native target node. Rust, C, C++, and other toolchains have their own target triples and sysroots. Never assume that changing an environment variable converted a host binary.

Keep platform-independent generators in native stages, and move steps that must execute a target binary into a target-platform stage backed by emulation or a matching worker. Validate on native target hardware before release when CPU-specific behavior matters.

## Official Documentation

- [Docker multi-platform build strategies and cross-compilation](https://docs.docker.com/build/building/multi-platform/)
- [Dockerfile automatic platform arguments](https://docs.docker.com/reference/dockerfile/#automatic-platform-args-in-the-global-scope)
- [Docker redundant target platform build check](https://docs.docker.com/reference/build-checks/redundant-target-platform/)
- [Docker local exporter and platform splitting](https://docs.docker.com/build/exporters/local-tar/)
- [Go environment variables](https://pkg.go.dev/cmd/go#hdr-Environment_variables)
