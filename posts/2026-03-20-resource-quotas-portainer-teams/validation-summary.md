# Validation Summary: How to Configure Per-Team Resource Quotas in Portainer - Teams

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer Business Edition
- Portainer API
- Portainer custom templates
- Docker Compose
- Docker Engine CLI
- Docker Swarm resource settings
- Linux cgroups v2
- PostgreSQL Docker image
- Bash monitoring scripts

## Sources Consulted
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker container stats CLI reference: https://docs.docker.com/reference/cli/docker/container/stats/
- Docker container run CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker PostgreSQL advanced configuration guide: https://docs.docker.com/guides/postgresql/advanced-configuration-and-initialization/
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer BE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/?edition=ee&version=2.39.1
- Portainer Docker/Swarm/Podman security policy documentation: https://docs.portainer.io/admin/environments/policies/docker-policies/security-policy
- Portainer custom templates documentation: https://docs.portainer.io/user/docker/templates/custom
- Linux kernel cgroup v2 documentation: https://docs.kernel.org/next/admin-guide/cgroup-v2.html

## Issues Found
- The post claimed Portainer Business Edition directly supports Docker environment-level/team resource quotas. Updated the introduction to clarify that Docker/Swarm CPU and memory enforcement comes from Docker or the Linux host, while Portainer provides access control, security policies, and templates.
- The description mentioned container count limits, but the article did not configure a supported per-team container count quota. Removed that claim.
- The Compose examples used the obsolete top-level `version` field. Removed it to align with the current Compose Specification.
- The PostgreSQL example used unsupported `POSTGRES_SHARED_BUFFERS` and omitted the required password for a fresh official `postgres` container. Replaced it with `POSTGRES_PASSWORD` and a `postgres -c shared_buffers=512MB` command.
- The monitoring examples filtered by `tenant` labels, but the initial Compose file did not set those labels. Added `tenant=alpha` labels to the sample services.
- The Portainer security-settings API example used the wrong endpoint and payload casing. Changed it to `PUT /api/endpoints/{id}/settings` with `securitySettings`, and switched API authentication to the documented `X-API-Key` header.
- The Portainer security-settings comments incorrectly said these settings prevent deployments without resource limits. Replaced that with accurate security-policy limitations and noted that CPU/memory limit validation requires templates, RBAC, or review workflows.
- The cgroups v2 example wrote to `/sys/fs/cgroup` without root-safe redirection and set `memory.swap.max` to 4GB while calling it "no swap." Updated the commands to use `sudo tee`, enable child controllers, and set `memory.swap.max` to `0`.
- The team stats script could accidentally show all containers when a label matched no containers. Reworked it to collect container IDs into arrays and handle empty teams explicitly.
- The alert script parsed `docker stats` output incorrectly because `MemUsage` contains spaces around `/`. Changed the format to a pipe-delimited output, parsed only the used-memory value, and added unit conversion for KiB/MiB/GiB/B.
- The template creation example used non-existent `POST /api/templates` behavior for creating templates. Replaced it with the current custom-template endpoint `POST /api/custom_templates/create/string`.
- The template example used Compose-style `${...}` variables where Portainer custom templates expect `{{ ... }}` variables, and used mutable CPU/memory variables while describing enforced limits. Updated the template to use Portainer variable syntax and fixed resource values.
- The conclusion overstated Portainer security policies as quota enforcement. Updated it to describe Docker/cgroup enforcement and Portainer templates/policies as standardization and risk-reduction controls.

## Review Notes
Docker was not installed in the review workspace, so CLI behavior could not be checked with local `docker --help`; Docker commands were validated against official Docker documentation instead. The cgroups example remains host- and cgroup-driver-dependent, especially on systemd-managed hosts, but the corrected file names and `memory.swap.max` semantics match the Linux cgroups v2 documentation.
