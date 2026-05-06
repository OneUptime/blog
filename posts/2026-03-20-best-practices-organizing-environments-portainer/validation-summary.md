# Validation Summary: Best Practices for Organizing Environments in Portainer - Organizing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer API
- Container environment management
- Docker environments
- Edge environments

## Sources Consulted
- Portainer documentation, Tags: https://docs.portainer.io/admin/environments/tags
- Portainer documentation, Groups: https://docs.portainer.io/admin/environments/groups
- Portainer documentation, Add an environment via the Portainer API: https://docs.portainer.io/admin/environments/add/api
- Portainer documentation, Roles: https://docs.portainer.io/admin/user/roles
- Portainer source, `endpoint_create.go`: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_create.go
- Portainer source, `tag_create.go`: https://github.com/portainer/portainer/blob/develop/api/http/handler/tags/tag_create.go

## Issues Found
- The tagging table described tags as `key=value` metadata. In Portainer, tags are named objects, so the examples were updated to use concrete tag names such as `env-prod` and `region-us-east`.
- The Portainer API example for creating an environment was incorrect. `POST /api/endpoints` currently expects `multipart/form-data` fields such as `Name`, `EndpointCreationType`, and `TagIds`, not a JSON body with a `tags` array. The example was corrected accordingly.
- The access-control example used the `Read-Only User` role without scoping it to Portainer Business Edition. The wording was updated to make that edition requirement explicit.
- The environment health monitoring intro referred to a naming convention making unhealthy environments obvious, but the actual mechanisms are Portainer's status indicators and tags. The sentence was corrected to match the product behavior.

## Review Notes
- Portainer documentation still uses the `/api/endpoints` API path even though the UI terminology was renamed from endpoints to environments in Portainer 2.10.
- The corrected environment-registration example assumes the tag IDs already exist and correspond to the tags created earlier in the snippet.
