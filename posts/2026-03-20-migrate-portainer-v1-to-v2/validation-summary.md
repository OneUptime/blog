# Validation Summary: How to Migrate Portainer from Version 1.x to 2.x

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Portainer 1.x and 2.x (Community Edition)
- Docker (containers, volumes)
- Portainer Agent
- Portainer REST API
- BoltDB (Portainer's embedded data store)

## Sources Consulted
- Portainer official docs — Install Portainer Server on Docker (Linux): https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer official docs — Add Docker environment via agent: https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer 1.24 source (datastore): https://github.com/portainer/portainer/blob/1.24/api/bolt/datastore.go
- Portainer 1.24 source (defaults): https://github.com/portainer/portainer/blob/1.24/api/cli/defaults.go
- Portainer Agent v1.0.0 source (default port): https://github.com/portainer/agent/blob/1.0.0/agent.go
- Portainer 1.24 API handlers (endpoints/templates): https://github.com/portainer/portainer/tree/1.24/api/http/handler

## Issues Found

1. **Incorrect data-format claim.** The comparison table stated 1.x used SQLite and 2.x uses BoltDB. Portainer has used BoltDB (`portainer.db`) since the 1.x line — verified against the 1.24 source which imports `github.com/boltdb/bolt`. The 1.x→2.x migration friction is caused by BoltDB *schema* changes, not a database engine swap. Updated the row to read "BoltDB (1.x schema) | BoltDB (2.x schema)".

2. **Incorrect agent port claim.** The table stated the Portainer Agent port changed from 9000 in 1.x to 9001 in 2.x. The agent has used port 9001 since its very first release (verified in `portainer/agent` v1.0.0 source: `DefaultAgentPort = "9001"`). Port 9000 was the Portainer Server HTTP UI port, not the agent port. Replaced this row with a clearer "Default UI port" comparison: 9000 (HTTP) in 1.x → 9443 (HTTPS, since 2.9) in 2.x, which reflects the actual user-facing change and is consistent with the existing HTTPS-default row.

## Review Notes
- The HTTPS-on-9443 default was technically introduced in Portainer 2.9, not at the 2.0 release. The body of the post does not assert otherwise; the table now flags "since 2.9" for accuracy.
- The Server `docker run` command uses `portainer/portainer-ce:latest`. The official docs currently recommend `:sts` or `:lts` tags, but `:latest` exists on Docker Hub and is functional — left as written.
- The Agent `docker run` includes `-v /var/lib/docker/volumes:/var/lib/docker/volumes`. Current Portainer docs document this mount as optional (only needed for host-management features). It is harmless to include and matches older docs, so no change made.
- API paths `/api/endpoints` and `/api/templates` are valid 1.x paths (verified in the 1.24 handler source).
