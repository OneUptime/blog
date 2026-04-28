# Validation Summary: How to Deploy Multi-Stage Applications with Portainer Stacks - Apps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (CE / BE)
- Docker Compose (Compose Specification)
- Docker / Docker Swarm
- YAML anchors and merge keys
- PostgreSQL 15
- Redis 7
- NFS / tmpfs volume drivers

## Sources Consulted
- Docker Compose specification — extension fields (`x-*`): https://docs.docker.com/reference/compose-file/extension/
- Docker Compose specification — services (healthcheck, deploy.resources, depends_on conditions): https://docs.docker.com/reference/compose-file/services/
- Docker Compose specification — profiles: https://docs.docker.com/compose/how-tos/profiles/
- Docker Compose specification — volumes (driver, driver_opts for nfs/tmpfs): https://docs.docker.com/reference/compose-file/volumes/
- Docker Compose specification — networks (bridge driver, `internal`): https://docs.docker.com/reference/compose-file/networks/
- YAML 1.1 merge key type: https://yaml.org/type/merge.html
- `docker compose config` CLI reference: https://docs.docker.com/reference/cli/docker/compose/config/
- Portainer Stacks documentation: https://docs.portainer.io/user/docker/stacks
- PostgreSQL `pg_isready` reference: https://www.postgresql.org/docs/15/app-pg-isready.html

## Issues Found
- **Incorrect YAML anchor structure for `x-common-healthcheck`.** The original anchor wrapped the shared fields under a `healthcheck:` key:

  ```yaml
  x-common-healthcheck: &common-healthcheck
    healthcheck:
      interval: 30s
      ...
  ```

  When merged via `<<: *common-healthcheck` inside an existing `healthcheck:` block, the YAML 1.1 merge key inserts the anchor's top-level keys into the current mapping. With the wrapper, this produces a nested `healthcheck.healthcheck.interval`, which is invalid for Docker Compose. Verified empirically with PyYAML, which implements the merge-key spec. Fixed by removing the `healthcheck:` wrapper so the anchor contains the fields directly — matching the pattern used for `x-common-env` (which was already correct). The `x-common-resources` anchor was correct as written because it is merged at the *service* level (where `deploy:` is the intended child key), not inside an existing `deploy:` block.

## Review Notes
- The top-level `version: "3.8"` field is obsolete in the current Compose Specification and is ignored by Docker Compose v2 (it produces a warning). It is not wrong and the file still parses, so it was left in place per the "only fix technical errors" instruction.
- `deploy.resources.limits` historically applied only under Swarm, but Docker Compose v2 (standalone) honors `deploy.resources` limits as well, so the `x-common-resources` pattern is valid for plain Compose deployments today.
- `networks.backend-net.internal: false` is redundant (false is the default) but not incorrect.
- The "rolling update" wording in the Updating Stacks section is accurate for Swarm-mode stacks; for standalone Compose deployments, Portainer recreates the affected containers rather than performing a true rolling update. Consider clarifying in a future revision.
- The tmpfs volume defined via `driver: local` with `driver_opts.type: tmpfs` is valid; service-level `tmpfs:` short syntax is more idiomatic for ephemeral container scratch space, but both are correct.
