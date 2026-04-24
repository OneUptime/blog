# Validation Summary: How to Use the --log-level and --log-mode Flags in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition CLI flags
- Docker
- `jq`
- JSON logging via zerolog

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer CE install with Docker on Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer source for CLI flag defaults and allowed values: https://github.com/portainer/portainer/blob/develop/api/cli/cli.go
- Portainer source for logging mode implementation and Unix timestamp formatting: https://github.com/portainer/portainer/blob/develop/api/logs/log.go
- Portainer source for initial logger setup: https://github.com/portainer/portainer/blob/develop/api/cmd/portainer/main.go
- zerolog defaults for `time`, `level`, and `message` fields plus Unix timestamp formatting: https://github.com/rs/zerolog/blob/v1.34.0/globals.go
- Portainer CE Docker image tags: https://hub.docker.com/r/portainer/portainer-ce/tags

## Issues Found
- The `jq` examples used `.msg`, but Portainer's `--log-mode JSON` output uses zerolog's default `.message` field. I updated both commands to read `.message` instead.
- Portainer sets JSON timestamps as Unix timestamps, so I updated the readable `jq` example to convert `.time` with `todateiso8601`.

## Review Notes
- Portainer's current docs use `portainer/portainer-ce:sts` or `:lts` in install examples. The post's `:latest` tag is still valid according to the official Docker Hub tags, but a pinned tag would be less ambiguous in future updates.
