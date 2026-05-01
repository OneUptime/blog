# Validation Summary: How to Edit an Existing Stack in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Portainer API
- GitOps
- Webhooks

## Sources Consulted
- Portainer Docs: Inspect or edit a stack - https://docs.portainer.io/user/docker/stacks/edit
- Portainer Docs: Add a new stack - https://docs.portainer.io/user/docker/stacks/add
- Portainer Docs: Webhooks - https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer Docs: Accessing the Portainer API - https://docs.portainer.io/api/access
- Portainer Docs: API documentation - https://docs.portainer.io/api/docs
- Portainer FAQ: Environment Variable Management in Docker: .env vs. stack.env - https://docs.portainer.io/faqs/troubleshooting/environment-variable-management-in-docker-.env-vs.-stack.env
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Variable interpolation - https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Portainer source: stack create handler - https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/stacks/stack_create.go
- Portainer source: compose stack create handler - https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/stacks/create_compose_stack.go
- Portainer source: stack update handler - https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/stacks/stack_update.go
- Portainer source: stack file handler - https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/stacks/stack_file.go

## Issues Found
- The post described stack editing as if it started from **Stacks > Add stack**. I corrected this to Portainer's actual edit flow: file-based stacks are updated from the stack's Editor view, while Git-based stacks must be changed in the repository or detached from Git first.
- The Git repository section described initial deployment instead of editing an existing Git-backed stack. I changed it to the correct update flow: edit in Git, push, then use Pull and redeploy or GitOps updates.
- The API example used stack creation semantics for a post about editing an existing stack. I replaced it with the current update flow: fetch the existing stack file from `/api/stacks/{id}/file`, then `PUT` the updated payload to `/api/stacks/{id}?endpointId=...`.
- The Compose example used the top-level `version` field, which is obsolete in the current Compose specification. I removed it.
- The webhook note said Portainer redeploys with `--pull-always`. I corrected this to Portainer's documented behavior: stack webhooks redeploy the stack and pull the latest image for the current tag by default, and this feature is Portainer Business Edition only.
- The `stack.env` troubleshooting section incorrectly treated `stack.env` like Docker Compose's `.env` file. I corrected the distinction: `stack.env` is a Portainer-generated `env_file` pattern for Docker Standalone/Podman, while a real `.env` file is still needed for general Compose interpolation use cases.

## Review Notes
- Portainer's UI documentation has some wording overlap between Web editor, Upload, and file-based stack editing, but Portainer's current update API and stack-editing docs consistently show that Git-backed stacks are edited through Git or by detaching from Git first.
- The JWT-based `/api/auth` example remains technically valid, although Portainer's API docs also document API access tokens via `X-API-Key`.
