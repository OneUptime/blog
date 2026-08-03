# Multi-Stage Builds vs. `apt remove`: Why Deleted Tools Stay in Layers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Multi-Stage Builds, Image Layers, APT, Image Size, Dockerfile, Container Security

Description: Explain why removing compilers in a later layer does not erase their bytes, when one combined instruction helps, and why a clean runtime stage is the stronger boundary.

---

Container image layers are immutable filesystem changes. Installing a compiler adds its files to one layer. Removing the compiler in a later `RUN` adds deletion markers to a newer layer, so the merged container view no longer shows the files, but registries still store the earlier layer bytes and pulls to hosts that do not already have that layer still transfer them.

`apt remove` changes what the final filesystem exposes. It does not rewrite a previously created image layer.

## See the Layering Problem

This Dockerfile hides its toolchain but does not remove the original installation bytes from the image history:

```dockerfile
FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential

WORKDIR /src
COPY . .
RUN make service \
    && install -D -m 0555 ./build/service /usr/local/bin/service

RUN apt-get purge -y --auto-remove build-essential \
    && rm -rf /var/lib/apt/lists/* /src

ENTRYPOINT ["/usr/local/bin/service"]
```

Inspect the resulting layers:

```bash
docker build --tag service:single-stage .
docker image history --no-trunc service:single-stage
docker image inspect service:single-stage --format '{{.Size}}'
```

The toolchain installation layer remains. A later layer records removals and may add package-manager work of its own.

## Why One `RUN` Can Be Smaller but Is Not the Best Boundary

Because one `RUN` produces one committed filesystem diff, files installed or generated and then deleted in the same instruction can be kept out of that layer's final diff:

```dockerfile
FROM debian:bookworm-slim
WORKDIR /src
COPY . .
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends build-essential; \
    make service; \
    install -D -m 0555 ./build/service /usr/local/bin/service; \
    apt-get purge -y --auto-remove build-essential; \
    rm -rf /var/lib/apt/lists/* /src

ENTRYPOINT ["/usr/local/bin/service"]
```

The toolchain and build outputs created and deleted within this `RUN` are absent from its final diff. However, `COPY . .` is a separate earlier layer, so deleting `/src` only hides the copied source from the merged filesystem; the source bytes remain in the image.

This can reduce final image size, but it couples package installation, compilation, cleanup, and failure handling into one large instruction. It also begins from a runtime filesystem and relies on cleanup to identify every unwanted file. Generated caches, source, headers, and accidentally retained tools are easy to miss.

Combining `apt-get update` and `apt-get install` in the same `RUN` is still the correct package-manager pattern because it avoids stale package-index cache behavior. Removing `/var/lib/apt/lists` in that same instruction avoids storing index files in the layer.

## Use a Multi-Stage Artifact Boundary

```dockerfile
# syntax=docker/dockerfile:1
FROM debian:bookworm AS build
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY . .
RUN make service \
    && install -D -m 0555 ./build/service /out/service

FROM debian:bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build --chmod=0555 /out/service /usr/local/bin/service
USER 10001:10001
ENTRYPOINT ["/usr/local/bin/service"]
```

The final image's layer ancestry begins at `debian:bookworm-slim`, not at the `build` stage. `COPY --from=build` transfers only `/out/service`; compiler packages and source layers are not ancestors of `runtime` and are not part of the published runtime image.

Install genuine runtime libraries in the final stage rather than blindly relying on whatever the build stage had. Use `readelf`, `objdump`, or trusted-binary `ldd` inspection to inventory dynamic dependencies.

## Distinguish Image Size from Builder Storage

Multi-stage builds do not promise that build cache consumes no disk. BuildKit may retain compiler-stage layers locally or export them to a remote cache so later builds are fast. Those cache records are separate from the runtime image that a deployment pulls.

Measure the right object:

```bash
docker image history service:runtime
docker image inspect service:runtime --format '{{.Size}}'
docker buildx du
```

The first two describe the image and its layers in the selected image store. `docker buildx du` describes BuildKit cache usage. Pruning build cache can reclaim builder storage, but it does not make an already published image smaller.

## Choose Based on the Boundary

Use one-stage install-and-cleanup for small administrative additions that genuinely belong in the runtime, such as installing `ca-certificates` and deleting Apt indexes in one instruction. Use multi-stage builds when tools exist only to produce artifacts.

The security benefit is as important as size: the runtime does not contain a compiler, package headers, source tree, or build scripts simply because a cleanup command happened to work today. The allowlist is the set of paths and runtime packages deliberately added to the final stage.

## Official Documentation

- [Docker explanation of immutable image layers](https://docs.docker.com/get-started/docker-concepts/building-images/understanding-image-layers/)
- [Docker multi-stage build documentation](https://docs.docker.com/build/building/multi-stage/)
- [Dockerfile best practices for apt-get](https://docs.docker.com/build/building/best-practices/#apt-get)
- [Docker build cache overview](https://docs.docker.com/build/cache/)
- [Docker Buildx disk usage command](https://docs.docker.com/reference/cli/docker/buildx/du/)
