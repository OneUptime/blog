# Validation Summary: How to Fix Docker 'Too Many Requests' Rate Limit Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Docker Hub
- Docker Engine and Docker CLI
- Docker Registry / CNCF Distribution pull-through cache
- Kubernetes image pull secrets
- GitHub Actions
- Docker Buildx / BuildKit caching
- Skopeo

## Sources Consulted
- Docker Docs: Docker Hub pull usage and limits, https://docs.docker.com/docker-hub/usage/storage/
- Docker Docs: Docker Hub usage and limits, https://docs.docker.com/docker-hub/usage/
- Docker Docs: Docker daemon configuration overview, https://docs.docker.com/engine/daemon/
- Docker Docs: Mirror the Docker Hub library, https://docs.docker.com/docker-hub/image-library/mirror/
- Docker Docs: docker login CLI reference, https://docs.docker.com/reference/cli/docker/login/
- Docker Pricing, https://www.docker.com/pricing/
- CNCF Distribution: Registry as a pull through cache, https://distribution.github.io/distribution/recipes/mirror/
- CNCF Distribution: Registry configuration proxy settings, https://distribution.github.io/distribution/about/configuration/
- Kubernetes Docs: Pull an Image from a Private Registry, https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Docker login-action README, https://github.com/docker/login-action
- Docker build-push-action README, https://github.com/docker/build-push-action
- Docker Docs: GitHub Actions cache backend, https://docs.docker.com/build/cache/backends/gha/
- Skopeo project README and skopeo-copy documentation, https://github.com/containers/skopeo

## Issues Found
- Docker Hub paid-plan limits were outdated. The post said Docker Pro/Team/Business plans provide "5,000+ pulls per day"; Docker currently documents Pro, Team, and Business authenticated pull rate as unlimited, subject to fair use. Updated the rate-limit table and upgrade section.
- Anonymous pull attribution was incomplete. Docker documents anonymous limits as 100 pulls per 6 hours per IPv4 address or IPv6 /64 subnet. Updated the table and explanatory paragraph.
- The Docker Hub pull-limit error URL used the singular `increase-rate-limit`; current Docker documentation uses `https://www.docker.com/increase-rate-limits`. Updated the sample error message.
- The authentication explanation was too broad. Authenticating doubles quota specifically for Docker Personal accounts; paid plans have different limits. Updated the wording.
- The registry mirror section said cached pulls consume zero Docker Hub quota. CNCF Distribution documents that tag pulls may check the remote and stale cache entries can be re-fetched, so the statement was too absolute. Updated it to say mirrors reduce quota usage.
- The GitHub Actions Docker build action example used `docker/build-push-action@v5`. The current Docker documentation and action README use `docker/build-push-action@v7`. Updated the workflow snippet.
- The CI cache heading referred to caching Docker images, but the shown Buildx configuration caches build layers. Updated the heading to match the example.
- Docker subscription pricing was outdated. Updated Pro, Team, and Business pricing to match Docker's current public pricing page as of 2026-06-05.

## Review Notes
- The Kubernetes pull-secret command and Docker Hub server URL match Kubernetes documentation, though the official docs still warn that placing secrets directly on the command line can expose them through shell history or process listings.
- GitHub-hosted runners are documented by GitHub as not subject to Docker Hub pull limits because of an agreement between GitHub and Docker, but the authentication and caching guidance remains correct for CI systems generally and for non-GitHub-hosted runners.
- Docker Registry pull-through cache examples are valid for Docker Hub mirrors, but production Kubernetes clusters commonly use containerd configuration rather than Docker daemon `registry-mirrors` on nodes.
