# Validation Summary: How to Use Docker API Directly with curl

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Engine API
- Docker daemon Unix socket and TCP API access
- curl
- jq
- Bash scripting
- Docker containers, images, networks, events, logs, stats, and pruning

## Sources Consulted
- Docker Engine API overview and versioning: https://docs.docker.com/reference/api/engine/
- Docker Engine API v1.44 reference: https://docs.docker.com/reference/api/engine/version/v1.44/
- Docker Engine API v1.45 reference for endpoint parameter details and log stream wording: https://docs.docker.com/reference/api/engine/version/v1.45/
- Docker Engine API v1.53 reference for current attach/log stream format wording: https://docs.docker.com/reference/api/engine/version/v1.53/
- Docker Engine API version history: https://docs.docker.com/reference/api/engine/version-history/
- curl local manual output for `--unix-socket`, `--get`, and `--data-urlencode`

## Issues Found
- Raw JSON filters were embedded directly in curl URLs for container listing, event streaming, and image pruning. curl treats `{}` and `[]` as URL globbing syntax unless globbing is disabled or the query is encoded, so these examples can fail before reaching Docker. Updated the GET examples to use `--get --data-urlencode` and encoded the POST prune query parameter.
- The log output note described a single header byte per line and suggested `sed` cleanup. Docker's documented multiplexed stream format uses an 8-byte frame header containing stream type and payload size, so simple line-based cleanup is unreliable. Updated the note to describe the frame format accurately and recommend a Docker stream parser or TTY-created containers for raw output.
- The post claimed every Docker CLI command maps to an API endpoint. Docker's documentation says most client commands map directly to API endpoints, and some CLI behavior is client-side or outside the Engine API. Updated the opening and summary wording to say most Docker Engine CLI commands map to API endpoints.

## Review Notes
The examples use API v1.44, which remains a supported Engine API version for Docker Engine versions that support that API level. Users on newer daemons can substitute the daemon's supported API version, as described in Docker's API versioning documentation.
