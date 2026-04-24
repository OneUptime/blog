# Validation Summary: How to Set Up Multi-Environment Policies in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- Portainer environment groups and access control
- Portainer RBAC roles
- Portainer Agent environments
- Bash
- `curl`
- Python 3

## Sources Consulted
- Portainer docs: Groups - https://docs.portainer.io/admin/environments/groups
- Portainer docs: Policies - https://docs.portainer.io/admin/environments/policies
- Portainer docs: Add an environment via the Portainer API - https://docs.portainer.io/admin/environments/add/api
- Portainer docs: Install Portainer Agent on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer docs: Roles - https://docs.portainer.io/sts/admin/user/roles
- Portainer docs: Docker roles and permissions - https://docs.portainer.io/advanced/docker-roles-and-permissions
- Portainer API spec, CE 2.39.1 - https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer API spec, BE 2.39.1 - https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer source: endpoint group create handler - https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/endpointgroups/endpointgroup_create.go
- Portainer source: endpoint group update handler - https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/endpointgroups/endpointgroup_update.go
- Portainer source: endpoint create handler - https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/endpoints/endpoint_create.go
- Portainer source: endpoint update handler - https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/endpoints/endpoint_update.go
- Portainer source: built-in role IDs - https://github.com/portainer/portainer/blob/2.39.1/app/portainer/rbac/models/role.js

## Issues Found
- The original group-creation example sent `TeamAccessPolicies` in `POST /api/endpoint_groups`. Portainer's create payload does not accept access policies there; those are applied on update. I changed the example to create the groups first, then apply group access with `PUT /api/endpoint_groups/{id}`.
- The original role mapping was incorrect. The post treated `RoleId:2` as Standard user and `RoleId:1` as Helpdesk, but Portainer's built-in role definitions use `2 = Helpdesk` and `3 = Standard user`. I corrected the role IDs and added a note that non-default RBAC roles require Portainer Business Edition.
- The original scripted per-environment update used `PUT /api/endpoints/{id}/teamaccesspolicies`, which is not present in the published Portainer API spec. I corrected the example to use `PUT /api/endpoints/{id}` with `TeamAccessPolicies` in the JSON body.
- The original environment-creation example posted JSON with lowercase fields to `/api/endpoints`. Portainer's environment creation endpoint expects `multipart/form-data` and capitalized field names such as `Name`, `EndpointCreationType`, `URL`, and `GroupID`. I rewrote the example to match the documented API.
- The original group-assignment call used `POST /api/endpoint_groups/{group_id}/endpoints/{ENDPOINT_ID}`. The Portainer API defines the add-to-group operation as `PUT`, and environment creation already supports `GroupID`, so I simplified the example to assign the group during creation.
- The original agent URL examples used `tcp://...:9001`. Portainer's agent setup docs instruct using the host and port without a protocol for Agent environments, so I updated the examples to `host:9001`.
- Strategy 3 referenced `TOKEN` and `PORTAINER_URL` without defining them. I added those variables so the script is self-contained.
- The original intro implied groups and tags both directly apply policies. I corrected that wording so groups handle inherited access while tags are used for organization and automation targeting.

## Review Notes
- The post is technically accurate after correction.
- Portainer's Fleet Governance Policies feature is separate from environment-group access. Per the current docs, it is a Business Edition feature and applies to Edge (Standard) Agent environments running 2.37.0 or later.
- The post uses JWT authentication via `/api/auth`, which remains supported in Portainer's API examples. Portainer also documents per-user API access tokens for API use.
