# Validation Summary: How to Deploy Stacks via the Portainer API - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- Docker Compose
- Docker environments in Portainer
- Bash
- `curl`
- `jq`
- GitHub Actions-style CI/CD scripting

## Sources Consulted
- Portainer Documentation, Accessing the Portainer API: https://docs.portainer.io/api/access
- Portainer Documentation, API documentation index: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer source, stack creation handlers: https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/create_compose_stack.go
- Portainer source, stack update handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/stack_update.go
- Portainer source, stack delete handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/stack_delete.go
- Portainer source, stack start handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/stack_start.go
- Portainer source, stack stop handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/stack_stop.go
- Portainer source, official file-upload client implementation: https://github.com/portainer/portainer/blob/develop/app/portainer/services/fileUpload.js
- Portainer source, official standalone string-create client implementation: https://github.com/portainer/portainer/blob/develop/app/react/common/stacks/queries/useCreateStack/createStandaloneStackFromFileContent.ts
- Portainer source, official stack update client implementation: https://github.com/portainer/portainer/blob/develop/app/react/docker/stacks/useUpdateStack.ts
- Docker Docs, Compose version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post said a single bearer token header worked for both JWTs and API access tokens. I changed the examples to use an `AUTH_HEADER` variable and documented that API access tokens must be sent with `X-API-Key`, while JWTs use `Authorization: Bearer`.
- The file-upload example sent `EndpointId` as multipart form data. I removed that field because Portainer’s standalone file endpoint expects `endpointId` as a query parameter, not a form field.
- The stack filtering example passed raw JSON directly in the URL and treated the filter value as an integer. I changed it to use `curl -G --data-urlencode` with the documented `EndpointID` filter encoded as a string.
- The stack status note only listed `1` and `2`. I updated it to include the current `3 = deploying` and `4 = error` status values from Portainer’s stack status enum.
- The update example claimed to update the nginx image, but its replacement Compose content accidentally removed the `redis` service and volume. I restored the full stack definition so the example only changes the image version as described.
- The update example and CI script used `pullImage`, which Portainer now marks as deprecated in favor of `repullImageAndRedeploy`. I updated both payloads to the current field.
- The delete example piped the response to `jq`, but successful stack deletion returns HTTP `204 No Content`. I changed the example to report the HTTP status code instead.
- The CI script initialized `API_KEY` with `${PORTAINER_API_KEY}` under `set -u`, which would abort if the variable was unset before the username/password fallback ran. I changed it to `${PORTAINER_API_KEY:-}` and added explicit checks for `PORTAINER_USER` and `PORTAINER_PASS` when falling back to `/api/auth`.
- The CI script matched existing stacks by name only, which could target the wrong stack on another Portainer environment. I scoped the lookup to both stack name and `EndpointId`.
- The CI script used `curl -s`, which would still exit successfully on HTTP 4xx/5xx responses and could print false success messages in CI. I changed the script’s API calls to `curl -fsS`.
- The inline Compose snippets used the obsolete top-level `version` key. I removed it so the examples align with the current Compose specification and avoid modern Compose warnings.

## Review Notes
- Validated against the current Portainer CE 2.39.1 API docs and the official Portainer source.
- The post’s update examples now align with file or string managed Docker stacks. Git-managed stacks also have dedicated `/stacks/{id}/git` and `/stacks/{id}/git/redeploy` flows in the Portainer API.
