# Validation Summary: How to Configure Health Check to Kill a Container in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container health checks
- Container lifecycle management
- Bash shell scripting

## Sources Consulted
- Podman run official documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman create official documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman kill official documentation: https://docs.podman.io/en/latest/markdown/podman-kill.1.html
- Podman events official documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman container inspect official documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html

## Issues Found
- The monitoring example said `podman inspect --format='{{.State.Status}} {{.State.ExitCode}}' kill-on-fail` checks whether a container was killed due to a health check failure. The inspected status and exit code show the container state after termination, but they do not by themselves prove the cause. Changed the comment to say it checks status and exit code after a health-check-triggered kill.

## Review Notes
- The `--health-on-failure kill` action is documented by Podman as a valid action once a container transitions to unhealthy.
- Podman's `kill` behavior sends SIGKILL by default, matching the post's explanation of immediate termination.
- The `podman events --filter event=kill` command is valid for monitoring kill events.
