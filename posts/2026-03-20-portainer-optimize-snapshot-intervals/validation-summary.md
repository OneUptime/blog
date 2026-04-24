# Validation Summary: How to Optimize Docker Snapshot Intervals for Performance - Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- Portainer Edge Agent Async

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer general settings: https://docs.portainer.io/admin/settings/general
- Portainer CE install on Docker (Linux): https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer Edge Agent Async on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge-async
- Portainer API documentation: https://docs.portainer.io/api/docs
- Docker `docker stats` reference: https://docs.docker.com/reference/cli/docker/container/stats/
- Docker `docker run` reference: https://docs.docker.com/reference/cli/docker/container/run
- Portainer source: CLI flags and validation: https://github.com/portainer/portainer/blob/develop/api/cli/cli.go
- Portainer source: default snapshot interval and snapshot model: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source: snapshot scheduling behavior: https://github.com/portainer/portainer/blob/develop/api/internal/snapshot/snapshot.go
- Portainer source: Docker snapshot contents: https://github.com/portainer/portainer/blob/develop/pkg/snapshot/docker.go

## Issues Found
- The post stated the default snapshot interval was 60 seconds. Current Portainer docs and source set the default to `5m`. I corrected the default value and the matching example.
- The post used bare numeric values like `--snapshot-interval 300` and `--snapshot-interval=180`. Portainer validates this flag with Go `time.ParseDuration`, so duration units are required. I changed the examples to `3m` and `5m`.
- The post used unsupported log-level values (`warn`, `debug`) and an unsupported log mode (`file`). Current Portainer supports uppercase `DEBUG`, `INFO`, `WARN`, `ERROR` and log modes `PRETTY`, `NOCOLOR`, `JSON`. I corrected the examples and explanation.
- The debug example stopped the existing `portainer` container and immediately re-ran another container with the same name without removing the old one. Docker requires container names to be unique. I added `docker rm portainer`.
- The post said snapshots contain the full Docker state, including container resource stats, stack states, and service replica counts, and implied the UI reads only from snapshots. Portainer's docs and source show snapshots are summary data used for Home/dashboard information, while detailed operations are proxied through the Portainer server. I narrowed the snapshot-content and UI-freshness explanations accordingly.
- The post treated Edge environments as part of the main server snapshot-interval guidance and claimed Business Edition allows disabling snapshots per environment. Portainer's main snapshot interval is global, while Edge Agent Async uses separate per-environment snapshot settings. I corrected the Edge guidance.
- The examples exposed Portainer on port `9000` only. Current Portainer install docs use `9443` by default and treat `9000` as legacy HTTP. I updated the examples to `9443`.

## Review Notes
- The deployment-size interval recommendations are heuristic guidance rather than values prescribed by Portainer's official documentation.
- The post still uses the `portainer/portainer-ce:latest` image tag in examples. Portainer's install docs often show channel/version tags such as `:sts` or `:lts`, so pinning a tag may be preferable in future revisions.
