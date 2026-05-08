# Validation Summary: How to Run a Container with Ulimit Settings in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux ulimits / setrlimit resource limits
- containers.conf
- Podman Compose / Compose file service configuration
- PostgreSQL, Nginx, and Elasticsearch container examples

## Sources Consulted
- Podman `podman run` documentation for `--ulimit`, `-1`, default `nofile`/`nproc`, and the warning to use `--pids-limit` for container process limits: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman configuration file locations and override behavior: https://docs.podman.io/en/v4.3/markdown/podman.1.html
- containers/common default `containers.conf` reference for `default_ulimits` and `pids_limit`: https://raw.githubusercontent.com/containers/common/main/pkg/config/containers.conf
- Docker Compose services reference for `ulimits` and `pids_limit`, used because `podman compose` delegates to an external Compose provider: https://docs.docker.com/reference/compose-file/services/
- Podman Compose documentation confirming `podman compose` is a wrapper around an external Compose provider: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Elastic Docker guidance for `nofile`, `nproc`, and `bootstrap.memory_lock` / `memlock=-1:-1`: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/docker.html

## Issues Found
- The post described `nproc` as a container process limit and used `--ulimit nproc=4096:4096` in Podman examples. Podman documentation explicitly says not to use `nproc` with `--ulimit` for container process limits because Linux applies it per user, not per container. Updated the explanation and examples to use `--pids-limit 4096` for container-scoped process control.
- The `containers.conf` example set `nproc` in `default_ulimits`. Replaced that with `pids_limit = 4096` while keeping `default_ulimits` for actual ulimit settings.
- The Compose example used an `nproc` ulimit for process control. Replaced it with `pids_limit: 4096`, which is supported by the Compose service specification.
- The Elasticsearch section stated that Elasticsearch requires unlimited memory locking and that `-1` means unlimited. Elastic documents `memlock` as needed when `bootstrap.memory_lock` is enabled, and Podman documents `-1` as the maximum limit of the current process, often unlimited in rootful mode. Updated the wording to reflect those limits accurately.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was verified against official Podman documentation rather than local `podman --help` output. The remaining command examples and configuration snippets are consistent with the referenced documentation.
