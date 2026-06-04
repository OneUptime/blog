# Validation Summary: How to Use Docker Compose extra_hosts Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Compose file `extra_hosts`
- Docker container networking
- `/etc/hosts` host resolution
- Docker CLI

## Sources Consulted
- Docker Compose file reference, services / `extra_hosts`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose networking how-to, custom DNS with `extra_hosts` and `host-gateway`: https://docs.docker.com/compose/how-tos/networking/
- Docker Compose environment variable interpolation and `--env-file`: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker Compose file reference, version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker CLI reference, `docker container run` / `--add-host`: https://docs.docker.com/reference/cli/docker/container/run/
- Docker daemon reference, `host-gateway` behavior: https://docs.docker.com/reference/cli/dockerd/
- Local Docker CLI help for `docker compose`, `docker compose up`, and `docker inspect`.

## Issues Found
- The Compose examples used the obsolete top-level `version: "3.8"` field. Docker's current Compose specification keeps this field only for backward compatibility and warns that it is obsolete, so I removed it from the snippets.
- The mock external-services example said the setup "intercepts" calls and requires no application changes. Name resolution can route those hostnames to a mock server, but HTTPS services still require trusted test certificates or an appropriate test TLS setup, so I corrected the wording.
- The "Accessing Services on Other Docker Networks" section implied `extra_hosts` can work around separate Docker network isolation. `extra_hosts` only adds host-to-IP resolution; the target IP must already be reachable. I changed the section to describe naming reachable services by IP and added that connectivity caveat.

## Review Notes
The post is technically relevant and the remaining `extra_hosts`, mapping syntax, IPv6 example, `host-gateway`, environment interpolation, `--env-file`, `docker exec`, `getent`, and `docker inspect -f` examples align with Docker documentation and local CLI help.
