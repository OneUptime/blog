# Build a Chainguard Python Runtime with uv and No pip

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chainguard, Python, Uv, Distroless, Docker

Description: Build dependencies with uv, copy a relocatable virtual environment into Chainguard's minimal Python runtime, and leave pip behind.

---

The standard Chainguard Python runtime contains Python and its standard library but intentionally omits `pip`, `apk`, and a shell. That is compatible with normal Python applications: resolve and install dependencies in a builder, then copy the completed virtual environment into the runtime.

Astral's `uv` can create the environment without bootstrapping `pip`. Its relocatable virtual-environment option reduces dependence on the creation path, but it does not make native extensions portable across Python ABIs, CPU architectures, or libc versions.

## Use matching Python stages

Use the same Chainguard Python version stream for the builder and runtime. Replace the moving tags with reviewed digests in a production Dockerfile.

```dockerfile
# syntax=docker/dockerfile:1

FROM ghcr.io/astral-sh/uv:0.11.32 AS uv

FROM cgr.dev/chainguard/python:latest-dev AS build

COPY --from=uv /uv /usr/local/bin/uv

USER root
RUN install -d -o 65532 -g 65532 /app

USER 65532
WORKDIR /app

ENV UV_PYTHON_DOWNLOADS=never
ENV UV_LINK_MODE=copy

COPY --chown=65532:65532 requirements.lock /app/requirements.lock

RUN uv venv \
      --python /usr/bin/python \
      --relocatable \
      /app/venv \
    && uv pip sync \
      --require-hashes \
      --python /app/venv/bin/python \
      /app/requirements.lock

FROM cgr.dev/chainguard/python:latest

WORKDIR /app
COPY --from=build --chown=65532:65532 /app/venv /app/venv
COPY --chown=65532:65532 src/ /app/src/

ENV PATH=/app/venv/bin:$PATH
ENTRYPOINT ["/app/venv/bin/python", "-m", "src.main"]
```

At the time of writing, `--relocatable` requires a recent uv release. Pin the uv image to a reviewed version or digest, and check the current uv reference before changing it.

`UV_PYTHON_DOWNLOADS=never` forces uv to use the Python already supplied by Chainguard instead of downloading a separate managed interpreter. This is important because the final stage expects the environment to run against the matching Chainguard runtime.

`UV_LINK_MODE=copy` makes uv copy package files from its cache into the environment. This avoids the tight cache coupling of symlink mode and cross-filesystem link warnings when using a cache mount.

## Create a real lock input

`uv pip sync` accepts requirements-style input. Generate and review a fully resolved file in CI or the development workflow:

```bash
uv pip compile \
  --universal \
  --python-version 3.14 \
  --generate-hashes \
  pyproject.toml \
  -o requirements.lock
```

Replace `3.14` with the Python minor version in the pinned Chainguard runtime. A universal resolution is appropriate when the same lock file drives both the AMD64 and ARM64 builds below; otherwise, compile a separate lock file for each target platform.

`uv` 0.11.32 supports `--require-hashes`, which makes synchronization require a matching hash for every requirement. Hash-checking mode does not support Git or editable dependencies or local directories. The important properties are that dependency versions are resolved before the image build and that the lock input is committed and reviewed.

For a native uv project using `uv.lock`, use `uv sync --locked --no-dev --no-editable`. Set an explicit project environment path and keep it identical in both stages. Astral recommends `--no-editable` for deployment because an editable install retains a dependency on the source tree.

## Why the runtime contains no pip

`uv venv` does not seed `pip`, `setuptools`, or `wheel` unless requested. `uv pip` is a uv command that installs into the target environment; it does not require the `pip` package to exist there.

Verify in the final image without a shell:

```bash
docker build --pull -t python-uv:test .

docker run --rm \
  --entrypoint /app/venv/bin/python \
  python-uv:test \
  -c 'import importlib.util; print(importlib.util.find_spec("pip"))'
```

Expected output is `None`, provided `requirements.lock` does not itself include `pip`. Then import the actual native and pure-Python dependencies:

```bash
docker run --rm \
  --entrypoint /app/venv/bin/python \
  python-uv:test \
  -c 'import ssl, your_dependency; print("imports ok")'
```

## Relocatable does not mean environment-independent

Keep the virtual environment at `/app/venv` in both stages even when using `--relocatable`. Some third-party packages generate data or scripts with their own absolute paths. Native wheels can also require:

- the same CPython version and ABI;
- the same CPU architecture;
- a compatible glibc version;
- shared libraries that exist in the builder but not the minimal runtime.

Build inside the target platform:

```bash
docker buildx build \
  --platform linux/amd64 \
  --pull \
  -t python-uv:amd64 \
  --load .
```

Repeat for `linux/arm64` rather than copying an environment created on another platform. Never copy a host `.venv` into the image.

If an import reports a missing shared object, identify the APK that provides it and add that runtime library through Custom Assembly or Chainguard's documented distroless extension method. Copying the development image's entire library directory defeats the dependency boundary.

## Improve build caching

Copy the lock input before application source so dependency installation is cached independently:

```dockerfile
COPY requirements.lock /app/requirements.lock
RUN --mount=type=cache,target=/home/nonroot/.cache/uv,uid=65532,gid=65532 \
    uv pip sync \
      --require-hashes \
      --python /app/venv/bin/python \
      /app/requirements.lock

COPY src/ /app/src/
```

With a cache mount, retain `UV_LINK_MODE=copy` so the environment contains independent package files. The `uid` and `gid` mount options make the cache writable by the selected build user.

## Official Documentation

- [Migrating to Python Chainguard Containers](https://edu.chainguard.dev/get-started/migration/migration-guides/migrating-python/)
- [Getting started with the Python Chainguard Container](https://edu.chainguard.dev/chainguard/chainguard-images/getting-started/python/)
- [Using uv in Docker](https://docs.astral.sh/uv/guides/integration/docker/)
- [uv virtual environment options](https://docs.astral.sh/uv/reference/cli/#uv-venv)
