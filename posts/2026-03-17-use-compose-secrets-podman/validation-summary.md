# Validation Summary: How to Use Compose Secrets with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- podman-compose
- Compose secrets
- Container secrets
- PostgreSQL Docker Official Image
- YAML
- Python

## Sources Consulted
- Compose Specification service `secrets` syntax: https://compose-spec.github.io/compose-spec/05-services.html#secrets
- Docker Compose secrets documentation: https://docs.docker.com/compose/how-tos/use-secrets/
- Podman `podman compose` provider documentation: https://docs.podman.io/en/latest/markdown/podman-compose.1.html
- Podman `--secret` option documentation: https://docs.podman.io/en/latest/markdown/options/secret.html
- Podman `podman secret create` documentation: https://docs.podman.io/en/latest/markdown/podman-secret-create.1.html
- podman-compose source implementation for service secrets: https://github.com/containers/podman-compose/blob/main/podman_compose.py
- PostgreSQL Docker Official Image documentation for `_FILE` variables: https://hub.docker.com/_/postgres/

## Issues Found
- The custom permissions example used `uid`, `gid`, and `mode` with a file-based Compose secret. Current Compose documentation notes these attributes are not implemented by Docker Compose for file-backed secrets, and current `podman-compose` source warns and ignores them for file secrets because they are passed as read-only host file mounts. Changed the example to use an external Podman secret created with `podman secret create`, where Podman's runtime secret options can apply ownership and mode.
- The permissions example used `mode: 0400`. Updated it to the current Compose-style octal notation `0o400`.
- The post described environment variables as visible in process listings. Reworded this to "process environment" because the main risk is exposure through the process environment and logs, not necessarily standard process listing output.
- The summary said secrets are not visible in container inspect output. Clarified this to say secret values are not stored directly in container inspect output.

## Review Notes
The file-based secrets, short service syntax, long service syntax with custom targets, `POSTGRES_PASSWORD_FILE` usage, and Python file-reading example are consistent with the consulted documentation. The local environment did not have `podman` or `podman-compose` installed, so CLI behavior was verified against official documentation and the current `podman-compose` implementation rather than local `--help` output.
