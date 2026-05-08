# Validation Summary: How to Map Multiple Ports in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container port publishing
- TCP and UDP port mappings
- Podman networks
- Nginx
- Node.js debugging
- PostgreSQL and pgAdmin
- Prometheus metrics endpoints
- Bash port checks

## Sources Consulted
- Podman run documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman create documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman port documentation: https://docs.podman.io/en/latest/markdown/podman-port.1.html
- Podman ps documentation: https://docs.podman.io/en/latest/markdown/podman-ps.1.html
- Podman inspect documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman network create documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Node.js CLI documentation for `--inspect`: https://nodejs.org/api/cli.html

## Issues Found
- The "Binding Different Ports to Different Interfaces" example used `curl http://localhost:8080` with the comment "Works from anywhere". The port mapping to `0.0.0.0` is correct, but `localhost` only refers to the local machine. Changed the comment to clarify that the localhost URL works locally and remote clients should use the host IP.

## Review Notes
- Podman was not installed in the local environment, so command behavior was checked against official Podman documentation rather than local `--help` output.
- The examples use placeholder images such as `myapp:latest`, `api:latest`, and `game-server:latest`; those are acceptable tutorial placeholders, but the images themselves were not runnable artifacts to validate.
