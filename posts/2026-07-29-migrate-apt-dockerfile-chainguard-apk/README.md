# How to Migrate an `apt`-Based Dockerfile to Chainguard and `apk`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chainguard, Wolfi APK, Docker, Container, Container Migration

Description: Convert a Debian or Ubuntu Dockerfile to Chainguard safely by translating packages, users, build stages, and shell-dependent instructions.

---

Replacing `apt-get` with `apk add` is only one part of a Chainguard migration. Package names, libc, default users, entrypoints, available utilities, and the presence of a shell can all differ.

Chainguard Containers are based on Wolfi and use the APK package format. Wolfi is glibc-based, unlike Alpine's usual musl environment. Wolfi and Alpine packages are not interchangeable even though both use `apk`.

## Inventory the original image first

Before editing the Dockerfile, record what the current build and runtime actually use:

```bash
docker image inspect old-app:current
docker run --rm old-app:current id
docker run --rm old-app:current env
```

Separate requirements into four groups:

1. build-only packages such as compilers and headers;
2. runtime shared libraries;
3. application artifacts and language dependencies;
4. convenience tools that are not needed in production.

This prevents a direct translation from carrying an entire Debian build environment into the new runtime.

## Translate package operations

A common Debian instruction is:

```dockerfile
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential curl libpq-dev \
    && rm -rf /var/lib/apt/lists/*
```

The broad APK equivalent is:

```dockerfile
RUN apk add --no-cache \
    build-base \
    curl \
    postgresql-dev
```

`--no-cache` avoids retaining an APK index in the image. Package names are not mechanically predictable. Chainguard publishes package-name mappings, and the package index can be searched interactively:

```bash
docker run --rm -it \
  --entrypoint /bin/sh \
  cgr.dev/chainguard/wolfi-base:latest

apk update
apk search postgresql
apk search cmd:curl
apk search 'so:libpq.so*'
```

Useful translations include:

| Debian or Ubuntu | Wolfi |
| --- | --- |
| `build-essential` | `build-base` |
| `libc6-dev` | `glibc-dev` |
| `libcurl4-openssl-dev` | `curl-dev` |
| `libjpeg-dev` | `libjpeg-turbo-dev` |
| `default-mysql-client` | `mysql-client` |
| `groupadd` and `useradd` commands | Install `shadow`, or use BusyBox `addgroup` and `adduser` |

Validate every mapping against the current index. Package repositories are updated continuously.

## Move installation to a development stage

Most standard Chainguard variants do not contain a shell or `apk`, so this will fail:

```dockerfile
FROM cgr.dev/chainguard/python:latest
RUN apk add --no-cache postgresql-dev
```

Use a development builder and copy only runtime artifacts:

```dockerfile
FROM cgr.dev/chainguard/python:latest-dev AS build

USER root
RUN apk add --no-cache build-base postgresql-dev

USER 65532
WORKDIR /app
RUN python -m venv /app/venv
ENV PATH=/app/venv/bin:$PATH

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM cgr.dev/chainguard/python:latest

WORKDIR /app
COPY --from=build --chown=65532:65532 /app/venv /app/venv
COPY --chown=65532:65532 . /app

ENV PATH=/app/venv/bin:$PATH
ENTRYPOINT ["python", "/app/main.py"]
```

If a Python extension links to `libpq`, the final runtime also needs the package providing that shared object. Use Custom Assembly, a suitable fuller variant, or Chainguard's documented method for adding APKs to a distroless filesystem. Do not copy an arbitrary `.so` without its package metadata and transitive dependencies.

## Remove assumptions about a shell

Shell-form commands are executed through a shell:

```dockerfile
CMD python main.py
```

A distroless image may not have one. Use JSON exec form:

```dockerfile
ENTRYPOINT ["python", "/app/main.py"]
```

Likewise, startup scripts with `#!/bin/bash` will not run unless Bash is deliberately included. Prefer direct application entrypoints. If orchestration is required, implement it in the application or choose a variant that explicitly includes the needed shell.

## Account for the default user

Chainguard application images generally run as a nonroot user. Installation in a development stage may require temporary elevation:

```dockerfile
USER root
RUN apk add --no-cache tzdata
USER 65532
```

Copy writable files with the correct ownership:

```dockerfile
COPY --chown=65532:65532 config/ /app/config/
```

Check the exact image instead of assuming UID `65532` for every repository:

```bash
docker run --rm --entrypoint id cgr.dev/chainguard/python:latest-dev
```

## Do not combine unrelated upgrades

Keep the application and language version unchanged during the base-image migration. First establish behavioral parity, then upgrade Python, Node.js, Java, or the application in a separate change. This makes ABI, entrypoint, and package-name failures much easier to isolate.

Build for every production architecture and run meaningful tests:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --pull \
  -t registry.example.com/app:test .
```

Test startup, graceful shutdown, certificate validation, DNS, locale and timezone behavior, file writes, and all native extensions. A successful image build only proves that the files were assembled.

## Official Documentation

- [Migrating Dockerfiles to Chainguard Containers](https://edu.chainguard.dev/get-started/migration/migrating-to-chainguard-images/)
- [Package and image name mappings](https://edu.chainguard.dev/chainguard/chainguard-images/about/package-name-mappings/)
- [Tips for migrating to Chainguard Containers](https://edu.chainguard.dev/chainguard/migration/migration-tips/)
- [Wolfi FAQ](https://edu.chainguard.dev/open-source/wolfi/faq/)
