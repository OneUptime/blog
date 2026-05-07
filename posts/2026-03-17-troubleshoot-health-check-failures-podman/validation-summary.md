# Validation Summary: How to Troubleshoot Health Check Failures in Podman

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Podman
- Container health checks
- Podman CLI commands
- Container networking and process inspection

## Sources Consulted
- Podman healthcheck documentation: https://docs.podman.io/en/latest/markdown/podman-healthcheck.1.html
- Podman run documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- Podman inspect documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman container inspect documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Podman events documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman libpod events API documentation: https://pkg.go.dev/github.com/containers/podman/v6/libpod/events

## Issues Found
- The `podman inspect --format` examples used `.State.Health`, which matches Docker's inspect structure but not current Podman inspect output. Podman documents health check state under `.State.Healthcheck`, with `Status`, `FailingStreak`, and `Log` fields. Updated the four inspect commands to use `.State.Healthcheck`.

## Review Notes
Podman was not installed in the local review environment, so CLI behavior could not be checked with `podman --help`. Commands and flags were verified against official Podman documentation instead. The `podman events --filter event=health_status` example is supported by Podman's libpod event status constants, although the generated events man page does not currently list `health_status` in the container status list.
