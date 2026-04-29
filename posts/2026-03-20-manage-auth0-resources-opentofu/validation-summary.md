# Validation Summary: How to Manage Auth0 Resources with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Auth0 Terraform/OpenTofu provider (`auth0/auth0`)
- Auth0 applications (`auth0_client`)
- Auth0 APIs/resource servers (`auth0_resource_server`, `auth0_resource_server_scopes`, `auth0_client_grant`)
- Auth0 connections (`auth0_connection`, `auth0_connection_clients`)
- Auth0 Actions (`auth0_action`, `auth0_trigger_action`)

## Sources Consulted
- OpenTofu Settings: https://opentofu.org/docs/language/settings/
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- Auth0 provider docs index: https://registry.terraform.io/providers/auth0/auth0/latest/docs
- Auth0 provider quickstart: https://registry.terraform.io/providers/auth0/auth0/latest/docs/guides/quickstart
- `auth0_client`: https://registry.terraform.io/providers/auth0/auth0/latest/docs/resources/client
- `auth0_resource_server`: https://registry.terraform.io/providers/auth0/auth0/latest/docs/resources/resource_server
- `auth0_resource_server_scopes`: https://registry.terraform.io/providers/auth0/auth0/latest/docs/resources/resource_server_scopes
- `auth0_client_grant`: https://registry.terraform.io/providers/auth0/auth0/latest/docs/resources/client_grant
- `auth0_connection`: https://registry.terraform.io/providers/auth0/auth0/latest/docs/resources/connection
- `auth0_connection_clients`: https://registry.terraform.io/providers/auth0/auth0/latest/docs/resources/connection_clients
- `auth0_action`: https://registry.terraform.io/providers/auth0/auth0/latest/docs/resources/action
- `auth0_trigger_action`: https://registry.terraform.io/providers/auth0/auth0/latest/docs/resources/trigger_action
- Auth0 Rules lifecycle status: https://auth0.com/docs/rules

## Issues Found
- The SPA example used outdated `auth0_client` argument names: `allowed_callback_urls`, `allowed_web_origins`, and `allowed_origins_cors`. These were corrected to `callbacks`, `web_origins`, and `allowed_origins` to match the current provider schema.
- The API example defined `scopes {}` inline on `auth0_resource_server`, but in provider `1.x` scopes are managed through `auth0_resource_server_scope` or `auth0_resource_server_scopes`. The post was updated to use `auth0_resource_server_scopes`, and the scope field names were corrected from `value` to `name`.
- After moving API scopes to a separate resource, the client grant example needed explicit ordering to ensure the scopes exist before the grant is created. A `depends_on = [auth0_resource_server_scopes.api_scopes]` was added to the `auth0_client_grant` example.
- The social connection example enabled the connection for `auth0_client.spa.client_id`, but `auth0_connection_clients.enabled_clients` expects Auth0 client resource IDs. This was corrected to `auth0_client.spa.id`.
- The Actions example created an `auth0_action` but did not bind it to the `post-login` flow, so it would not run as described. An `auth0_trigger_action` binding was added.
- The description and conclusion referenced Rules alongside Actions. Since the post does not manage Rules and Rules are legacy in Auth0, those references were narrowed to Actions to keep the guidance current and accurate.

## Review Notes
- The post is code-focused and technically relevant after the fixes above.
- Using a `terraform {}` block is correct in OpenTofu; OpenTofu continues to use the `terraform` block for provider requirements in `1.x`.
- The `node18` runtime shown for `auth0_action` is still supported by the current provider schema, so it was left in place. Auth0 currently recommends Node 22 for new extensibility code, but the example is not invalid as written.
- A local `tofu validate` run was not possible in this workspace because neither `tofu` nor `terraform` is installed.
