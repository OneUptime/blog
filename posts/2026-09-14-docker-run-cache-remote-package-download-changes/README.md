# Docker Keeps Reusing an Old Package Download: When `RUN` Cache Ignores Remote URL Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, BuildKit, Caching, Build Cache, CI/CD

Description: Make remote package downloads reproducible and intentionally refreshable by modeling versions and checksums instead of expecting Docker to detect URL changes.

---

A Dockerfile can keep downloading nothing while the file behind its URL changes every day. If an unchanged `RUN` instruction hits cache, the shell command does not execute and no HTTP request is made. BuildKit therefore has no new response to compare.

This is expected for a command such as `RUN curl https://example.com/latest.tar.gz`. Docker's invalidation rules do not treat the current contents of arbitrary remote services as automatic inputs to ordinary `RUN` operations. [Docker cache invalidation](https://docs.docker.com/build/cache/invalidation/).

## Separate the Three Freshness Decisions

There are three independent questions:

1. Will BuildKit execute this operation?
2. If it executes, will the download client or package manager fetch new data?
3. If it fetches data, does the build verify that it received the intended artifact?

`--no-cache` affects the first question. Package-manager refresh flags and local download stores affect the second. Version pinning and integrity verification address the third.

Confusing these layers produces misleading fixes. Clearing npm's store does nothing when `npm ci` never executes. Rebuilding the instruction does not make a mutable URL reproducible. Pulling a newer base image does not establish which tool archive your script accepted.

## Prefer a Versioned Artifact and a Trusted Checksum

Make the intended artifact explicit. This illustrative Dockerfile expects your artifact service to publish a versioned archive and a separately reviewed checksum:

```dockerfile
# syntax=docker/dockerfile:1
FROM debian:bookworm-slim AS download
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

ARG TOOL_VERSION
ARG TOOL_SHA256
RUN test -n "$TOOL_VERSION" && test -n "$TOOL_SHA256" \
    && curl --fail --show-error --location \
       "https://artifacts.example.com/tool/${TOOL_VERSION}/tool-linux-amd64.tar.gz" \
       --output /tmp/tool.tar.gz \
    && printf '%s  /tmp/tool.tar.gz\n' "$TOOL_SHA256" | sha256sum --check - \
    && mkdir /opt/tool \
    && tar -xzf /tmp/tool.tar.gz -C /opt/tool \
    && rm /tmp/tool.tar.gz
```

Supply a real version and verified digest through reviewed build inputs. The hostname and archive layout are placeholders, not a working public download. Adapt the archive name for other target architectures and only extract archives from your trusted artifact process.

The version and checksum participate in the command's build inputs. Changing either deliberately reruns the operation. If a publisher replaces bytes under the same version, an uncached rebuild fails integrity verification instead of silently producing a different tool.

Do not download a checksum from the same mutable URL and call that a pin. Record the expected checksum in your reviewed dependency metadata or obtain it through your established authenticated release-verification process.

## Use a Refresh Input for Intentionally Mutable Sources

Some builds intentionally query a rolling package repository. Introduce a non-secret refresh epoch with a documented update policy:

```dockerfile
FROM debian:bookworm-slim AS system-deps
ARG APT_REFRESH_EPOCH=2026-09
RUN test -n "$APT_REFRESH_EPOCH" \
    && apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
```

```bash
docker buildx build \
  --build-arg APT_REFRESH_EPOCH=2026-10 \
  --load --tag app:dependency-refresh .
```

Keep `apt-get update` and installation in one instruction so a separately cached package index does not govern a fresh install. Docker's Dockerfile guidance explains this pattern. [Dockerfile best practices](https://docs.docker.com/build/building/best-practices/#apt-get).

A monthly value is only an example. Choose a cadence that matches your update process, or increment the value when your dependency automation approves a refresh. A timestamp generated on every invocation removes reuse by design and makes unrelated source changes pay the download cost.

## Refresh a Stage During Investigation

For an immediate diagnostic rebuild, target the named stage:

```bash
docker buildx build \
  --no-cache-filter system-deps \
  --progress=plain \
  --load --tag app:diagnosis .
```

Buildx documents `--no-cache-filter` as a stage-specific option. `--pull` separately checks for newer referenced images; it is not a general remote-package refresh flag. [Buildx build options](https://docs.docker.com/reference/cli/docker/buildx/build/).

If the operation uses a cache mount, its mutable package store may still survive an instruction-cache bypass. Inspect the package manager's own behavior rather than assuming every download now comes from the network.

## Do Not Generalize This to Every Dockerfile Fetch

Dockerfile `ADD` has specific remote-source behavior and supports checksum verification for HTTP sources. Its semantics differ from an arbitrary shell command invoking curl. Consult the instruction reference before applying a `RUN` diagnosis to an `ADD` operation. [Dockerfile ADD reference](https://docs.docker.com/reference/dockerfile/#add).

Likewise, a build context fetched from Git and a secret-mounted registry token have distinct cache rules. Start from the actual operation, not merely the presence of a URL in its log.

## Verify the Artifact, Not Just the Cache Marker

Run the version-pinned build twice, then change the approved version and checksum together. Confirm that the fetch operation reruns and the resulting tool reports the expected version. Repeat once with a deliberately wrong checksum in a disposable test to ensure the build fails.

For rolling package builds, retain the refresh epoch and resolved package inventory with the build record. Cache hits can then be explained in terms of an intentional freshness policy instead of depending on when a runner happened to have an empty cache.

## References

- [Docker cache invalidation](https://docs.docker.com/build/cache/invalidation/)
- [APT Dockerfile guidance](https://docs.docker.com/build/building/best-practices/#apt-get)
- [Buildx cache bypass and pull options](https://docs.docker.com/reference/cli/docker/buildx/build/)
- [Dockerfile ADD](https://docs.docker.com/reference/dockerfile/#add)
