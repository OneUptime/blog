# `docker build --target`: Why BuildKit Executes Other Stages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, BuildKit, Multi-Stage Builds, Build Target, Dependency Graph, Dockerfile, Troubleshooting

Description: Predict which Dockerfile stages BuildKit executes by tracing inheritance, cross-stage copies, and mounts instead of assuming a target runs in isolation.

---

`docker build --target test .` selects the stage whose result should be exported. It does not promise to execute only instructions textually inside `test`. BuildKit must also execute every stage that produces the target's base filesystem or an artifact the target consumes.

The useful mental model is a directed dependency graph, not a top-to-bottom script. BuildKit evaluates the ancestors of the requested node and can skip unrelated siblings.

## Read a Dockerfile as a Graph

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS base
WORKDIR /app

FROM base AS lint
COPY . .
RUN ./scripts/lint

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS test
COPY . .
RUN npm test

FROM dependencies AS build
COPY . .
RUN npm run build

FROM base AS runtime
COPY --from=build /app/dist ./dist
CMD ["node", "dist/server.js"]
```

BuildKit sees these important edges:

```text
base -> lint
base -> dependencies -> test
base -> dependencies -> build
base -> runtime
build -> runtime  (COPY --from=build)
```

Therefore:

```bash
docker buildx build --target test --progress=plain .
```

executes `base`, `dependencies`, and `test`. It skips `lint`, `build`, and `runtime` because `test` does not depend on them.

```bash
docker buildx build --target runtime --progress=plain .
```

executes `base`, `dependencies`, `build`, and `runtime`. The `COPY --from=build` edge is why the compiler stage runs even though `runtime` starts from `base`.

## Three Constructs Create Stage Dependencies

### Stage inheritance

```dockerfile
FROM dependencies AS test
```

`test` begins with the completed filesystem and image configuration of `dependencies`, so the parent must be evaluated first.

### Cross-stage copy

```dockerfile
COPY --from=build /out/app /usr/local/bin/app
```

The destination needs a snapshot produced by `build`, so BuildKit evaluates that source stage and its ancestors.

### Mounting from another stage

```dockerfile
RUN --mount=type=bind,from=tools,source=/bin,target=/tools \
    /tools/generate
```

The `RUN` consumes files from `tools`, which makes it a dependency even though no `COPY` appears.

An external image used by `FROM`, `COPY --from`, or a named context can also require metadata or layers to be resolved. That does not mean every local Dockerfile stage ran.

## Textual Position Is Not the Rule Under BuildKit

Docker's multi-stage documentation contrasts BuildKit with the legacy builder. The legacy builder processes every stage leading up to the selected target, even unrelated stages. BuildKit executes only stages on which the target depends.

Given:

```dockerfile
FROM ubuntu AS base
RUN echo base

FROM base AS stage1
RUN echo stage1

FROM base AS stage2
RUN echo stage2
```

BuildKit targeting `stage2` runs `base` and `stage2`, while the legacy builder also processes earlier `stage1`. Modern Docker uses BuildKit by default in the normal Linux-image workflow, but old CI configuration or explicit `DOCKER_BUILDKIT=0` can explain logs that show every preceding stage.

## Cache Messages Are Not Execution

Plain progress may mention a dependency and report it as `CACHED`. That stage is part of the graph, but its filesystem-producing step was reused rather than rerun. Distinguish:

- loading an image's metadata;
- checking a cache record;
- transferring a cached result;
- executing a `RUN` command.

Use:

```bash
docker buildx build \
  --target runtime \
  --progress=plain \
  .
```

Read the bracketed stage labels and status for each vertex. `--no-cache` is helpful for observing the full necessary path, but it does not remove dependency edges.

## Find an Unexpected Edge

When a target triggers an expensive stage, search the target and its ancestors for references:

```bash
grep -niE '^[[:space:]]*(FROM|COPY[[:space:]].*--from=|RUN[[:space:]].*from=)' Dockerfile
```

This catches typical single-line references. Inspect continued instructions too, because a `from=` option can appear on a later physical line.

Then trace backward from the selected stage:

1. Which stage appears in its `FROM`?
2. Which stages appear in `COPY --from`?
3. Which stages appear in `RUN --mount=...,from=...`?
4. What are the same dependencies for each of those stages?

Do not assume a stage named `test` is independent because it has a separate alias. If it uses `FROM build`, it necessarily runs the build lineage. Branch `test` and `build` from a smaller common dependency stage when they should be independent.

```dockerfile
FROM base AS dependencies
RUN install-dependencies

FROM dependencies AS test
RUN run-tests

FROM dependencies AS build
RUN compile
```

This graph shares the expensive stable prerequisite while letting each target skip the other branch.

## Target Is an Export Boundary

The selected target determines the result BuildKit exports, tags, or loads. Earlier stages can still be computed and cached, but they do not become separate local images unless requested as targets and exported. Likewise, tools and source files in a producer stage do not automatically appear in the target; only inheritance or explicit copies carry filesystem content forward.

Once the distinction between execution graph and final filesystem is clear, a log showing several stages for one target is expected evidence of dependencies, not evidence that multi-stage isolation failed.

## Official Documentation

- [Docker multi-stage builds and BuildKit target behavior](https://docs.docker.com/build/building/multi-stage/)
- [Docker BuildKit overview](https://docs.docker.com/build/buildkit/)
- [Dockerfile FROM and cross-stage COPY reference](https://docs.docker.com/reference/dockerfile/)
- [Docker build progress option](https://docs.docker.com/reference/cli/docker/buildx/build/#progress)
