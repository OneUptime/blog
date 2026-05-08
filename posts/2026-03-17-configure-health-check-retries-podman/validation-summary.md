# Validation Summary: How to Configure Health Check Retries in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container health checks
- Containerfile / Dockerfile HEALTHCHECK instruction
- Shell commands

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman healthcheck` documentation: https://docs.podman.io/en/latest/markdown/podman-healthcheck.1.html
- Podman `podman inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Dockerfile `HEALTHCHECK` reference: https://docs.docker.com/reference/dockerfile/#healthcheck

## Issues Found
- The post described unhealthy detection time as an exact `retries * interval` value. Health checks can also include command runtime or timeout, so the actual transition can take longer. Updated both comments to describe the values as approximate and note that command runtime or timeout may add time.

## Review Notes
- The `--health-retries`, `--health-cmd`, `--health-interval`, and `--health-timeout` flags are current Podman options.
- Podman documents the default health retry count as 3.
- The Containerfile `HEALTHCHECK --retries` syntax matches the Dockerfile reference and is compatible with container image health check metadata.
