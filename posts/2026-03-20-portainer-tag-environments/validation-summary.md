# Validation Summary: How to Tag Environments in Portainer for Better Organization

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer API
- Portainer environment tags
- Portainer Edge Groups
- Bash
- `curl`
- Python 3

## Sources Consulted
- Portainer Docs: Tags - https://docs.portainer.io/admin/environments/tags
- Portainer Docs: Environments - https://docs.portainer.io/admin/environments/environments
- Portainer Docs: Add an environment via the Portainer API - https://docs.portainer.io/admin/environments/add/api
- Portainer Docs: API usage examples - https://docs.portainer.io/api/examples
- Portainer Docs: Edge Compute - https://docs.portainer.io/user/edge
- Portainer Docs: Edge Groups - https://docs.portainer.io/user/edge/groups
- Portainer API Documentation hub - https://docs.portainer.io/api/docs
- Portainer CE OpenAPI schema 2.39.1 - https://api-docs.portainer.io/versions/ce/2.39.1.yaml

## Issues Found
- The introduction described Portainer tags as key-value labels. Portainer's documentation and API model tags as simple named labels, so I corrected that description.
- The post described groups as hierarchical. Portainer environment groups are collections, not a documented hierarchy, so I removed that claim in the introduction and conclusion.
- The Web UI navigation for tags was wrong. Current docs place tags under **Environment-related** → **Tags**, and the UI action is **Create tag**.
- The authentication example used lowercase JSON keys (`username` and `password`). Portainer's current API documentation defines the request body with `Username` and `Password`, so I updated the example.
- The tag creation example used a lowercase `name` field. The current Portainer API schema requires `Name`, so I fixed the payload.
- The environment update examples used `TagIds` in the request body. The current OpenAPI schema for update payloads uses `TagIDs`, so I corrected the request bodies while leaving the response example on `TagIds`, which matches the environment response schema.
- The post hard-coded tag IDs and mapped them to names as though the IDs were predictable. That is unsafe because tag IDs come from Portainer's database, so I changed the examples to resolve tag IDs from `/api/tags` before updating environments or creating edge groups.
- The dynamic Edge Group payloads used lowercase keys (`name`, `dynamic`, `tagIds`). The current API schema uses `Name`, `Dynamic`, and `TagIDs`, and also exposes `PartialMatch` for full-vs-partial tag matching. I updated the examples accordingly.
- The dynamic Edge Group section referred to generic environments. Portainer's Edge Groups operate on Edge environments and require Edge Compute features to be enabled, so I corrected that scope and caveat.

## Review Notes
- The current Portainer docs still document JWT-based authentication with `Authorization: Bearer ...`, which is why the post keeps that approach. Portainer also supports API-key authentication via `X-API-Key`.
- Portainer's current API schema uses `TagIDs` in several request payloads but `TagIds` in the environment response object. The revised examples now reflect that documented inconsistency.
- The shell snippets were syntax-checked locally with `bash -n`. They were not executed against a live Portainer instance in this workspace.
