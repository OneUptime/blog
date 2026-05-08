# Validation Summary: How to Configure Health Check Log Destination in Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Container health checks
- Podman CLI
- Linux logging

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `podman container inspect` documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Podman `podman events` documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman `podman healthcheck` documentation: https://docs.podman.io/en/latest/markdown/podman-healthcheck.1.html

## Issues Found
- The post described the default health check log destination as "container state." Podman's documentation describes the default `local` destination as local container storage under overlay containers, so I changed the wording to "local container storage."
- The `podman inspect` examples used Docker-style `.State.Health` paths. Podman's documented container inspect structure uses `.State.Healthcheck`, so I changed the examples to `.State.Healthcheck.Log` and `.State.Healthcheck`.
- The log destination wording implied arbitrary storage backends. Podman's documented choices are `local`, a directory path, or `events_logger`, so I narrowed the explanation to those supported destinations.
- The max log settings section referred generally to size limits. Podman documents `--health-max-log-size` as a maximum length in characters, so I updated the wording to avoid implying byte-based size limits.

## Review Notes
Podman was not installed in this workspace, so local CLI verification was not possible. The review used current official Podman documentation. The sample images are placeholders and assume the image contains `curl` and exposes `/health` on port 8080.
