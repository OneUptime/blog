# Validation Summary: How to Configure Standard User Permissions in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer API
- Docker
- Docker Swarm
- RBAC
- Access control
- Container registries

## Sources Consulted
- Portainer Docs: Docker roles and permissions — https://docs.portainer.io/advanced/docker-roles-and-permissions
- Portainer Docs: Access control — https://docs.portainer.io/advanced/access-control
- Portainer Docs: Roles — https://docs.portainer.io/sts/admin/user/roles
- Portainer Docs: Environments / Manage access — https://docs.portainer.io/admin/environments/environments
- Portainer Docs: Docker Standalone setup — https://docs.portainer.io/user/docker/host/setup?fallback=true
- Portainer Docs: Docker Standalone registries — https://docs.portainer.io/user/docker/host/registries
- Portainer Docs: Docker Swarm registries — https://docs.portainer.io/user/docker/swarm/registries
- Portainer Docs: API documentation landing page — https://docs.portainer.io/api/docs
- Portainer source: endpoint update handler — https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_update.go
- Portainer source: RBAC role IDs — https://github.com/portainer/portainer/blob/develop/app/portainer/rbac/models/role.js
- Portainer source: Docker endpoint proxy description — https://github.com/portainer/portainer/blob/develop/api/api-description.md
- Portainer source: access-control label parsing — https://github.com/portainer/portainer/blob/develop/api/uac/generic_rc_getter.go

## Issues Found
- The introduction overstated Standard User scope as full control within assigned environments. I corrected it to assigned resources within accessible environments to match Portainer's current Standard User role definition and resource-access rules.
- The capabilities list said Standard Users could remove images. I corrected this to adding and removing image tags, which matches the current Docker roles matrix.
- The volume section implied Standard Users could always manage volumes. I added the documented caveat that volume management depends on the `Enable volume management for non-administrators` setting.
- The environment-access API examples used outdated `.../teamaccesspolicies` and `.../useraccesspolicies` endpoints and the wrong role ID. I updated them to `PUT /api/endpoints/{id}` with `TeamAccessPolicies` and `UserAccessPolicies`, and corrected Standard User to `RoleId: 3`.
- The restricted-resource explanation incorrectly said only the owner and admins can manage restricted resources. I corrected this to include explicitly granted users and teams.
- The access-control label example was technically incorrect in two ways: it used a numeric user ID instead of a username, and it set `io.portainer.accesscontrol.public` to `"false"`. Portainer treats the presence of that label as public access, so the example would have produced the opposite of the intended restriction. I replaced it with a valid restricted-access label example using a username.
- The Docker feature controls section used outdated UI navigation and outdated setting names. I updated it to the current `Host` or `Swarm` `Setup` path and current non-admin security toggle names from the docs.
- The registries section described an outdated flow. I corrected it to reflect that custom registries are added globally and access is then granted per environment via the environment's Registries view.
- The "cannot manage registries" wording was too broad given current registry access behavior. I narrowed it to "cannot add or configure registries themselves."

## Review Notes
- The post now matches the current Portainer documentation and current Portainer source for the API and access-control details that were ambiguous in the public docs alone.
- Portainer's finer-grained RBAC roles are documented under Business Edition. Readers using Community Edition should be aware that per-environment role refinement differs from the basic admin versus non-admin model.
