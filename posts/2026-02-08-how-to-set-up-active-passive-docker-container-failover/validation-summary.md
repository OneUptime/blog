# Validation Summary: How to Set Up Active-Passive Docker Container Failover

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Engine and Docker CLI
- Docker Compose
- Keepalived
- VRRP
- Bash health check and notification scripts
- Redis container health checks

## Sources Consulted
- Keepalived man page: https://www.keepalived.org/manpage.html
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker inspect CLI reference: https://docs.docker.com/reference/cli/docker/inspect/
- Local Docker CLI help output for `docker compose ps` and `docker compose config`

## Issues Found
- The health check script inspected containers named `app` and `redis`, but Docker Compose normally creates generated container names. Changed the script to resolve container IDs with `docker compose ps -q` for each service before using `docker inspect`.
- The notification script stopped containers when a host became BACKUP. With the same health check tracked on both hosts, a stopped backup stack would fail health checks before takeover and could prevent failover because its effective priority would be reduced. Changed the script and setup instructions to keep the Compose stack running on both hosts so the backup can take over the VIP immediately.
- The Compose example used the obsolete top-level `version: "3.9"` field. Removed it because current Compose uses the Compose Specification schema regardless of the version field and warns when `version` is present.
- The Keepalived notify script comment omitted the priority argument passed to generic `notify` scripts. Added `$4=priority` and assigned it for completeness.

## Review Notes
The tutorial is technically valid after the fixes. The Redis service still uses host-local storage; the post's data synchronization section correctly warns that stateful data needs an external database, shared storage, or replication strategy for production failover.
