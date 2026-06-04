# Validation Summary: How to Remove Unused Docker Images (Dangling and Unreferenced)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker CLI
- Docker images
- Docker pruning commands
- Docker build cache
- Docker volumes
- Bash shell pipelines
- GitHub Actions workflow snippets
- Cron scheduling

## Sources Consulted
- Docker Docs: Prune unused Docker objects - https://docs.docker.com/engine/manage-resources/pruning/
- Docker CLI reference: docker image prune - https://docs.docker.com/reference/cli/docker/image/prune/
- Docker CLI reference: docker image ls - https://docs.docker.com/reference/cli/docker/image/ls/
- Docker CLI reference: docker system prune - https://docs.docker.com/reference/cli/docker/system/prune/
- Docker CLI reference: docker builder prune - https://docs.docker.com/reference/cli/docker/builder/prune/
- Docker CLI reference: docker buildx du - https://docs.docker.com/reference/cli/docker/buildx/du/
- Local Docker CLI help output for docker image prune, docker system prune, docker builder prune, docker buildx du, docker rmi, docker images, and docker container prune.

## Issues Found
- The post used `docker image prune -a --filter "until=24h" --dry-run`, but `docker image prune` does not support a `--dry-run` option. Replaced it with commands that review local images and containers before pruning.
- The build cache usage example used `docker builder prune --dry-run`, but `docker builder prune` does not support a `--dry-run` option. Replaced it with `docker buildx du`, which is the Docker CLI command for build cache disk usage.
- The `docker system prune -a --volumes` description said it removes unused volumes broadly. Current Docker documentation and CLI help specify that `docker system prune --volumes` prunes unused anonymous volumes, so the command comment and warning text were narrowed accordingly.
- The build cache section described `docker builder prune -a -f` as including named caches. Docker documents this flag as removing all unused build cache, not just dangling cache, so the comment was corrected.
- The preview section claimed to count "images and total size that would be pruned", but the commands only counted dangling images and all local image references. Updated the comments and labels to match the actual output.

## Review Notes
Docker does not provide an exact dry-run mode for `docker image prune`; its documentation notes that prune confirmation does not list every item that will be removed, and negative label filtering is not easily previewed with `docker image ls`.
