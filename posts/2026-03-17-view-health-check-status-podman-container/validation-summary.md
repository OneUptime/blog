# Validation Summary: How to View Health Check Status of a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container health checks
- Go template formatting
- Shell scripting

## Sources Consulted
- Podman healthcheck documentation: https://docs.podman.io/en/latest/markdown/podman-healthcheck.1.html
- Podman ps documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman inspect documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman container inspect documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman events documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman upstream Go package documentation for health check inspect structures and event status constants: https://pkg.go.dev/github.com/containers/podman/v6/libpod/define and https://pkg.go.dev/github.com/containers/podman/v6/libpod/events
- Podman upstream health check implementation: https://github.com/containers/podman/blob/main/libpod/healthcheck.go

## Issues Found
- The post described the `starting` health state as only meaning the container is in the start period. Podman also uses `starting` before a health check has passed, including before enough failures have occurred to become `unhealthy`. Updated the example message and summary wording to avoid that narrower interpretation.
- The health log examples used `index .State.Health.Log 0` while describing the result as the last health check. Podman appends new log entries and trims old entries from the front, so index `0` is the oldest retained entry. Updated the examples to parse the JSON log and read the final array element.

## Review Notes
Podman was not installed in the local environment, so commands could not be executed directly. The review was performed against official Podman documentation and upstream Podman package documentation.
