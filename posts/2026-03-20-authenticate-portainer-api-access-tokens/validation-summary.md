# Validation Summary: How to Authenticate with the Portainer API Using Access Tokens

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Portainer HTTP API
- Portainer access tokens / API keys
- JWT authentication
- Bash
- `curl`
- `jq`
- GitHub Actions

## Sources Consulted
- Portainer API access documentation: https://docs.portainer.io/api/access.md
- Portainer API documentation landing page: https://docs.portainer.io/api/docs.md
- Portainer API usage examples: https://docs.portainer.io/api/examples.md
- Portainer account settings documentation: https://docs.portainer.io/user/account-settings.md
- Portainer stack webhook documentation: https://docs.portainer.io/user/docker/stacks/webhooks.md
- Portainer admin authentication settings: https://docs.portainer.io/admin/settings/authentication
- Portainer CE 2.39.2 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.2.yaml
- Portainer source: stack update handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/stacks/stack_update.go
- Portainer source: Portainer API key model: https://raw.githubusercontent.com/portainer/portainer/develop/api/portainer.go

## Issues Found
- The post said access tokens are used like JWTs in the `Authorization: Bearer` header. Portainer’s access-token docs explicitly require the `X-API-Key` header for access tokens, while `Authorization: Bearer` is for JWTs returned by `/api/auth`. Updated the explanation and all access-token examples accordingly.
- The comparison table said access tokens are created only in the UI, but the current API spec also documents `POST /users/{id}/tokens`. Updated the table row to reflect both documented creation paths.
- The Bash redeploy example would not work as written. The current stack update handler and published schema require `StackFileContent`, and the current field for forced image repull is `RepullImageAndRedeploy` (`PullImage` is deprecated). Updated the script to fetch the current stack file first, then send a valid `PUT /api/stacks/{id}` payload with the correct header and field names.
- The GitHub Actions example mixed webhook usage with access-token authentication and used the wrong auth header. Portainer stack webhooks are documented separately and do not use the access-token Bearer flow shown in the post. Replaced the example with an authenticated API call to `PUT /api/stacks/{id}/git/redeploy` using `X-API-Key`, which matches the section’s purpose.
- The API token creation example was incomplete. The published schema for `POST /users/{id}/tokens` requires a `description` and `password` request body. Updated the example payload to include both fields and clarified that the token is created for the calling user.

## Review Notes
- Portainer’s documentation currently has an inconsistency between the general API docs landing page and the OpenAPI description text: the landing page directs users toward access tokens, while the OpenAPI intro still describes JWT Bearer authentication. The per-feature docs and security schemes in the published 2.39.2 spec make clear that both JWT and API-key auth are supported, but access tokens should be sent with `X-API-Key`.
- The updated script example applies to file-based stacks. The GitHub Actions example uses the Git-based stack redeploy endpoint, which is a different documented workflow.
- Local checks: the updated Bash script snippets were syntax-checked with `bash -n`; the GitHub Actions YAML snippet was parsed with PyYAML; `validation.json` was validated with `jq`. Runtime validation against a live Portainer instance was not possible in this workspace.
