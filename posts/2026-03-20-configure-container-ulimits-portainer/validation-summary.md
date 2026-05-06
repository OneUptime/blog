# Validation Summary: How to Configure Container Ulimits in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose / stack files
- Linux `ulimit` resource limits
- Elasticsearch
- MongoDB
- NVIDIA GPU / ML containers

## Sources Consulted
- Portainer documentation, "Add a new stack": https://docs.portainer.io/user/docker/stacks/add
- Docker Compose file reference, "Version and name top-level elements": https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose file reference, "Services": https://docs.docker.com/reference/compose-file/services/
- Docker CLI reference, "`docker container run`": https://docs.docker.com/reference/cli/docker/container/run
- Docker CLI reference, "`dockerd`": https://docs.docker.com/reference/cli/dockerd/
- Elasticsearch documentation, "Increase the file descriptor limit": https://www.elastic.co/guide/en/elasticsearch/reference/current/file-descriptors.html
- Elasticsearch documentation, "Install Elasticsearch with Docker": https://www.elastic.co/guide/en/elasticsearch/reference/8.19/docker.html
- MongoDB documentation, "UNIX ulimit Settings for Self-Managed Deployments": https://www.mongodb.com/docs/manual/reference/ulimit/index.html
- NVIDIA AI Enterprise documentation, "Quick Start Guide": https://docs.nvidia.com/ai-enterprise/release-4/latest/getting-started/quick-start-guide.html
- Local shell builtin help for `ulimit`: `bash -lc 'help ulimit'`

## Issues Found
- The first Compose example used a top-level `version: "3.8"` field. Current Docker Compose documentation marks the top-level `version` key as obsolete, so I removed it.
- The post treated `nproc` as though it were a straightforward container-level process limit. Docker’s official docs warn that `nproc` is enforced per user, not per container, so I removed the MongoDB `nproc` example, clarified the table entry, and added `pids_limit` guidance in troubleshooting for per-container process caps.
- The `/etc/docker/daemon.json` example contained a JavaScript-style comment inside a `json` code block, which made the snippet invalid JSON. I moved the file path outside the block and added the missing note that Docker must be reloaded or restarted after updating `daemon.json`.
- The troubleshooting example was labeled as `bash` even though it mixed log output and YAML. I changed that fence to `text` so the example is not presented as runnable shell code.
- The GPU/ML section said NVIDIA workloads "require" the shown limits. I narrowed that wording to match NVIDIA’s documented examples more accurately without overgeneralizing.

## Review Notes
- The image tags in the examples are pinned and may age over time, but the `ulimits` syntax and configuration patterns were validated on 2026-05-06.
- `nproc` remains a valid Docker/Compose ulimit, but `pids_limit` is the better fit when the goal is a per-container PID cap rather than a per-user limit.
