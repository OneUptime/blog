# Validation Summary: How to Recover Orphaned Stacks in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Swarm
- Portainer API
- Git repositories and GitOps updates
- Webhooks
- `curl`

## Sources Consulted
- Portainer docs: Add a new stack — https://docs.portainer.io/user/docker/stacks/add
- Portainer docs: Webhooks — https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer docs: How do automatic updates for stacks/applications work? — https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer docs: How do I recover orphaned stacks from a previously deleted environment? — https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-i-recover-orphaned-stacks-from-a-previously-deleted-environment
- Portainer docs: Environment Variable Management in Docker: .env vs. stack.env — https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/environment-variable-management-in-docker-.env-vs.-stack.env
- Portainer docs: Accessing the Portainer API — https://docs.portainer.io/api/access
- Docker docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer source: stack creation routes — https://github.com/portainer/portainer/blob/master/api/http/handler/stacks/stack_create.go
- Portainer source: compose stack create handler — https://github.com/portainer/portainer/blob/master/api/http/handler/stacks/create_compose_stack.go
- Portainer source: stack environment variable panel — https://github.com/portainer/portainer/blob/master/app/react/components/form-components/EnvironmentVariablesFieldset/StackEnvironmentVariablesPanel.tsx
- Portainer source: compose stack env-file handling — https://github.com/portainer/portainer/blob/master/api/exec/compose_stack.go
- Portainer source: stack webhook handler — https://github.com/portainer/portainer/blob/master/api/http/handler/stacks/webhook_invoke.go

## Issues Found
- The post title and description promised orphaned-stack recovery, but the body did not explain the actual recovery path. I updated the introduction to include Portainer's documented recovery flow (`Show all orphaned stacks` then `Associate`) and corrected the description to match the documented condition: the environment was deleted and recreated on the same node.
- The Compose examples used the top-level `version` field. Docker now treats that field as obsolete, so I removed it from the examples.
- The API example used an outdated/incorrect stack-creation pattern (`POST /api/stacks` with deployment type data in the body). I corrected it to Portainer's current standalone stack creation route and query-parameter shape: `/api/stacks/create/standalone/string?endpointId=...`.
- The API example authenticated with a login flow instead of the access-token pattern currently documented by Portainer. I changed it to the documented `X-API-Key` header approach.
- The API example provided environment variables that were not referenced in the Compose content. I updated `stackFileContent` so the posted variables are actually used by the services.
- The webhook section said Portainer redeploys with `--pull-always`, which is not how Portainer documents stack webhooks. I rewrote the note to describe the documented GitOps webhook behavior and added the `pullimage=false` caveat plus the Business Edition and non-Edge limitation.
- The `stack.env` troubleshooting section incorrectly attributed the error to Docker Compose expecting a `.env` file beside the compose file. I replaced that with Portainer's documented and implemented behavior: `stack.env` is auto-created for Web editor, Upload, and Custom template deployments when variables are defined in Portainer, while repository-based deployments require `stack.env` to already exist in the repo if the compose file references it.

## Review Notes
Portainer's current implementation and UI use the newer `/api/stacks/create/<type>/<method>` routes, while some older Swagger material and third-party examples still reference the legacy `POST /api/stacks` flow. This post now follows the current routes and current Compose guidance.
