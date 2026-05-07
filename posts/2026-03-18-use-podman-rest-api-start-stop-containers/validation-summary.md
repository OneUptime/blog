# Validation Summary: How to Use the Podman REST API to Start and Stop Containers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman REST API
- Docker-compatible Podman API
- `curl`
- Python (`http.client`, UNIX domain sockets)
- Container lifecycle operations on Linux

## Sources Consulted
- Podman system service docs (v4.0.0): https://docs.podman.io/en/v4.0.0/markdown/podman-system-service.1.html
- Podman stop docs: https://docs.podman.io/en/latest/markdown/podman-stop.1.html
- Podman kill docs: https://docs.podman.io/en/latest/markdown/podman-kill.1.html
- Podman wait docs (v4.0.0): https://docs.podman.io/en/v4.0.0/markdown/podman-wait.1.html
- Official Podman source for stop endpoint behavior (v4.0.0): https://github.com/containers/podman/blob/v4.0.0/pkg/api/handlers/compat/containers_stop.go
- Official Podman source for restart endpoint behavior (v4.0.0): https://github.com/containers/podman/blob/v4.0.0/pkg/api/handlers/compat/containers_restart.go
- Official Podman source for remove endpoint behavior (v4.0.0): https://github.com/containers/podman/blob/v4.0.0/pkg/api/handlers/compat/containers.go
- Official Podman source for wait endpoint behavior (v4.0.0): https://github.com/containers/podman/blob/v4.0.0/pkg/api/handlers/utils/containers.go
- Official Podman source for healthcheck endpoint behavior (v4.0.0): https://github.com/containers/podman/blob/v4.0.0/pkg/api/handlers/libpod/healthcheck.go
- Official Podman source for inspect health fields (v4.0.0): https://github.com/containers/podman/blob/v4.0.0/libpod/define/container_inspect.go

## Issues Found
- The libpod restart example used `?t=15`, which is the Docker-compatible timeout parameter. I changed it to `?timeout=15`, which is the libpod parameter used by the v4.0 handler.
- The libpod remove-with-volumes example used `v=true`. I changed it to `volumes=true`, because `v` is for Docker-compatible removal while libpod uses `volumes`.
- The wait section implied all wait conditions return an exit code and listed conditions that are not supported by the v4.0 libpod wait handler. I clarified that only the default stop/exit wait returns the container exit code and that other state conditions return `-1`, then reduced the condition list to the supported v4.0 states.
- The prune filter example embedded raw JSON directly in the URL. I replaced it with a percent-encoded `filters` value so the request is a valid URL and avoids `curl` URL-globbing issues.
- The Docker-compatible examples used `/v1.41`. I changed them to `/v1.40` to match the Docker API version Podman officially documents for compatibility.
- The stop-section wording stated the API always sends SIGTERM and treated the default timeout as always 10 seconds. I adjusted the wording to reflect Podman’s actual behavior: the configured stop signal can differ, and the endpoint uses the container’s configured stop timeout unless a timeout is passed explicitly.

## Review Notes
- The libpod examples remain versioned as `/v4.0.0`, which is technically acceptable for a versioned Podman API example.
- Validation was based on official Podman documentation and the official Podman v4.0.0 source, not a live local Podman service.
