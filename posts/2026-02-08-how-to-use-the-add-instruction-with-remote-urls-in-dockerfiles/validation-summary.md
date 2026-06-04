# Validation Summary: How to Use the ADD Instruction with Remote URLs in Dockerfiles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfile `ADD`, `COPY`, and `RUN` instructions
- Docker BuildKit / Dockerfile frontend syntax
- `curl`, `tar`, `sha256sum`, and Debian `apt-get`

## Sources Consulted
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker build cache invalidation: https://docs.docker.com/build/cache/invalidation/
- Docker build best practices, `ADD` or `COPY`: https://docs.docker.com/build/building/best-practices/
- Local Docker CLI help output for `docker build` / `docker buildx build` options.
- GitHub release asset URL check for `krallin/tini` v0.19.0.

## Issues Found
- The post said remote tar archives are not extracted by `ADD`. Current Dockerfile syntax supports `ADD --unpack=true` for remote tar archives, while remote archives are not extracted by default. Updated the archive section to make that distinction and added a `--unpack=true` example.
- The post said `ADD` has no built-in checksum verification. Current Dockerfile syntax supports `ADD --checksum` for remote Git and HTTP resources, with SHA-256 for HTTP sources. Updated the checksum section and security example to use `--checksum`.
- The cache-busting build-arg example declared `ARG CACHE_BUST` but did not use it in the `ADD` instruction, so changing the arg would not reliably affect that instruction. Updated the URL to include the arg as a query parameter.
- The caching explanation was too absolute about URL-only caching. Updated it to reflect Docker's cache rules, including the fact that `mtime` is not used for cache invalidation and that reproducible remote downloads should use versioned URLs plus `--checksum`.
- The alternatives and summary sections implied checksum verification always requires `curl` or a separate `RUN`. Updated them to distinguish built-in `ADD --checksum` from cases where `curl`/`wget` is still useful for custom HTTP behavior or custom checksum logic.

## Review Notes
The examples intentionally use placeholder `example.com` URLs and placeholder hashes, so they demonstrate Dockerfile syntax rather than being directly runnable as-is. The `tini` v0.19.0 GitHub release asset URL still resolves.
