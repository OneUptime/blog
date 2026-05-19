# Validation Summary: How to Configure Proxy Cache for Container Registries on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Docker Engine
- Docker Compose
- Docker Distribution Registry
- Docker Hub registry mirrors
- containerd registry hosts configuration
- Kubernetes image pulls with containerd

## Sources Consulted
- Docker Docs: Install Docker Engine on Ubuntu - https://docs.docker.com/engine/install/ubuntu/
- Docker Docs: Mirror the Docker Hub library - https://docs.docker.com/docker-hub/image-library/mirror/
- Docker Docs: Docker daemon configuration overview - https://docs.docker.com/engine/daemon/
- Docker Docs: Compose file `version` top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Hub: `registry` Official Image - https://hub.docker.com/_/registry
- CNCF Distribution: Configuring a registry - https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution: Garbage collection - https://distribution.github.io/distribution/about/garbage-collection/
- containerd hosts configuration - https://github.com/containerd/containerd/blob/main/docs/hosts.md
- containerd CRI registry configuration - https://containerd.org/docs/1.7/cri/registry/
- Local CLI checks: `dockerd --help`, `docker compose version`, and `registry:3 registry garbage-collect --help`

## Issues Found
- The examples used `registry:2`, while the current Docker Official Image documentation lists `registry:3` as the supported tag family. Updated the run, Compose, and garbage-collection examples to `registry:3`.
- The introduction overstated rate-limit avoidance. Updated it to say a cache reduces repeated upstream pulls, because Docker documents that Docker Hub mirrors remain subject to Docker's policies.
- The description of cached tag behavior implied that repeated tag pulls simply use the cache until expiration. Updated it to reflect Docker's documentation that tag pulls check upstream for the latest content.
- The registry configuration comment said `delete.enabled` deletes old layers when disk space is low. Updated it because Docker documents this as required for pull-through cache cleanup of old cached content, not as a disk-pressure trigger.
- The Docker Hub credential comment said credentials avoid rate limits. Updated it to say credentials use authenticated pull limits, because Docker Hub mirrors remain subject to Docker's policies and limits.
- The Compose examples used the obsolete top-level `version` field. Removed it so the examples match the current Compose Specification.
- The multi-registry Docker daemon text implied Docker could transparently use all configured cache instances as mirrors. Updated it to clarify that Docker's `registry-mirrors` applies to Docker Hub and the non-Docker Hub HTTP endpoints would only be allowed for explicit pulls.
- The containerd example omitted the required `config_path` setting for loading `/etc/containerd/certs.d/*/hosts.toml`. Added the relevant containerd 1.x and 2.x plugin keys.
- The garbage-collection script ran GC against a live registry container. Updated it to stop the registry, run GC in a one-shot registry container with the same config and data mounts, and restart the registry afterward, matching Distribution's stop-the-world GC guidance.

## Review Notes
- The Docker installation commands match Docker's official apt repository flow, though Docker's current docs also install `docker-buildx-plugin`.
- The HTTP mirror examples are appropriate for a lab or private network. Production deployments should generally use TLS and protect any mirror that has upstream credentials configured.
