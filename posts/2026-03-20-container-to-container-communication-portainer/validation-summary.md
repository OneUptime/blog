# Validation Summary: How to Set Up Container-to-Container Communication in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose (V2)
- Docker Networks (bridge driver)
- DNS-based service discovery
- Traefik (referenced)
- Kong (referenced)
- PostgreSQL, Redis, Nginx (referenced as example services)
- Linux networking utilities (`nslookup`, `nc`, `curl`, `ip`, `jq`)

## Sources Consulted
- Docker Compose Specification — https://compose-spec.io/
- Docker Compose file reference — https://docs.docker.com/compose/compose-file/
- Docker Compose `networks` top-level element — https://docs.docker.com/compose/compose-file/06-networks/
- Docker Compose service `networks` (aliases) — https://docs.docker.com/compose/compose-file/05-services/#networks
- Docker Compose migrate from V1 to V2 — https://docs.docker.com/compose/migrate/
- Docker Compose project name & version — https://docs.docker.com/compose/compose-file/04-version-and-name/
- Docker network drivers (bridge, internal) — https://docs.docker.com/network/drivers/bridge/
- Docker `links` (legacy) — https://docs.docker.com/network/links/
- Portainer stacks documentation — https://docs.portainer.io/user/docker/stacks

## Issues Found
- **Outdated Compose V1 container naming:** The post used the legacy Compose V1 underscore naming convention (`myapp_api_1`, `infrastructure-stack_redis_1`). Docker Compose V2 (current, since 2021) uses hyphens as separators: `<project>-<service>-<index>`. Updated both occurrences to the modern V2 format (`myapp-api-1`, `infrastructure-stack-redis-1`) and adjusted the explanatory comment from "stack_service naming convention" to "project-service-index naming convention" so it matches the current behavior.

## Review Notes
- The top-level `version: "3.8"` declaration in every compose example is now considered informative-only by the Compose Specification and emits a warning with current Docker Compose versions. It was left in place because it does not break functionality and removing it would be a stylistic change beyond the scope of a technical correctness review. Future revisions may want to drop the `version` key entirely in line with the Compose Spec.
- The `internal: false` annotation on the `app_tier` network in Step 7 is the default and is shown only for illustrative contrast with `internal: true`; this is correct and intentional.
- The `links` example in Step 5 is correctly flagged as legacy. Modern Docker networking (custom bridge networks with embedded DNS) supersedes `links`, and the post's "Modern equivalent" using `aliases` is accurate.
- The `internal: true` claim — that containers on such a network cannot make outbound internet connections — is correct: internal networks have no NAT/gateway to the host's external interfaces.
- All shell commands (`nslookup`, `nc -zv`, `curl -v`, `ip addr`, `ip route`, `cat /etc/resolv.conf`, `docker inspect ... | jq ...`) are syntactically correct.
- The `external: true` syntax with a corresponding `name:` to reference a pre-existing network (Step 2) matches the current Compose Spec.
