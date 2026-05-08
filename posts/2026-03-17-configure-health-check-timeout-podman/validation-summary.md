# Validation Summary: How to Configure Health Check Timeout in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container health checks
- Containerfile/Dockerfile HEALTHCHECK instruction
- Shell commands

## Sources Consulted
- Podman official documentation: podman-run, health check options (`--health-cmd`, `--health-interval`, `--health-timeout`, `--health-retries`, `--health-start-period`): https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman official documentation: podman-inspect and Go template formatting: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Docker official Dockerfile reference: HEALTHCHECK instruction options and timeout behavior: https://docs.docker.com/reference/builder/#healthcheck

## Issues Found
No technical issues found.

## Review Notes
The Podman CLI was not installed in the local environment, so verification was performed against current official Podman documentation rather than local `podman --help` output. The example health check commands are syntactically valid, but the referenced tools (`curl`, `pg_isready`, and `wget`) must be present inside the respective container images for the health checks to run successfully.
