# Validation Summary: How to Automate Container Cleanup Scripts with Portainer API

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- Docker Engine API
- `curl`
- Shell scripting
- Cron
- Docker Compose / Portainer stacks

## Sources Consulted
- Portainer API access tokens and authentication: https://docs.portainer.io/api/access.md
- Portainer API usage examples and Docker reverse-proxy pattern: https://docs.portainer.io/sts/api/examples.md
- Portainer API documentation index: https://docs.portainer.io/api/docs.md
- Portainer CE 2.39.2 OpenAPI spec for `/api/endpoints`: https://api-docs.portainer.io/versions/ce/2.39.2/endpoints.yaml
- Docker Engine API v1.51 reference: https://docs.docker.com/reference/api/engine/version/v1.51/
- Docker Engine API v1.51 OpenAPI spec: https://docs.docker.com/reference/api/engine/version/v1.51.yaml
- Docker CLI reference for `docker volume prune`: https://docs.docker.com/reference/cli/docker/volume/prune/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- curl URL syntax and globbing behavior: https://curl.se/docs/url-syntax.html

## Issues Found
- The stopped-container lookup used `GET /containers/json` without `all=true`. Docker documents that this endpoint returns only running containers by default, so filtering on `status=exited` could miss stopped containers. I added `all=true`.
- The `curl` examples passed raw JSON filter strings in URLs. curl documents URL globbing for `{}` and `[]`, which can break these requests unless globbing is disabled. I added `--globoff` to the affected requests.
- The volume-prune example called `POST /volumes/prune` without the `all` filter, which only prunes anonymous unused volumes by default. The post text says it cleans up unused/orphaned volumes, so I added `filters={"all":["true"]}`.
- The script hard-coded `PORTAINER_URL`, `API_KEY`, and `LOG_FILE`, but the containerized example set those as environment variables. I updated the script to honor environment variables while preserving the original defaults.
- The cron examples redirected stdout to the same log file that the script already writes to with `tee`, which would duplicate log lines. I changed the cron redirection to suppress stdout and append only stderr.
- The Portainer stack example was not runnable as written: it mounted `cleanup.sh` instead of the published `portainer-cleanup.sh`, used an image without Python, and did not create a working crontab. I replaced it with an Alpine-based example that installs `curl` and `python3`, mounts the correct script, writes the cron entry, and runs `crond -f`.
- The summary said the script calls "the Docker prune endpoints", but the container cleanup path uses container listing and deletion plus image/volume prune calls. I corrected that wording.

## Review Notes
- The post is now technically sound against current Portainer and Docker documentation.
- The examples rely on Portainer proxying Docker Engine API requests through `/api/endpoints/<ENVIRONMENT_ID>/docker`, which Portainer documents but does not fully enumerate in its own OpenAPI spec.
