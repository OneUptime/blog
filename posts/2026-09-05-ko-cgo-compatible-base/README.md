# How to Make ko Work with CGO by Choosing a Compatible Base Image

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Cross-Compilation, Base Images, Linux, Container Image

Description: Enable CGO in ko builds while matching the build toolchain, C libraries, dynamic loader, and runtime base image deliberately.

---

`ko` is optimized for self-contained Go programs and sets `CGO_ENABLED=0` by default. You can override that default, but enabling CGO changes the container contract. The build machine needs a C compiler and development headers, while the final base image must contain the dynamic loader and shared libraries expected by the produced executable.

Changing only the base image cannot make a failed CGO compilation succeed, because `ko` runs `go build` on the host or CI worker. Conversely, installing a compiler on the worker does not make missing runtime libraries appear in the image. Treat build compatibility and runtime compatibility as two separate checks.

## Prove That CGO Is Actually Required

First compare builds:

```bash
CGO_ENABLED=0 go build ./cmd/api
CGO_ENABLED=1 go build -o /tmp/api ./cmd/api
```

If the disabled build works, prefer it unless the CGO path supplies required behavior. Pure-Go binaries are easier to cross-compile and run on a static base.

To see why CGO is selected, inspect the dependency graph and build constraints:

```bash
CGO_ENABLED=1 go list -deps -f '{{if .CgoFiles}}{{.ImportPath}} {{.CgoFiles}}{{end}}' ./cmd/api
go env GOOS GOARCH CGO_ENABLED CC
```

Common reasons include SQLite bindings, native DNS or identity behavior, vendor SDKs, and wrappers around C/C++ libraries.

## Enable CGO for the ko Build

Install the compiler and required development package on the build worker. Then declare the environment in `.ko.yaml`:

```yaml
builds:
  - id: api
    dir: .
    main: ./cmd/api
    env:
      - CGO_ENABLED=1
      - CC=gcc
```

Build normally:

```bash
export KO_DOCKER_REPO=registry.example.com/acme/services
ko build ./cmd/api
```

The ambient environment is the lowest-precedence input; the per-build `env` values override it. Commit this requirement rather than relying on a developer's exported `CGO_ENABLED` value.

If compilation reports a missing header or `pkg-config` package, add it to the CI build environment. Do not add a compiler to the final image merely to fix compilation; `ko` has already built the executable before assembling that image.

## Inspect the Binary's Runtime Contract

On a Linux build worker, inspect the result created by an equivalent Go build. Match the target architecture, compiler, build tags, and linker flags used by `ko`; a standalone `go build` does not read `.ko.yaml`. For the configuration above and a native Linux target:

```bash
CGO_ENABLED=1 CC=gcc go build -trimpath -o /tmp/api ./cmd/api
file /tmp/api
ldd /tmp/api
readelf -l /tmp/api | grep interpreter
```

`ldd` lists dynamic dependencies such as `libc.so.6`, while the ELF interpreter line identifies the loader, such as `/lib64/ld-linux-x86-64.so.2`. Run `ldd` only on a binary you built or otherwise trust; its implementation can execute code on some systems.

If it says `not a dynamic executable`, the binary may be fully static. Confirm with `file` and a container smoke test rather than assuming every CGO binary is dynamically linked.

## Select a Matching Runtime Base

The default Chainguard static base is intended for static executables. A dynamically linked glibc binary needs a glibc-compatible base containing the right libraries. For example, a binary built against Debian 12 libraries can use a matching distroless base:

```yaml
defaultBaseImage: gcr.io/distroless/base-debian12:nonroot
```

That base includes common runtime components, not every native dependency. If `ldd` lists a vendor library, create a purpose-built runtime base that installs or copies that library, publish it, and point `ko` at it:

```yaml
baseImageOverrides:
  example.com/acme/payments/cmd/api: registry.example.com/base/api-runtime@sha256:BASE_DIGEST
```

Pin the base by digest for reproducibility. Ensure its architecture matches every platform being built.

Do not mix libc families casually. A glibc-linked binary normally will not run in a minimal musl-based image merely because both are Linux. Typical symptoms are a misleading `no such file or directory` for an executable that visibly exists, or an error naming the missing loader.

## Build a Purpose-Specific Runtime Base

When an application depends on native libraries, construct the base in a separately reviewed pipeline. A simplified Debian example is:

```dockerfile
FROM debian:12-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates libexample1 \
    && rm -rf /var/lib/apt/lists/*
USER 65532:65532
```

Build, scan, and publish that image, then reference its digest from `.ko.yaml`. The package name here is only a placeholder; install the precise runtime packages found during dependency analysis.

A shell and package manager may remain in this base. If they are not operational requirements, use a multi-stage base build to copy only the loader, libraries, certificates, and data files into a smaller final image. Be careful to preserve licenses and transitive library dependencies.

## Static Linking Is an Option, Not a Checkbox

Some CGO programs can be statically linked:

```yaml
builds:
  - id: api
    main: ./cmd/api
    env:
      - CGO_ENABLED=1
    ldflags:
      - -linkmode external
      - -extldflags -static
```

This depends on static archives being available and on the libraries supporting static use. glibc name resolution, NSS, licensing, and vendor libraries can complicate the result. Validate `file`, `ldd`, DNS, user lookup, TLS, and the real native feature before returning to a static base.

## Multi-Platform CGO Requires Multiple Toolchains

Pure Go cross-compilation is straightforward; CGO cross-compilation is not. Go's cgo documentation requires a C cross-compiler for a different target. An amd64 worker producing both amd64 and arm64 needs appropriate compilers and headers for each target, with `CC` selected correctly.

For many teams, native amd64 and arm64 CI jobs are simpler. Each publishes a platform result that a controlled release step combines. Do not assume `ko build --platform=linux/amd64,linux/arm64 ./cmd/api` supplies C cross-compilers - it does not.

## Test the Final Image, Not Just the Binary

Set `IMAGE_REF` to the digest reference emitted by `ko`, then run it in a fresh container with a read-only root filesystem. The container still receives image-defined and Docker-provided environment variables. This example assumes the application supports `--version`:

```bash
docker run --rm --read-only \
  --entrypoint /ko-app/api \
  "$IMAGE_REF" --version
```

Then exercise the native path, DNS, TLS, and locale or timezone behavior. In Kubernetes, look for exit code `127`, loader errors, or illegal-instruction failures. Verify the image on every supported architecture.

## Conclusion

CGO with `ko` works when four pieces agree: CGO is explicitly enabled, the build worker has the correct compiler and headers, the runtime base provides the expected ABI and shared libraries, and every target platform is tested. Use a pinned, purpose-built base and inspect the binary's actual dependencies rather than selecting a larger image by guesswork.

## Official Documentation

- [ko: Limitations](https://ko.build/advanced/limitations/)
- [ko: Configuration](https://ko.build/configuration/)
- [Go: cgo Command](https://pkg.go.dev/cmd/cgo)
- [Go: `go build` Command](https://pkg.go.dev/cmd/go#hdr-Compile_packages_and_dependencies)
- [GoogleContainerTools Distroless: Base Images](https://github.com/GoogleContainerTools/distroless#what-images-are-available)
