# Validation Summary: How to Set Up Per-Group Access Control in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Portainer API
- Environment groups / access control
- RBAC
- Bash
- `curl`
- JSON
- Python 3

## Sources Consulted
- Portainer docs, Groups: https://docs.portainer.io/admin/environments/groups
- Portainer docs, API documentation: https://docs.portainer.io/api/docs
- Portainer docs, API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer docs, Add an environment via the Portainer API: https://docs.portainer.io/admin/environments/add/api
- Portainer docs, Roles: https://docs.portainer.io/sts/admin/user/roles
- Portainer CE OpenAPI 2.39.1: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer EE OpenAPI 2.39.1: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer source, auth handler: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/auth/authenticate.go
- Portainer source, endpoint group update handler: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/endpointgroups/endpointgroup_update.go
- Portainer source, endpoint-group add-endpoint handler: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/endpointgroups/endpointgroup_endpoint_add.go
- Portainer source, role migration defaults: https://github.com/portainer/portainer/blob/2.39.1/api/datastore/migrator/migrate_dbversion20.go

## Issues Found
- The UI navigation steps were outdated. The post said to go to **Environments** and use a **Groups** tab, but current Portainer docs use **Environment-related** -> **Groups**. I updated the steps to match the documented UI.
- The API examples used non-canonical request-body field names such as `username`, `password`, `name`, `description`, and `associatedEndpoints`. I updated them to the documented/request-struct field names used by Portainer: `Username`, `Password`, `Name`, `Description`, and `AssociatedEndpoints`.
- The group-membership API example used an incorrect endpoint: `/api/endpoints/{ENDPOINT_ID}/associateresources`. I replaced it with the supported endpoint-group association call: `PUT /api/endpoint_groups/{GROUP_ID}/endpoints/{ENDPOINT_ID}`.
- The inheritance explanation was inaccurate. The post claimed individual environment policies only add to group policies and that the most permissive role wins. I corrected this to reflect Portainer's documented and implemented behavior: group access is inherited, and a direct environment assignment for the same subject takes precedence and is shown as `override` in the UI.
- The role examples mixed Business Edition RBAC roles and incorrect built-in role IDs. I clarified that `Standard User` and `Helpdesk` examples require Portainer Business Edition and corrected the built-in `RoleId` values used in the examples to `3` and `2`.

## Review Notes
- Portainer Community Edition supports basic user and team assignment at the group level, but granular RBAC roles such as `Helpdesk` and `Standard User` are a Business Edition feature.
- Portainer's published EE OpenAPI file for `/api/auth` appears inconsistent with the official docs and source handler. The post was aligned to the documented examples and handler implementation.
- Portainer also notes that if a group's access is controlled by a policy, direct access changes at the group level are not available because policy access takes precedence.
