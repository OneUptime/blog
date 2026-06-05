# Validation Summary: How to Fix Docker 'Layer Already Exists' Push Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker Engine
- Docker Build and BuildKit cache
- Docker CLI
- Docker Hub
- Amazon ECR
- Docker Registry Distribution
- Multi-platform container images
- npm

## Sources Consulted
- Docker CLI `docker build --help`, `docker push --help`, `docker image prune --help`, `docker builder prune --help`, `docker inspect --help`, `docker history --help`, `docker images --help`, and `docker rmi --help`
- Docker Docs: Docker image push, https://docs.docker.com/reference/cli/docker/image/push/
- Docker Docs: Build cache, https://docs.docker.com/build/cache/
- Docker Docs: Build cache invalidation, https://docs.docker.com/build/cache/invalidation/
- Docker Docs: Dockerfile reference, https://docs.docker.com/reference/builder
- Docker Docs: Understanding image layers, https://docs.docker.com/get-started/docker-concepts/building-images/understanding-image-layers/
- Docker Docs: Multi-platform builds, https://docs.docker.com/build/building/multi-platform/
- Docker Docs: Docker manifest, https://docs.docker.com/reference/cli/docker/manifest/
- Docker Docs: Docker Hub usage and limits, https://docs.docker.com/docker-hub/usage/storage/
- AWS CLI Command Reference: `put-image-tag-mutability`, https://docs.aws.amazon.com/cli/latest/reference/ecr/put-image-tag-mutability.html
- npm CLI `npm ci --help`

## Issues Found
- The post said each Dockerfile instruction creates a layer. I changed this to clarify that filesystem-changing instructions create layers, while metadata instructions such as `CMD` update image configuration.
- The stale-image explanation implied `COPY . .` could stay cached despite source changes. I clarified that Docker invalidates `COPY` cache when copied file content or relevant metadata changes, and that stale builds usually come from the wrong build context or `.dockerignore` exclusions.
- The Dockerfile example used `npm ci --only=production`. I changed it to `npm ci --omit=dev`, which is the current npm option shown by npm 10 help.
- The Docker Hub note said "Free accounts" have 200 pulls per 6 hours and unlimited pushes. I updated it to current Docker Hub plan wording: Personal accounts have 200 pulls per 6 hours, while Pro, Team, and Business accounts have unlimited pulls.
- The multi-platform section said AMD64 and ARM64 variants share no layers. I changed this to the accurate model: each platform has its own manifest and layer list, variants often differ, and identical layer blobs can still be deduplicated by digest.
- The best-practice note said a successful push shows at least one `Pushed` layer when actual changes were made. I softened this because manifest-only or configuration-only updates may not create new filesystem layers.

## Review Notes
The AWS CLI examples could not be checked locally because the AWS CLI is not installed in this workspace, but the command names and options were verified against the official AWS CLI documentation. The Docker CLI examples were checked against the installed Docker help output.
