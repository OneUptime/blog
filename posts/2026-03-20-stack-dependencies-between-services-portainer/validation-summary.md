# Validation Summary: How to Set Up Stack Dependencies Between Services in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer stacks
- Docker Compose
- Docker Compose profiles
- Docker Compose `depends_on` conditions
- Docker Compose YAML anchors and extension fields
- PostgreSQL Docker Official Image

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `depends_on` service reference: https://docs.docker.com/reference/compose-file/services/#depends_on
- Docker Compose profiles documentation: https://docs.docker.com/compose/how-tos/profiles/
- Docker Compose extensions documentation: https://docs.docker.com/reference/compose-file/extension/
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker `stack deploy` reference: https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Swarm stack deployment documentation: https://docs.docker.com/engine/swarm/stack-deploy/
- Docker PostgreSQL guide: https://docs.docker.com/guides/postgresql/immediate-setup-and-data-persistence/
- Portainer stack creation documentation: https://docs.portainer.io/sts/user/docker/stacks/add

## Issues Found
1. **Overbroad Portainer compatibility claim.** The post claimed Portainer's stack editor supports the full Docker Compose specification. Portainer documents Compose-format stack input, while Docker documents that Swarm stack deployment uses legacy Compose file version 3 and is not compatible with the latest Compose Specification. Scoped the guidance to Docker Standalone Portainer stacks and added a Swarm caveat.
2. **Obsolete Compose `version` field.** The examples used `version: "3.8"`, but Docker Compose now treats the top-level `version` property as obsolete and only informative. Removed the `version` field from the Compose examples.
3. **Restart-order overstatement.** The description said `depends_on` ensures services start and restart in the correct order. Docker Compose dependency ordering covers creation/removal order and health/completion waits; restart propagation requires the long-form `restart: true` dependency option and only applies to explicit Compose operations. Updated the description to cover startup ordering only.
4. **Profile example used an unnecessary empty profile list.** The post said an always-started service has "no profile" but represented that as `profiles: []`. Docker's docs state services without a `profiles` attribute are always enabled. Removed the empty `profiles` attribute.
5. **PostgreSQL example omitted required configuration.** The official PostgreSQL image requires `POSTGRES_PASSWORD` unless using trust authentication. Added `POSTGRES_PASSWORD: example` so the database service can initialize.
6. **Health dependency pointed to a service without a healthcheck.** The nginx service used `condition: service_healthy` on `app`, but `app` had no healthcheck. Added an application healthcheck so the dependency condition has a health signal to wait for.
7. **Extension-field wording was too strong.** The post said `x-` fields are preserved but ignored. Docker's Compose documentation guarantees that Compose ignores `x-` fields; it does not require the wording "preserved" for this use case. Updated the comment to say they are ignored.

## Review Notes
- The corrected YAML snippets were parsed locally with PyYAML. Docker/Compose CLI binaries are not installed in this workspace, so `docker compose config` could not be run.
- The examples use placeholder application images (`myapp:1.2.3`, `myapi:1.2.3`), so the application-specific migration command and `/health` endpoint remain illustrative assumptions.
- The post now correctly distinguishes Docker Standalone Portainer stacks from Swarm stacks for current Compose-spec features.
