# Validation Summary: How to Set Up Docker Registry Mirroring for High Availability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker Compose
- CNCF Distribution / Docker Registry
- Docker Hub pull-through cache
- HAProxy
- NFS-backed Docker volumes
- Amazon S3 registry storage
- Registry garbage collection

## Sources Consulted
- Docker Docs: Mirror the Docker Hub library - https://docs.docker.com/docker-hub/image-library/mirror/
- Docker Docs: Compose file version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- CNCF Distribution: Registry as a pull through cache - https://distribution.github.io/distribution/recipes/mirror/
- CNCF Distribution: Configuring a registry - https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution: S3 storage driver - https://distribution.github.io/distribution/storage-drivers/s3/
- CNCF Distribution: Garbage collection - https://distribution.github.io/distribution/about/garbage-collection/
- CNCF Distribution: Test an insecure registry - https://distribution.github.io/distribution/about/insecure/

## Issues Found
- Removed obsolete top-level `version: '3.8'` entries from Docker Compose examples. Docker Compose treats the top-level `version` field as obsolete and uses the current Compose Specification schema.
- Fixed the Docker daemon JSON example by moving the `/etc/docker/daemon.json` path outside the JSON code block. JSON files do not support `//` comments.
- Enabled registry delete support in pull-through cache examples with `REGISTRY_STORAGE_DELETE_ENABLED: "true"` because Distribution requires delete to be enabled for the proxy cache cleanup scheduler to remove old entries.
- Replaced `${DOCKER_HUB_USER}` and `${DOCKER_HUB_PASSWORD}` inside `config.yml` with scalar placeholder values. Compose-style interpolation is appropriate in the Compose file, but a mounted registry configuration file should not rely on Compose interpolating its contents.
- Added a clarification to the multi-registry example that each pull-through cache mirrors one upstream registry, and Docker daemon `registry-mirrors` are for Docker Hub pulls. Other upstream caches must be addressed directly.
- Removed `REGISTRY_PROXY_REMOTEURL` from the S3 storage backend example. Official pull-through cache guidance recommends the filesystem driver for cache correctness, while the S3 example is valid as a storage backend for a registry.
- Changed garbage collection commands from `bin/registry` to `/bin/registry` for the registry container path.
- Reworked the production garbage collection service from an always-running scheduled deletion loop into a maintenance-profile helper. Distribution garbage collection should run only when the registry is read-only or stopped.
- Changed the HA summary benefit from "No single point of failure" to "Registry instance failover" because the example still has shared storage and load-balancer dependencies.

## Review Notes
- The HTTP mirror URL shown with `localhost:5000` is suitable for local testing. Production mirrors should use TLS or be configured explicitly as insecure registries on each Docker Engine host.
- The HA example still depends on external `config.yml`, `haproxy.cfg`, and NFS infrastructure that are not shown in the post. The snippet is directionally correct but not a complete production deployment by itself.
