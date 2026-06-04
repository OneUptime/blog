# Validation Summary: How to Set Ulimits for a Docker Container at Runtime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker daemon configuration
- Docker Compose
- Linux resource limits / ulimits
- Elasticsearch container runtime requirements
- PostgreSQL and Nginx container examples

## Sources Consulted
- Docker CLI reference for `docker container run --ulimit`: https://docs.docker.com/reference/cli/docker/container/run/
- Docker `dockerd` reference for `default-ulimits` in `daemon.json`: https://docs.docker.com/reference/cli/dockerd/
- Docker Compose services reference for `ulimits`: https://docs.docker.com/reference/compose-file/services/#ulimits
- Elastic documentation for running Elasticsearch with Docker and production ulimit requirements: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/docker.html
- Elastic documentation for `bootstrap.memory_lock` and memory locking: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/setup-configuration-memory
- Elastic bootstrap checks documentation: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/bootstrap-checks
- Linux `getrlimit(2)` manual page for `RLIMIT_NOFILE`, `RLIMIT_NPROC`, `RLIMIT_MEMLOCK`, and soft/hard limit semantics: https://man7.org/linux/man-pages/man2/getrlimit.2.html
- Local Docker CLI verification with Docker Engine 29.4.2 and Docker Compose v5.1.3.

## Issues Found
- The `memlock` explanation incorrectly connected Elasticsearch's need for memory locking to memory-mapped files. Changed it to explain that `memlock` is used when applications lock process memory to avoid swapping.
- The Elasticsearch examples used `elasticsearch:8.12.0`. Changed them to Elastic's official Docker registry image, `docker.elastic.co/elasticsearch/elasticsearch:8.12.0`, matching Elastic documentation.
- The Elasticsearch section implied unlimited `memlock` is always required. Clarified that unlimited `memlock` is required when `bootstrap.memory_lock` is enabled.
- The database section stated Docker's default `nofile` limit of 1024 without qualification. Clarified that 1024 is the default soft limit on many hosts; local Docker Engine 29.4.2 verification showed a soft `nofile` limit of 1024 and hard limit of 524288.
- The troubleshooting section said a container cannot exceed the host's limits. Reworded this to focus on the Docker daemon's effective limits, which are the relevant inherited process limits for containers.
- The `nproc` description and troubleshooting text treated it like a simple container process counter and suggested processes might be killed. Updated the text to explain that Linux enforces `nproc` for the real user ID and that too-low values prevent new processes or threads from starting.

## Review Notes
The Docker, Compose, and daemon configuration snippets are syntactically valid and match current official documentation. Local execution confirmed `--ulimit nofile=4096:8192`, `--ulimit memlock=-1:-1`, and `--ulimit core=0:0` behave as described using a locally available Ubuntu image. A direct pull of `ubuntu:latest` was blocked by Docker Hub unauthenticated pull rate limits, so local runtime checks used `ubuntu:22.04` instead.
