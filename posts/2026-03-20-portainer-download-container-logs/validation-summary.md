# Validation Summary: How to Download Container Logs from Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker CLI
- Docker Engine API
- Bash
- `curl`
- `jq`
- `cron`

## Sources Consulted
- Portainer Docs: View container logs - https://docs.portainer.io/user/docker/containers/logs
- Portainer Docs: API documentation - https://docs.portainer.io/api/docs
- Portainer Docs: API usage examples - https://docs.portainer.io/sts/api/examples
- Portainer Docs: Accessing the Portainer API - https://docs.portainer.io/2.21/api/access
- Portainer Docs: Using your own SSL certificate with Portainer - https://docs.portainer.io/advanced/ssl
- Portainer API spec (CE 2.39.1) - https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker Docs: `docker container logs` - https://docs.docker.com/reference/cli/docker/container/logs/
- Docker Docs: View container logs - https://docs.docker.com/engine/logging/
- Docker Docs: JSON File logging driver - https://docs.docker.com/engine/logging/drivers/json-file/
- Docker Docs: `docker inspect` - https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: Engine API version history - https://docs.docker.com/reference/api/engine/version-history/

## Issues Found
- The Portainer UI section said to set the number of lines or choose `All`, then look for a generic `Download` or `Export` button. Portainer's current docs specifically document the date picker, line limit controls, and a `Download logs` button. I updated that wording to match the documented UI.
- The post claimed `docker logs my-container > stdout.txt 2>stderr.txt` would split container `stdout` and `stderr`. Docker documents `docker logs` as showing both streams together; shell redirection there only separates the Docker CLI process's own streams. I replaced that example with an accurate note.
- The host log-file examples assumed the default Linux path under `/var/lib/docker/containers/...`. Docker documents `docker inspect --format='{{.LogPath}}'` for retrieving the actual log path, and warns that `json-file` logs are intended for exclusive access by the Docker daemon. I updated the examples to use `LogPath` consistently and added the warning.
- The Portainer API example used legacy HTTP on port `9000` and downloaded combined `stdout` and `stderr` directly with `curl`. Portainer's docs describe `9443` as the normal HTTPS API port, and Docker documents that the logs API may return a multiplexed stream when combined logs are requested. I updated the example to use `https://...:9443` and download one stream at a time for plain-text output.

## Review Notes
- The `docker logs --until` example is valid in current Docker documentation, but the option requires Docker API 1.35 or newer.
- Direct host access to `json-file` logs should remain a last-resort technique; Docker's CLI or API is the preferred path when available.
- Portainer exposes its UI and API over HTTPS by default with a self-signed certificate unless you replace it, so `curl` examples may need a trusted certificate chain or `-k` during local testing.
