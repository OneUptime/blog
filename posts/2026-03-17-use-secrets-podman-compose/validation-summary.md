# Validation Summary: How to Use Secrets with Podman Compose

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Compose / podman-compose
- Docker Compose / Compose Specification
- Container secrets
- PostgreSQL
- Redis
- Nginx

## Sources Consulted
- Podman `podman compose` documentation: https://docs.podman.io/en/latest/markdown/podman-compose.1.html
- Podman `podman secret create` documentation: https://docs.podman.io/en/latest/markdown/podman-secret-create.1.html
- Podman `--secret` option documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Compose Specification service `secrets` syntax: https://compose-spec.github.io/compose-spec/05-services.html#secrets
- Docker Compose secrets documentation: https://docs.docker.com/compose/how-tos/use-secrets/
- Docker Compose top-level `secrets` reference: https://docs.docker.com/reference/compose-file/secrets/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post described Podman Compose support as direct and uniform. Updated the introduction and summary to reflect that `podman compose` runs an external Compose provider, so exact Compose feature support depends on the configured provider.
- The Compose examples used the obsolete top-level `version: "3.8"` key. Removed those lines to match the current Compose Specification, where `version` is only retained for backward compatibility.
- The "Secrets as Environment Variables" example used `type: env` under service-level Compose secrets. That is valid for Podman's direct `podman run --secret` option, but it is not part of the Compose service secret long syntax. Replaced the section with the supported `*_FILE` pattern, where environment variables point the application to secret files mounted under `/run/secrets/`.
- The Redis example used an unquoted command substitution when passing the secret to `redis-server --requirepass`. Quoted the substitution inside the shell command so secret values with spaces or shell-sensitive characters are handled more safely.

## Review Notes
The file-based secrets, external secret declarations, custom mount targets, `podman secret create ... -` commands, PostgreSQL `POSTGRES_PASSWORD_FILE` usage, and Compose service secret grants are consistent with the consulted documentation. The local environment did not have `podman` installed, so CLI behavior was verified against official Podman documentation rather than local `--help` output.
