# Docker `ARG` and `ENV` Scope Across Multi-Stage `FROM` Boundaries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Dockerfile, Multi-Stage Builds, ARG, ENV, BuildKit, Configuration

Description: Understand Dockerfile variable scope across unrelated and inherited stages, then choose a deliberate method for build inputs, metadata, runtime configuration, and secrets.

---

Each `FROM` starts a new build stage. That boundary is also a scope boundary, but `ARG` and `ENV` cross it under different rules. A global `ARG` can help choose a base image yet be empty inside the stage. An `ENV` value survives only when the new stage is based on the stage that set it, not merely because that stage appeared earlier in the Dockerfile.

The fix is to decide what the value represents. Build inputs should normally be redeclared as `ARG`; runtime configuration should be set as `ENV` in the final image; generated facts can be copied as files; credentials belong in secret mounts.

## The Four Scope Rules

Docker's rules can be summarized precisely:

1. An `ARG` declared before the first `FROM` is in global scope. It can be interpolated in `FROM` instructions.
2. A global `ARG` is not automatically in a stage. Redeclare its name after `FROM` to consume its value there.
3. An `ARG` declared or consumed in a stage is inherited by descendant stages that use that stage as their base.
4. An `ENV` persists in the image configuration and is inherited by a descendant stage, but not by an unrelated stage that starts from another image.

This Dockerfile demonstrates all four:

```dockerfile
# syntax=docker/dockerfile:1
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS base
ARG BUILD_REVISION
ENV APP_HOME=/opt/service
WORKDIR ${APP_HOME}

FROM base AS build
# BUILD_REVISION and APP_HOME are inherited from base.
RUN printf '%s\n' "$BUILD_REVISION" > revision.txt

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
# This is an unrelated stage. Consume the global argument again.
ARG BUILD_REVISION
ENV APP_HOME=/opt/service
WORKDIR ${APP_HOME}
COPY --from=build /opt/service/revision.txt ./revision.txt
```

Build it with:

```bash
docker build \
  --build-arg BUILD_REVISION=8f2c1d7 \
  --tag example-api:8f2c1d7 \
  .
```

`NODE_VERSION` works in both `FROM` lines because it was declared globally. It would still be unavailable to `RUN echo "$NODE_VERSION"` unless the stage also contained `ARG NODE_VERSION`.

## Earlier Does Not Mean Inherited

Order alone does not establish inheritance:

```dockerfile
FROM alpine:3.23 AS first
ENV CHANNEL=stable

FROM alpine:3.23 AS second
RUN test -n "$CHANNEL"
```

The `second` stage is based on a fresh `alpine:3.23`, so it does not receive `CHANNEL`. It does not matter that `first` appears above it. In contrast, this stage inherits the value because its base is `first`:

```dockerfile
FROM first AS second
RUN test "$CHANNEL" = stable
```

`COPY --from=first` creates a filesystem dependency. It does not merge `first`'s environment configuration into the destination stage. If a stage needs both files and environment settings, copy the files and declare the environment explicitly, or inherit with `FROM first` when that image lineage is appropriate.

## Values Do Not Escape a `RUN`

Shell exports are even narrower:

```dockerfile
FROM alpine:3.23
RUN export RELEASE=2026.08 && echo "$RELEASE"
RUN echo "$RELEASE"
```

Every shell-form `RUN` starts a new shell. The second instruction does not receive the first shell's exported variable. Use one `RUN` when the value is temporary, `ARG` for a build input, `ENV` for persistent image configuration, or a file for generated output.

## Choose the Right Crossing Mechanism

### Redeclare a build input

The same `--build-arg` value is available wherever the Dockerfile declares that argument:

```dockerfile
ARG RELEASE=dev

FROM alpine:3.23 AS build
ARG RELEASE
RUN ./compile --version "$RELEASE" --output /out/app

FROM alpine:3.23 AS runtime
ARG RELEASE
LABEL org.opencontainers.image.version=$RELEASE
COPY --from=build /out/app /usr/local/bin/app
```

Do not repeat a default on every declaration. Declaring `ARG RELEASE` inside a stage consumes the value supplied for the global argument.

### Inherit a shared base

When stages genuinely need the same filesystem and settings, put them in one parent:

```dockerfile
FROM python:3.14-slim AS common
ENV PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

FROM common AS test
RUN python -m unittest discover

FROM common AS runtime
COPY . .
CMD ["python", "server.py"]
```

Inheritance is convenient, but it also carries every parent layer and `ENV` entry. Do not use it merely to transport one string into an otherwise minimal runtime.

### Copy generated metadata as an artifact

If a build computes the value, write it to a stable file and copy it:

```dockerfile
FROM alpine:3.23 AS metadata
ARG SOURCE_REVISION
RUN mkdir /out && printf '%s\n' "$SOURCE_REVISION" > /out/revision

FROM scratch
COPY --from=metadata /out/revision /app/revision
```

This transfers an artifact, not a shell variable. It also makes the final value easy for the application to read without turning it into mutable runtime configuration.

### Set runtime configuration in the final stage

An `ENV` becomes part of the resulting image and is visible to containers unless overridden at run time. Put runtime defaults where their persistence is intentional:

```dockerfile
FROM alpine:3.23 AS runtime
ENV LOG_LEVEL=info
CMD ["/usr/local/bin/app"]
```

Do not use `ENV` as a bridge for a compiler-only setting. It can surprise image consumers and affect later instructions.

## Never Bridge Secrets with `ARG` or `ENV`

Docker explicitly warns against passing credentials with build arguments. Build arguments can be exposed through image history or provenance, while environment values persist in image configuration. Use a BuildKit secret mount instead:

```dockerfile
# syntax=docker/dockerfile:1
FROM alpine:3.23 AS build
RUN --mount=type=secret,id=registry_token \
    TOKEN="$(cat /run/secrets/registry_token)" \
    ./fetch-private-dependency
```

```bash
docker build --secret id=registry_token,src=./ci-registry-token .
```

The secret exists only for that `RUN` mount. Do not copy it into `/out`, and do not expect it in a later stage.

## Official Documentation

- [Dockerfile reference for ARG scope and ENV inheritance](https://docs.docker.com/reference/dockerfile/)
- [Docker build variables and scoping](https://docs.docker.com/build/building/variables/)
- [Docker multi-stage build documentation](https://docs.docker.com/build/building/multi-stage/)
- [Docker build secrets](https://docs.docker.com/build/building/secrets/)
