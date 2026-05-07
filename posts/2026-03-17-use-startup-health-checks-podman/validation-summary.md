# Validation Summary: How to Use Startup Health Checks in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container health checks
- Startup health checks
- Container CLI commands

## Sources Consulted
- Podman latest `podman run` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman 5.6.1 `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html

## Issues Found
- The post described `--health-startup-retries` as allowing startup health check failures before retries are exhausted. Podman documents this option as the number of failed startup attempts before the startup healthcheck restarts the container. Updated the explanation, phase comments, and timing note to describe restart behavior.
- The post said startup checks are preferred over `--health-start-period` because of separate retry settings. Since startup retries control restart attempts rather than the regular unhealthy transition, changed this to say startup checks are useful when a separate endpoint and startup-specific configuration are needed.

## Review Notes
Podman was not installed in the local environment, so CLI help could not be checked locally. The command flags and behavior were verified against the official Podman documentation instead.
