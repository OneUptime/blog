# Validation Summary: How to Use Docker Image Pruning Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker CLI
- Docker image pruning
- Docker system pruning
- Docker build cache pruning
- Dockerfile labels
- Bash scripting
- cron
- systemd timers
- GitLab CI
- GitHub Actions

## Sources Consulted
- Docker Docs: Prune unused Docker objects, https://docs.docker.com/engine/manage-resources/pruning/
- Docker CLI reference: docker image prune, https://docs.docker.com/reference/cli/docker/image/prune/
- Docker CLI reference: docker system prune, https://docs.docker.com/reference/cli/docker/system/prune/
- Docker CLI reference: docker builder prune, https://docs.docker.com/reference/cli/docker/builder/prune/
- Docker CLI reference: docker buildx prune, https://docs.docker.com/reference/cli/docker/buildx/prune/
- Docker Docs: Docker object labels, https://docs.docker.com/engine/manage-resources/labels/
- systemd.service manual: Type=oneshot and multiple ExecStart lines, https://www.freedesktop.org/software/systemd/man/systemd.service.html
- Local Docker CLI help output for docker image prune, docker system prune, docker builder prune, docker buildx du, docker images, and docker ps.

## Issues Found
- The post described dangling images as having no relationship to any tagged image and said they can always be removed. Updated this to say dangling images have no tag and that Docker only prunes dangling images not associated with a container.
- The `docker system prune -a --volumes -f` example described volumes too broadly. Updated the warning to specify anonymous volumes, matching the current Docker CLI reference.
- The registry-aware pruning script removed by image ID, which can be unsafe or fail when multiple tags reference the same image ID. Updated it to remove by image reference, skip dangling images, and check all existing containers with exact matching.
- The build cache example said `docker builder prune -f` removes all build cache. Updated it to `docker builder prune -a -f` and clarified that it removes all unused build cache.
- The GitHub Actions cleanup example used `docker builder prune -f` for aggressive cleanup. Updated it to `docker builder prune -a -f`.

## Review Notes
The remaining commands, filters, Dockerfile labels, cron syntax, systemd timer syntax, and CI configuration snippets are technically valid for the scope of the guide. The custom shell snippets are examples and still depend on local image naming conventions and container image references.
