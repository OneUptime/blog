# Validation Summary: Fix Docker Permission Denied: 5 Solutions That Actually Work

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Dockerfile
- Docker Compose
- Linux file permissions
- SELinux bind mount labels
- PostgreSQL Docker image
- Nginx Docker image
- Elasticsearch Docker image

## Sources Consulted
- Docker Docs: Linux post-installation steps for Docker Engine - https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs: Docker run CLI reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Docker build CLI reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Docs: Docker inspect and exec CLI references - https://docs.docker.com/reference/cli/docker/inspect/ and https://docs.docker.com/reference/cli/docker/container/exec/
- Docker Docs: Dockerfile reference - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Bind mounts and SELinux labels - https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: docker compose up CLI reference - https://docs.docker.com/reference/cli/docker/compose/up/
- Elastic Docs: Configure Elasticsearch with Docker - https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-configure
- Elastic Docs: Using Elasticsearch Docker images in production - https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-prod
- docker-library/postgres Dockerfile source - https://github.com/docker-library/postgres/blob/master/16/bookworm/Dockerfile

## Issues Found
- The description said the post covered rootless mode, but the article did not include a rootless Docker section. Changed the description to mention the topics actually covered.
- The named-volume wording said Docker handles permissions automatically, which was too broad. Changed it to say named volumes avoid host directory ownership mismatches.
- The Compose example used the obsolete top-level `version: '3.8'` field. Removed it to match the current Compose Specification guidance.
- The Compose command used the legacy `docker-compose` command and `UID`/`GID` shell assignments. Changed it to `docker compose up` and `HOST_UID`/`HOST_GID` because `UID` is readonly in Bash.
- The Compose interpolation examples used `UID`/`GID`, which can conflict with shell variables. Updated them to `HOST_UID`/`HOST_GID`.
- The Elasticsearch example used `1000:1000` ownership and the short `elasticsearch:8.11.0` image name. Elastic documents Elasticsearch containers as running with uid:gid `1000:0`; updated the directory preparation and image reference accordingly.
- The named-volume best-practice comment said Docker manages permissions. Changed it to the narrower claim that Docker manages the volume location.

## Review Notes
The remaining examples are technically valid, but some are intentionally broad troubleshooting patterns. In particular, `chmod 777` and `chmod 666 /var/run/docker.sock` are correctly labeled as permissive or temporary rather than best-practice security guidance.
