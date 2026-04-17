# Validation Summary: How to Use YAML Anchors and Aliases in Portainer Stacks - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Portainer (CE/BE)
- Docker Compose (Compose Specification / V2)
- YAML (anchors, aliases, merge keys)
- Docker Swarm deploy resources
- Docker networks (bridge, internal)
- Docker volumes (local driver, NFS, tmpfs)
- Docker Compose profiles
- PostgreSQL healthcheck (`pg_isready`)
- Redis healthcheck (`redis-cli ping`)

## Sources Consulted
- Docker Compose file reference / Compose Specification: https://docs.docker.com/reference/compose-file/
- Compose fragments (extension fields and anchors): https://docs.docker.com/reference/compose-file/fragments/
- Compose services top-level element: https://docs.docker.com/reference/compose-file/services/
- Compose healthcheck element: https://docs.docker.com/reference/compose-file/services/#healthcheck
- Compose deploy (resources): https://docs.docker.com/reference/compose-file/deploy/
- Compose profiles: https://docs.docker.com/compose/how-tos/profiles/
- Compose networks (internal): https://docs.docker.com/reference/compose-file/networks/
- Compose volumes (driver_opts, NFS, tmpfs): https://docs.docker.com/reference/compose-file/volumes/
- YAML 1.1 merge key spec: https://yaml.org/type/merge.html
- Portainer stack docs: https://docs.portainer.io/user/docker/stacks

## Issues Found
- **Incorrect nesting in `x-common-healthcheck` anchor**: The anchor was defined as a mapping with a `healthcheck:` key containing the healthcheck parameters. However, the anchor was then used via `<<: *common-healthcheck` *inside* a `healthcheck:` block of each service. With YAML merge keys, the top-level keys of the referenced mapping are merged into the target. As written, this would produce a nested `healthcheck.healthcheck` structure, which is invalid in Compose. I removed the redundant `healthcheck:` wrapper so the anchor now holds the parameters (`interval`, `timeout`, `retries`, `start_period`) directly at the top level. This is consistent with how `x-common-env` is defined and used elsewhere in the same example.

## Review Notes
- `version: "3.8"` at the top of the Compose file is obsolete under the modern Compose Specification; it is ignored by Docker Compose V2 but still tolerated. Left as-is because it is not incorrect in practice and many Portainer environments still show it.
- `internal: false` on `backend-net` is the default for bridge networks and thus redundant, but it is not wrong and serves as documentation. Left as-is.
- `deploy.resources.limits` is respected by Docker Compose V2 in non-Swarm mode; `reservations` are only enforced under Swarm, which is worth noting but not incorrect.
- Merge keys (`<<:`) are a YAML 1.1 feature. Docker Compose supports them for fragment reuse, as documented in the Compose fragments reference. Not all YAML parsers handle them identically, but Compose itself does.
- The post's Portainer "rolling update" wording is accurate for Swarm stacks; for standalone Compose stacks Portainer performs a recreate rather than a true rolling update, but this is a minor stylistic nuance.
