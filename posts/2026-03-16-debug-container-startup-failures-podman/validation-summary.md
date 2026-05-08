# Validation Summary: How to Debug Container Startup Failures in Podman

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Podman
- OCI containers
- Container images
- Container health checks
- SELinux volume labeling
- Linux process exit codes

## Sources Consulted
- Podman documentation: podman command exit codes: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman documentation: podman inspect: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman documentation: podman logs: https://docs.podman.io/en/v5.3.2/markdown/podman-logs.1.html
- Podman documentation: podman events: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman documentation: podman run options including entrypoint, env files, health checks, restart policy, and volume labeling: https://docs.podman.io/en/v4.4/markdown/podman-run.1.html

## Issues Found
- The post described exit code 125 as a "Podman daemon error." Podman is daemonless, and the official documentation describes exit code 125 as an error with Podman itself, such as invalid flags. Changed this to "Podman error."
- The logs section said that if a container never started, logs might show failed health checks. Health checks run after container startup, not before it starts. Changed the wording to refer to containers that start and then exit quickly.
- The health-check section implied that unhealthy containers are restarted automatically. Podman health checks default to no action on failure unless a failure action such as restart is configured. Updated the wording to make restart conditional.

## Review Notes
The command examples and flags reviewed are valid in current Podman documentation. The local environment did not have Podman installed, so command validation was performed against official documentation rather than local `--help` output.
