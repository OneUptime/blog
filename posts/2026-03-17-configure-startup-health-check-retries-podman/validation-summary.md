# Validation Summary: How to Configure Startup Health Check Retries in Podman

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- Container health checks
- Startup health checks

## Sources Consulted
- Official Podman `podman-run` documentation: https://docs.podman.io/en/stable/markdown/podman-run.1.html

## Issues Found
- The post said startup health check retries determine when a container is considered failed to start. Updated this to state that Podman restarts the container after the configured number of failed startup health check attempts, matching the official `--health-startup-retries` documentation.
- The post described the startup retry window as an exact maximum startup time. Updated the wording to call it an approximate retry window, since health check command timeout and scheduling behavior can affect the wall-clock time.
- The failure-action example implied `--health-on-failure kill` kills the container when startup retries are exhausted. Updated the comment to clarify that startup retries govern startup restarts, while `--health-on-failure kill` applies when the regular health check later transitions to unhealthy.

## Review Notes
The command-line flags used in the examples are valid current Podman `podman run` options. Startup healthchecks require a regular healthcheck from the image or from `--health-cmd`; the examples correctly include `--health-cmd`.
