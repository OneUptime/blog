# Validation Summary: How to Enable Debug Logging for Troubleshooting in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Docker CLI
- Container logging and troubleshooting
- JSON log parsing with `jq`

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Install Portainer CE with Docker on Linux (current STS docs): https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- How can I get the logs for Portainer itself?: https://docs.portainer.io/faqs/troubleshooting/logs-errors-and-debugging/how-can-i-get-the-logs-for-portainer-itself
- Docker CLI reference for `docker container logs`: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker logging overview: https://docs.docker.com/engine/logging/
- Portainer source for CLI flag defaults and enums: https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/api/cli/cli.go
- Portainer source for log configuration and JSON output mode: https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/api/logs/log.go
- Portainer source for debug request timing fields: https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/api/http/middlewares/slow_request_logger.go
- Portainer source for representative proxy, tunnel, and container-operation debug messages: https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/api/http/proxy/factory/agent.go
- Portainer source for representative container-operation debug messages: https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/api/docker/container.go

## Issues Found
- The startup command exposed only the legacy HTTP port `9000` and used `portainer/portainer-ce:latest`. I updated it to Portainer's current documented Docker deployment pattern using `9443` for the UI, `8000` for the tunnel server, and the documented `portainer/portainer-ce:sts` image tag.
- The temporary-session and JSON sections used `docker run -d ...`, which is not a runnable command. I replaced those placeholders with complete `docker run` commands.
- The file-capture example used incorrect shell redirection order: `docker logs portainer 2>&1 > portainer-debug.log`. I corrected it to `docker logs portainer > portainer-debug.log 2>&1` and simplified the log-filter examples to portable `grep -Ei` usage.
- The sample debug log entries were written as if they were exact Portainer output, but several messages and fields were not supported by the current Portainer codebase. I replaced them with representative messages that match current source behavior and added a note that exact fields vary by version and `--log-mode`.
- The JSON parsing example used `.duration` and `.msg`, which do not match Portainer's current zerolog JSON output for slow-request debug entries. I corrected the filter to use `.elapsed_ms` and `.message`.

## Review Notes
- Portainer's own repository notes that `--log-level=DEBUG` is intended for troubleshooting and that debug output may change between releases without warning.
- Portainer's current install docs treat port `9000` as a legacy HTTP option. The revised commands follow the default `9443`/`8000` deployment pattern documented for current CE releases.
