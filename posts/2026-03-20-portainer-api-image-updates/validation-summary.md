# Validation Summary: How to Automate Image Updates via Portainer API - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer REST API
- Portainer webhooks
- Docker
- Python
- Bash
- GitHub Actions

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer stack webhook documentation: https://docs.portainer.io/sts/user/docker/stacks/webhooks
- Portainer container webhook documentation: https://docs.portainer.io/user/docker/containers/webhooks
- Portainer stack editing documentation: https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer source for stack update behavior: https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/stacks/stack_update.go
- Portainer source for stack file retrieval: https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/stacks/stack_file.go
- Portainer source for Git-based stack redeploys: https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/stacks/stack_update_git_redeploy.go
- Portainer source for stack routes and webhook route registration: https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/stacks/handler.go
- Portainer source for stack list filters: https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/stacks/stack_list.go
- Portainer source for stack and environment-variable JSON fields: https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/portainer.go

## Issues Found
- The original single-container example deleted and recreated a container through proxied Docker endpoints with only partial configuration (`Image`, `Env`, and `HostConfig`). That would not reliably preserve the full container definition. I replaced it with Portainer's documented container webhook flow, which is the supported automation path for single-container redeploys.
- The original stack-update script treated all stacks as editable through `/api/stacks/{id}`. Portainer only supports that update flow for file-based stacks; Git-deployed stacks must be updated through Git/GitOps or the Git redeploy endpoint. I narrowed the example to file-based stacks and added an explicit Git-stack guard.
- The original stack-update script rewrote `image:` lines with a regex that would break on common valid image references such as registries with ports. I replaced that with an environment-variable-based update flow, which aligns with Portainer's stack environment variable model and avoids brittle Compose parsing.
- The original stack-update script hardcoded `PORTAINER_URL` and `API_KEY`, while the GitHub Actions snippet provided them as environment variables. I changed the script to read `PORTAINER_URL`, `PORTAINER_API_KEY`, and `PORTAINER_ENDPOINT_ID` from the environment so the CI example matches the implementation.
- The original webhook section used `/api/webhooks/...` for stack redeploys. Portainer documents stack webhooks at `/api/stacks/webhooks/{webhookID}` and container webhooks at `/api/webhooks/{webhookID}`. I corrected the stack endpoint and added the documented `tag` and `pullimage=false` examples.
- The original post implied webhook availability without edition/scope caveats. I corrected the text to reflect Portainer's documentation: container and stack webhooks are Business Edition features and are only available on non-Edge environments.

## Review Notes
- The file-based stack example now assumes image tags are parameterized via Portainer stack environment variables, for example `image: ghcr.io/example/api:${API_TAG}`. This is the safest automation pattern for editable Portainer-managed stack files.
- For Git-deployed stacks, keeping the Compose file in the repository remains the correct source-of-truth workflow. Portainer's own documentation recommends editing the repository or using the Git redeploy flow rather than overwriting the stored stack file.
