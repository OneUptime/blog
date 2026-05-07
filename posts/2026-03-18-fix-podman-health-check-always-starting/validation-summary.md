# Validation Summary: How to Fix Podman Health Check Always Showing Starting

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Podman
- Container health checks
- Dockerfile HEALTHCHECK
- Compose healthcheck configuration
- Alpine Linux / BusyBox
- PostgreSQL, Redis, MySQL, Nginx health check commands

## Sources Consulted
- Podman `podman-create` official documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman `podman-container-inspect` official documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Dockerfile reference for `HEALTHCHECK`, shell form, and exec form: https://docs.docker.com/reference/dockerfile/
- Compose Specification healthcheck section: https://compose-spec.github.io/compose-spec/spec.html
- Alpine Linux BusyBox documentation: https://wiki.alpinelinux.org/wiki/BusyBox

## Issues Found
- The post said health checks have four parameters but listed five. Changed this to "five parameters."
- The Podman inspect examples used `.State.Health`, but official Podman inspect output exposes health data under `.State.Healthcheck`. Updated both inspect commands.
- The explanation of the `starting` state implied retries alone control the transition. Podman documents that failed checks remain `starting` during the start period and transition after the start period if failures continue. Updated the explanation to match this behavior.
- The start-period section said a container stays `starting` for the entire start period even if the application is ready. Podman updates the state to `healthy` as soon as a health check succeeds, even during the start period. Corrected this statement.
- The `/dev/tcp` shell example was not portable for Alpine `/bin/sh`. Replaced it with an Alpine-compatible BusyBox `wget --spider` health check.
- The permissions section implied packaged `curl` may need `chmod a+x`. Alpine packages install executable permissions correctly, so the example was changed to demonstrate permissions for a copied custom health check script instead.
- The list of reasons included the health interval simply not elapsing yet, but Podman documents that the health check runs as soon as the container starts. Changed this to cover disabled or unexpectedly absent automatic checks.
- The networking section described `0.0.0.0` and IPv6 binding imprecisely. Reworded it to focus on IPv4/IPv6 `localhost` resolution and explicit `127.0.0.1` checks.

## Review Notes
Podman was not installed in the local workspace, so CLI behavior was verified against official Podman documentation rather than local `--help` output. The Compose examples match the Compose Specification, including string form being equivalent to `CMD-SHELL` and `["NONE"]` disabling an image-defined healthcheck.
