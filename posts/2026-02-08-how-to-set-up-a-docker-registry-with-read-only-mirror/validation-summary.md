# Validation Summary: How to Set Up a Docker Registry with Read-Only Mirror

## Status
validated

## Post Type
Tutorial / Infrastructure guide

## Technologies Covered
- Docker Engine
- Docker Compose
- Docker Distribution / registry:2
- Docker Hub pull-through cache
- Registry TLS configuration
- Registry garbage collection
- Prometheus metrics

## Sources Consulted
- Docker Docs: Mirror the Docker Hub library - https://docs.docker.com/docker-hub/image-library/mirror/
- Docker Docs: Docker daemon configuration overview - https://docs.docker.com/engine/daemon/
- Docker Docs: dockerd reference - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Docker Hub pull usage and limits - https://docs.docker.com/docker-hub/usage/pulls/
- CNCF Distribution: Registry configuration - https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution: Garbage collection - https://distribution.github.io/distribution/about/garbage-collection/
- Distribution source: proxy metrics - https://github.com/distribution/distribution/blob/main/registry/proxy/proxymetrics.go
- Docker go-metrics source: counter naming - https://github.com/docker/go-metrics/blob/master/namespace.go

## Issues Found
1. The introduction implied every `docker pull` downloads image data and that every subsequent pull is served from cache without qualification. Docker may already have local content, and tag-based pulls through a mirror check the upstream for freshness. Updated the wording and added the tag freshness caveat.
2. The Docker Compose comment said `REGISTRY_STORAGE_DELETE_ENABLED` set a storage limit. It actually enables delete support, which Docker's mirror docs require for the cache scheduler cleanup. Updated the comment.
3. The multiple-registry example showed `registry:2` mirrors for GHCR and Quay.io. Docker's official mirror documentation is Docker Hub-specific and states that only the central Docker Hub can be mirrored this way. Replaced the example with a corrected explanation.
4. The TLS section did not mention that Docker clients must trust the certificate. Added that requirement.
5. The Docker Hub rate-limit statement said authenticated pulls are always limited to 200 per 6 hours. Current Docker Hub docs say authenticated Personal users get 200 per 6 hours, while Pro, Team, and Business users have no pull rate limit, subject to policy. Updated the wording.
6. The cleanup script ran garbage collection inside a live registry container and included an unused `MAX_AGE_DAYS` variable. CNCF Distribution docs warn that garbage collection should run while the registry is stopped or read-only. Updated the script to stop the service, run garbage collection with the same Compose service configuration, then restart it.
7. The monitoring section listed `registry_storage_blob_upload_bytes_total` as the amount of data cached. Current Distribution proxy metrics expose upstream bytes as `registry_proxy_pulled_bytes_total`. Updated the metric name and description.
8. The outage and conclusion wording overstated upstream-outage resilience. Updated it to clarify that resilience applies to cached content and that Docker clients can fall back to Docker Hub when configured with `registry-mirrors`.

## Review Notes
The post remains focused on Docker Hub pull-through caching with the official `registry:2` image. For non-Docker-Hub registries, readers should use a registry/cache product or runtime configuration that explicitly supports registry-specific mirrors.
