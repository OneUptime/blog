# Validation Summary: How to Create a Secret in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman secrets
- Container runtime secret mounts
- PostgreSQL container configuration

## Sources Consulted
- Podman official documentation: `podman secret create` - https://docs.podman.io/en/latest/markdown/podman-secret-create.1.html
- Podman official documentation: `podman create --secret` / `podman run --secret` option - https://docs.podman.io/en/latest/markdown/podman-create.1.html#secret-secret-opt-opt
- Podman official documentation: `podman secret inspect` - https://docs.podman.io/en/stable/markdown/podman-secret-inspect.1.html
- Podman official documentation: `podman secret ls` - https://docs.podman.io/en/v5.0.3/markdown/podman-secret-ls.1.html
- Docker Official Image documentation for Postgres, maintained by docker-library - https://github.com/docker-library/docs/blob/master/postgres/README.md

## Issues Found
- The introduction said Podman secrets avoid exposing sensitive data in environment variables. Podman secrets can be exposed as environment variables with `--secret type=env`; the default mount mode avoids environment variables. Updated the wording to apply that claim to mounted secrets.
- The `podman secret inspect` section said the secret value is never displayed. Current Podman supports `podman secret inspect --showsecret`, which can display the secret value. Updated the statement to say the value is not displayed unless `--showsecret` is explicitly used.
- The summary said secrets are delivered to containers as files under `/run/secrets/` as an absolute statement. Podman can also expose secrets as environment variables. Updated the wording to say secrets can be delivered as files under `/run/secrets/`.

## Review Notes
Podman was not installed in the review environment, so CLI behavior was checked against the official Podman documentation rather than local `--help` output. The command syntax for creating secrets from standard input, listing secrets, inspecting secret metadata, and mounting a secret into a container is consistent with the official documentation.
