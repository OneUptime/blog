# Validation Summary: How to Use Docker Compose Extends

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Compose
- Compose Specification
- YAML configuration
- Docker service configuration

## Sources Consulted
- Docker Docs: Extend your Compose file - https://docs.docker.com/compose/how-tos/multiple-compose-files/extends/
- Docker Docs: Compose file services reference, `extends` merge rules and restrictions - https://docs.docker.com/reference/compose-file/services/#extends
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Local Docker Compose CLI help: `docker compose config --help`

## Issues Found
- The basic `nginx:alpine` healthcheck used `curl` against `/health`, which is not available in the default image/configuration. Changed it to a root-page check using `wget` via `CMD-SHELL`.
- The same-file Compose example used the obsolete top-level `version` key. Removed it because current Compose treats `version` as informative only and warns that it is obsolete.
- The merge examples implied `ports` are replaced entirely. Corrected the section to describe scalar replacement and removed `ports` from the replacement example because Compose treats `ports` as a sequence that is merged.
- The article said `links`, `volumes_from`, `depends_on`, and `networks` are not inherited through `extends`. Current Compose can inherit those service attributes, but referenced resources are not imported automatically. Rewrote that section to explain the actual restriction and added required declarations.
- Environment-specific database examples extended a service using the named volume `db-data` but did not declare that volume in the extending Compose files. Added `volumes: db-data` to the dev and prod examples.
- The debugging section labeled `docker compose config --services` as showing a specific service. Updated the comment to clarify that it lists services and the following command inspects a service block.

## Review Notes
Verified corrected fragments with `docker compose config --quiet` using Docker Compose v5.1.3. `extends` is not supported by `docker stack deploy`, which is documented by Docker but not central to this tutorial.
