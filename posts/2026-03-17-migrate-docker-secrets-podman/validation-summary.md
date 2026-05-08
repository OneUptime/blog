# Validation Summary: How to Migrate Docker Secrets to Podman

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Docker Engine secrets
- Docker Swarm services
- Docker Compose secrets
- Podman secrets
- Podman Compose
- Bash scripting

## Sources Consulted
- Docker Docs: Manage sensitive data with Docker secrets - https://docs.docker.com/engine/swarm/secrets/
- Docker Docs: Secrets in Compose - https://docs.docker.com/compose/how-tos/use-secrets/
- Docker Docs: Compose file reference - https://docs.docker.com/compose/compose-file/
- Podman Docs: podman-secret - https://docs.podman.io/en/latest/markdown/podman-secret.1.html
- Podman Docs: podman-secret-create - https://docs.podman.io/en/v5.8.0/markdown/podman-secret-create.1.html
- Podman Docs: podman-run --secret option - https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman Docs: podman-compose wrapper - https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Local Docker CLI help: `docker secret create --help`, `docker run --help`, `docker service create --help`

## Issues Found
- The post implied Docker standalone containers could use `docker run --secret`. Docker Engine secrets are documented as available to Swarm services, not standalone containers, and local `docker run --help` does not list a `--secret` flag. I changed the wording to clarify that Podman's standalone `podman run --secret` support is not an identical Docker Engine `docker run` mapping.
- The Compose section stated that Docker Compose secrets syntax works with Podman Compose unconditionally. Podman's documentation says `podman compose` is a wrapper around an external Compose provider, so I changed the wording to say it can work depending on the configured provider.
- The storage comparison said Docker stores secrets in Swarm raft logs or a local daemon. Docker's official Swarm secrets documentation describes encrypted Swarm raft logs; Docker Compose secrets are read from Compose-defined sources and mounted into containers. I updated the storage notes accordingly.
- The Podman storage note said secrets are stored in user-local file storage. Podman's current documentation says storage is handled by the configured secret driver, with the default file driver using read-protected files. I updated the text to match that behavior.
- The migration script iterated over every glob result in the secrets directory, which could include directories or a literal unmatched glob. I added a file check before creating a Podman secret.

## Review Notes
The Compose example uses `version: "3.8"`, which modern Compose treats as legacy but still accepts. The post is now technically accurate, but future revisions could mention that Compose provider behavior should be tested in the target Podman environment.
