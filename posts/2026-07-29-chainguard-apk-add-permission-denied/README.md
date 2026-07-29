# Why Does `apk add` Return Permission Denied in a Chainguard Image?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chainguard, Wolfi APK, Container, Nonroot, Docker

Description: Fix APK permission failures by distinguishing a missing package manager from Chainguard's nonroot default and elevating only during image builds.

---

There are two common `apk add` failures in Chainguard Containers, and they need different fixes:

1. `apk: not found` means the chosen standard variant is distroless and does not contain the package manager.
2. permission or lock errors mean `apk` exists, but the current user cannot modify the root filesystem or APK database.

Do not solve either case by making the production container run permanently as root.

## Identify the image and current user

Inspect the exact reference used by the build:

```bash
IMAGE=cgr.dev/chainguard/python:latest-dev

docker image inspect "$IMAGE" \
  --format 'user={{json .Config.User}} entrypoint={{json .Config.Entrypoint}}'

docker run --rm \
  --entrypoint id \
  "$IMAGE"
```

Many Chainguard development variants include `apk` but still default to UID `65532`, commonly named `nonroot`. That user cannot write `/lib/apk`, `/etc/apk`, or system directories.

Confirm the package manager separately:

```bash
docker run --rm \
  --entrypoint /sbin/apk \
  "$IMAGE" \
  --version
```

If `/sbin/apk` is absent, switch the build stage to the documented `-dev` variant or `wolfi-base`. A standard distroless runtime cannot execute a `RUN apk add` instruction.

## Elevate only for the installation layer

Use `USER root` before the package operation, then switch back:

```dockerfile
FROM cgr.dev/chainguard/python:latest-dev AS build

USER root
RUN apk add --no-cache build-base libffi-dev

USER 65532
WORKDIR /app
COPY --chown=65532:65532 requirements.txt .
RUN python -m venv /app/venv \
    && /app/venv/bin/pip install --no-cache-dir -r requirements.txt
```

Do not use `sudo`. Minimal images normally do not include it, and a Dockerfile build already has an explicit mechanism for selecting the user.

The final stage can remain distroless:

```dockerfile
FROM cgr.dev/chainguard/python:latest

WORKDIR /app
COPY --from=build --chown=65532:65532 /app/venv /app/venv
COPY --chown=65532:65532 main.py .

ENV PATH=/app/venv/bin:$PATH
ENTRYPOINT ["python", "/app/main.py"]
```

## Why runtime installation is the wrong fix

This command can be made to work against a development image:

```bash
docker run --rm -it \
  --user root \
  --entrypoint /bin/sh \
  cgr.dev/chainguard/python:latest-dev
```

It is useful for a disposable diagnostic session. It is not a deployment design. Changes made to a running container disappear when it is replaced, bypass image review, and make replicas differ from one another.

Install dependencies at build time, publish an immutable image, and run it as nonroot. If packages must be added to a standard distroless variant, use Chainguard Custom Assembly or the documented multi-stage filesystem assembly workflow.

## Other causes of permission errors

If `USER root` does not fix the build, check the surrounding environment:

### A read-only container filesystem

Kubernetes `readOnlyRootFilesystem: true` prevents runtime writes even for UID 0. That is expected. Build the packages into the image rather than installing them when the Pod starts.

### A rootless build engine

Root inside a rootless BuildKit or Podman build is namespaced. Normal package installation should still work inside a writable build layer, but bind mounts and host directories can have unmapped ownership. Keep APK writes inside the image filesystem.

### A locked or unwritable cache

An error mentioning the APK database lock can mean another package operation is active or the directories came from a read-only mount. `--no-cache` avoids retaining the index but does not bypass filesystem permissions.

### Files copied as root

The package installation may succeed, followed by an application failure because `COPY` created root-owned files. Set ownership during the copy:

```dockerfile
COPY --chown=65532:65532 . /app
```

### The wrong repository or missing credentials

Authentication failures, TLS errors, and `no such package` are not Unix permission problems. Inspect `/etc/apk/repositories`, repository entitlements, pull-token configuration, and network access rather than changing the container user.

## Confirm the security boundary

At the end of the build, verify the configured runtime user:

```bash
docker image inspect app:test --format '{{json .Config.User}}'
docker run --rm --entrypoint id app:test
```

If the final image has no `id` executable, inspect it from the development variant during testing and use the image configuration for the final assertion. The important property is that temporary build-time elevation does not leak into the runtime stage.

## Official Documentation

- [Chainguard container variants](https://edu.chainguard.dev/chainguard/chainguard-images/about/differences-development-production/)
- [Tips for migrating to Chainguard Containers](https://edu.chainguard.dev/chainguard/migration/migration-tips/)
- [How to port an application to Chainguard Containers](https://edu.chainguard.dev/chainguard/migration/porting-apps-to-chainguard/)
- [Dockerfile `USER` reference](https://docs.docker.com/reference/dockerfile/#user)
