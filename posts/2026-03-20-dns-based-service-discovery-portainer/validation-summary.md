# Validation Summary: How to Set Up DNS-Based Service Discovery in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer stacks
- Docker Engine networking
- Docker Compose networking
- DNS-based service discovery
- PostgreSQL Docker Official Image
- Redis

## Sources Consulted
- Docker Engine networking overview: https://docs.docker.com/engine/network/
- Docker Compose networking: https://docs.docker.com/compose/how-tos/networking/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- PostgreSQL Docker Official Image docs: https://hub.docker.com/_/postgres/

## Issues Found
- The post said Docker DNS-based service discovery applied to any same-network setup and that every Docker network uses the embedded resolver at `127.0.0.11`. I corrected this to user-defined networks, because Docker documents the embedded resolver behavior for custom networks and not the default `bridge` network.
- The sample `curl` commands against PostgreSQL and Redis ports would not work as described because those services do not speak HTTP. I replaced them with protocol-appropriate examples using `psql`, `redis-cli`, and `curl` for the HTTP API example.
- The Compose example used the obsolete top-level `version` field. I removed it to align with the current Compose specification, which marks `version` as obsolete and informational only.
- The Postgres connection string targeted `mydb`, but the container configuration did not create that database. I added `POSTGRES_DB=mydb` so the example matches the advertised connection string.
- The cross-stack section showed two separate stack snippets inside one YAML block, which made the block invalid if copied directly. I split it into two YAML blocks so each stack example is syntactically correct.
- The blue/green alias section implied a zero-downtime alias swap without caveats. I changed the wording to a simpler cutover description and noted that the alias should not be assigned to both versions at the same time, matching Compose alias behavior.

## Review Notes
- The examples are accurate for Portainer-managed Docker Compose or Docker Standalone stacks. In Docker Swarm or multi-node scenarios, shared service networks are typically implemented with overlay networks rather than local bridge networks.
- Custom `dns` and `dns_search` settings are relevant for external name resolution. Internal service discovery on user-defined networks still depends on Docker's embedded DNS behavior.
