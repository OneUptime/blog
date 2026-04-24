# Validation Summary: How to Set Up a Staging Environment with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker CLI
- PostgreSQL
- GitHub Actions
- Cypress
- k6

## Sources Consulted
- Portainer stack deployment and environment variable documentation: https://docs.portainer.io/user/docker/stacks/add
- Portainer stack webhook documentation: https://docs.portainer.io/user/docker/stacks/webhooks
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose top-level `version` element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker `container exec` reference: https://docs.docker.com/reference/cli/docker/container/exec/
- Docker `container ls` / `docker ps` filter reference: https://docs.docker.com/reference/cli/docker/container/ls
- Docker `image prune` reference: https://docs.docker.com/reference/cli/docker/image/prune/
- PostgreSQL `pg_dump` reference: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL `psql` reference: https://www.postgresql.org/docs/current/app-psql.html

## Issues Found
- The Compose example hardcoded environment-specific values while the text said Portainer stack environment variables could change those values without editing the Compose file. I changed the example to use `${...}` placeholders with defaults so it matches Portainer's documented variable-substitution workflow.
- The Compose example used the top-level `version: "3.8"` field. Docker's current Compose documentation marks the `version` field as obsolete, so I removed it.
- The sanitization command replaced matched emails with `'user@example.com'`, which would add extra quotes inside SQL string literals and could break a plain SQL dump. I changed the replacement text to `user@example.com`.
- The staging refresh example used a plain `pg_dump` into an existing staging database, which can fail on repeated runs because objects already exist. I added `--clean --if-exists` so the restore can replace existing objects in the target database.
- The CI deployment section implied stack webhooks were generally available. Portainer documents stack webhooks as Business Edition-only and limited to non-Edge environments, so I added that qualification.
- The production-promotion sentence said production was redeployed with the same tag used in staging, but the example actually retagged the validated staging image as `production`. I corrected the wording to match the command sequence and made the webhook `curl` fail fast like the staging example.
- The production-promotion example assumed the staging image already existed locally. I added an explicit `docker pull` so the retagging flow works on a fresh CI runner.
- The cleanup example claimed to remove staging images older than 7 days, but the command did not filter by age at all. I replaced it with Docker's documented age-based prune command using `--filter "until=168h"`.

## Review Notes
- The `sed`-based anonymization step is still a simplistic example. For real production data, application-aware anonymization is safer than broad regex replacement against a SQL dump.
- The webhook examples are accurate for Portainer Business Edition on non-Edge environments, but readers using Portainer CE or Edge environments will need a different deployment trigger.
- Retagging a validated image is technically sound, but immutable image tags or digests provide a stronger promotion trail than mutable tags like `staging` and `production`.
