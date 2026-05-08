# Validation Summary: How to Search for Images in a Registry with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container registries
- Docker Hub
- Quay.io
- Red Hat container registries
- Fedora Registry
- Bash

## Sources Consulted
- Podman official documentation: `podman-search(1)` - https://docs.podman.io/en/stable/markdown/podman-search.1.html
- Podman official documentation: `podman(1)` - https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman upstream source for `podman search` formatting behavior - https://github.com/containers/podman/blob/main/cmd/podman/images/search.go

## Issues Found
- The basic output example showed `INDEX`, `STARS`, and `OFFICIAL` as default columns. Current Podman defaults to `NAME` and `DESCRIPTION`; star and official descriptors are Docker Hub-specific and are not displayed by default. Updated the sample output accordingly.
- The post used GitHub Container Registry as a generic `podman search` target. Podman documents that search behavior is registry-specific and some registries may not support searching. Replaced that example with Fedora Registry and added a caveat about registry support.
- The `--limit 100` example described 100 as an upper bound. Podman documents `--limit` as a result limit, with default 25 and per-registry behavior, but does not document 100 as the maximum. Updated the wording.
- Official-image and star examples were not consistently scoped to Docker Hub, even though Podman documents those descriptors as Docker Hub-specific. Updated those examples to use `docker.io/` search terms and documented `--filter=is-official=true` syntax.
- The multi-registry script included `ghcr.io`, which is not a reliable generic search target with `podman search`. Replaced it with `registry.fedoraproject.org`.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was verified against official Podman documentation and upstream Podman source rather than local `podman --help` output.
