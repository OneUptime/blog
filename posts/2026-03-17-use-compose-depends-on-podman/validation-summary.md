# Validation Summary: How to Use Compose Depends-On with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- podman-compose
- Compose Specification
- Compose `depends_on`
- Container health checks
- PostgreSQL
- Redis

## Sources Consulted
- Compose Specification: `depends_on` short and long syntax, including `service_started`, `service_healthy`, and `service_completed_successfully`: https://compose-spec.github.io/compose-spec/spec.html#depends_on
- Compose Specification: `healthcheck` syntax and `CMD` / `CMD-SHELL` forms: https://compose-spec.github.io/compose-spec/spec.html#healthcheck
- Docker Docs: obsolete top-level `version` element in Compose files: https://docs.docker.com/reference/compose-file/version-and-name/
- Podman documentation: `podman compose` external provider behavior: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Podman documentation: `podman healthcheck run`: https://docs.podman.io/en/latest/markdown/podman-healthcheck-run.1.html
- podman-compose releases: condition handling in `depends_on` and `service_healthy` fixes: https://github.com/containers/podman-compose/releases

## Issues Found
- The Compose examples used the obsolete top-level `version: "3.8"` field. Current Compose documentation defines `version` only for backward compatibility and notes that it is obsolete, so I removed it from the examples.
- One command comment said "Podman waits" for dependency health checks. The Podman documentation states that `podman compose` delegates Compose behavior to an external provider, and the post uses `podman-compose`, so I changed the comment to say `podman-compose` waits.

## Review Notes
The `depends_on` condition examples match the Compose Specification. `service_healthy` depends on a valid health check on the dependency service, and `service_completed_successfully` is the correct condition for one-shot jobs. podman-compose added condition handling in the 1.3.x line and fixed `service_healthy` enforcement in later releases, so users on older podman-compose versions may need to upgrade.
