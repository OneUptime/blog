# Validation Summary: How to Automate Docker Cleanup with Shell Scripts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker image, container, volume, network, system, and builder pruning
- Docker BuildKit build cache
- Bash shell scripting
- Cron scheduling
- Disk usage monitoring with `df`
- Slack webhook alerts with `curl`

## Sources Consulted
- Docker Docs: Prune unused Docker objects - https://docs.docker.com/engine/manage-resources/pruning/
- Docker CLI reference: `docker system prune` - https://docs.docker.com/reference/cli/docker/system/prune/
- Docker CLI reference: `docker image prune` - https://docs.docker.com/reference/cli/docker/image/prune/
- Docker CLI reference: `docker volume prune` - https://docs.docker.com/reference/cli/docker/volume/prune/
- Docker CLI reference: `docker builder prune` - https://docs.docker.com/reference/cli/docker/builder/prune/
- Docker CLI reference: `docker buildx prune` - https://docs.docker.com/reference/cli/docker/buildx/prune/
- Docker CLI reference: `docker ps` - https://docs.docker.com/reference/cli/docker/container/ls/
- Docker CLI reference: `docker system df` - https://docs.docker.com/reference/cli/docker/system/df/
- Local Docker CLI help output for the installed Docker client.

## Issues Found
- The standalone image cleanup script said it removed images not referenced by any container, but it only checked running containers with `docker ps`. Changed it to `docker ps -a` so stopped containers are also considered, matching Docker's definition of unused images.
- The image cleanup loop could process the same image ID multiple times when an image had multiple tags. Added `sort -u` to process each image ID once.
- The macOS/BSD `date` fallback did not parse Docker's RFC3339-style timestamps with fractional seconds and a trailing `Z`. Added a small `parse_docker_time` helper to the affected scripts.
- The master cleanup script defined `PROTECTED_IMAGES` and `PROTECTED_VOLUMES` but then used `docker image prune -a` and `docker volume prune`, which ignored those protection lists. Replaced those steps with explicit image and volume loops that honor the configured protections.
- The cron example passed `--aggressive`, but the master script did not implement that option. Changed the weekly cron example to run the same script as an extra maintenance pass.

## Review Notes
- The Docker command flags used in the post are current in the official Docker CLI documentation. `docker builder prune --keep-storage` remains documented for `docker builder prune`; `docker buildx prune` uses newer cache-size options such as `--max-used-space` and `--reserved-space`.
- `shellcheck` was not installed in the workspace, so linting could not be performed. Bash parse checks with `bash -n` passed for the script snippets.
