# Publish Multiple Images with Multi-Stage Targets and Buildx Bake

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Buildx Bake, Multi-Stage Build, Multi-Platform Images, Container Registry, CI/CD, Dockerfile

Description: Map multiple named runtime stages to distinct Bake targets, share build work, preview the resolved plan, and push separate multi-platform image indexes in one invocation.

---

A Dockerfile can contain several publishable final stages, but one `docker build --target ...` invocation exports one selected result. Buildx Bake provides the missing orchestration layer: each Bake target selects a Dockerfile stage, assigns its own tags and platforms, and participates in a group that can build concurrently.

## Produce Both Artifacts in a Shared Stage

```dockerfile
# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM golang:1.25-bookworm AS build
ARG TARGETOS
ARG TARGETARCH
WORKDIR /src
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .
RUN --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS="$TARGETOS" GOARCH="$TARGETARCH" \
    go build -trimpath -o /out/api ./cmd/api \
    && CGO_ENABLED=0 GOOS="$TARGETOS" GOARCH="$TARGETARCH" \
    go build -trimpath -o /out/worker ./cmd/worker

FROM scratch AS api
COPY --from=build --chmod=0555 /out/api /api
USER 65532:65532
ENTRYPOINT ["/api"]

FROM scratch AS worker
COPY --from=build --chmod=0555 /out/worker /worker
USER 65532:65532
ENTRYPOINT ["/worker"]
```

`api` and `worker` are separate publishable stage aliases. Neither inherits the other's binary. Both depend on the same target-aware compiler stage, so identical build vertices and cache records can be reused.

If one binary needs different runtime data, add it only to that final stage. For example, a TLS client may need a CA bundle even though the other process does not.

## Map Dockerfile Stages in `docker-bake.hcl`

```hcl
variable "REGISTRY" {
  default = "registry.example.com/acme"
}

variable "TAG" {
  default = "dev"
}

group "default" {
  targets = ["api", "worker"]
}

target "common" {
  context    = "."
  dockerfile = "Dockerfile"
  platforms  = ["linux/amd64", "linux/arm64"]
  attest = [
    "type=provenance,mode=max",
    "type=sbom",
  ]
}

target "api" {
  inherits = ["common"]
  target   = "api"
  tags     = ["${REGISTRY}/api:${TAG}"]
  cache-from = ["type=registry,ref=${REGISTRY}/api-buildcache:main"]
  cache-to   = ["type=registry,ref=${REGISTRY}/api-buildcache:main,mode=max"]
}

target "worker" {
  inherits = ["common"]
  target   = "worker"
  tags     = ["${REGISTRY}/worker:${TAG}"]
  cache-from = ["type=registry,ref=${REGISTRY}/worker-buildcache:main"]
  cache-to   = ["type=registry,ref=${REGISTRY}/worker-buildcache:main,mode=max"]
}
```

The Bake target named `api` and Dockerfile stage named `api` happen to share a label, but they are distinct concepts. The Bake `target = "api"` property performs the mapping. Separate cache export references prevent concurrent targets from overwriting one cache location.

## Preview Before Publishing

Resolve variables and inheritance without building:

```bash
release_tag=$(git rev-parse --verify HEAD)

docker buildx bake \
  --var TAG="$release_tag" \
  --print
```

Inspect the rendered target names, Dockerfile stages, tags, platforms, attestations, and cache destinations. Then run Dockerfile build checks through Bake:

```bash
docker buildx bake --var TAG="$release_tag" --check
```

Neither command pushes images. They are suitable release gates before registry authentication or mutation.

## Build and Push Both Images

```bash
docker buildx bake \
  --var TAG="$release_tag" \
  --push
```

With no target arguments, Bake runs the `default` group. Docker documents that specified Bake targets run in parallel. `--push` applies a registry output to the selected targets, producing separate `api` and `worker` multi-platform indexes under their own tags.

You can publish one target when needed:

```bash
docker buildx bake \
  --var TAG="$release_tag" \
  --push \
  worker
```

For local testing, override to one platform because a traditional local image store may not load a multi-platform result:

```bash
docker buildx bake \
  --set '*.platform=linux/amd64' \
  --load \
  api worker
```

Quote the wildcard so the shell does not expand it as a filename pattern.

## Verify Each Published Index

```bash
docker buildx imagetools inspect \
  "registry.example.com/acme/api:$release_tag"

docker buildx imagetools inspect \
  "registry.example.com/acme/worker:$release_tag"
```

Confirm both expected platforms appear and record the resulting immutable digests in deployment metadata. A tag for the source commit is useful, but deployments should consume the published digest when immutability is required.

Build each runtime's smoke test independently. Sharing one Dockerfile and compiler stage should reduce duplication, not merge release ownership: the API and worker remain separate images with separate vulnerability scans, SBOMs, rollout histories, and rollback decisions.

## Official Documentation

- [Docker Bake overview](https://docs.docker.com/build/bake/)
- [Docker Bake targets and groups](https://docs.docker.com/build/bake/targets/)
- [Docker Bake file reference](https://docs.docker.com/build/bake/reference/)
- [Docker Buildx bake command](https://docs.docker.com/reference/cli/docker/buildx/bake/)
- [Docker multi-stage build documentation](https://docs.docker.com/build/building/multi-stage/)
- [Docker Buildx imagetools inspect](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/)
