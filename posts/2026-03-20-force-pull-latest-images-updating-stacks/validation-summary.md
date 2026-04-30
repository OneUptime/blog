# Validation Summary: How to Force Pull Latest Images When Updating Stacks in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Swarm
- Portainer API
- cURL

## Sources Consulted
- Portainer Docs: Add a new stack - https://docs.portainer.io/user/docker/stacks/add
- Portainer Docs: Webhooks - https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer Docs: How do automatic updates for stacks/applications work? - https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer Docs: Environment Variable Management in Docker: .env vs. stack.env - https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/environment-variable-management-in-docker-.env-vs.-stack.env
- Portainer Docs: Accessing the Portainer API - https://docs.portainer.io/api/access
- Portainer Docs: API usage examples - https://docs.portainer.io/api/examples
- Portainer API Documentation 2.39.1 - https://api-docs.portainer.io/?edition=ee&version=2.39.1
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Compose examples used the top-level `version: "3.8"` field. Current Docker Compose documentation marks the `version` field as obsolete, so it was removed from both examples.
- The Portainer API example posted to `/api/stacks` with `type` and `endpointId` in the JSON body. Current Portainer API documentation uses `/api/stacks/create/standalone/string?endpointId=...` for this workflow, with `Name`, `StackFileContent`, and `Env` in the request body. The example was updated accordingly.
- The Git repository instructions said to select `Repository` as the build method. The current Portainer UI label is `Git Repository`, so the step text was corrected.
- The polling section referred generically to stack settings and included an unverified `5m` example. Portainer documents this under GitOps update settings, so the wording was corrected and the undocumented interval example was removed.
- The webhook example claimed Portainer redeploys with `--pull-always`. Portainer’s stack webhook documentation says the default behavior is to redeploy the stack and pull the latest image for the same tag, with `pullimage=false` available to prevent the pull. The comment was corrected.
- The `stack.env` troubleshooting section incorrectly treated `stack.env` as the same thing as `.env`. Portainer documents these as different mechanisms, and `env_file: - stack.env` is unsupported on Docker Swarm. The cause and fixes were updated to reflect the documented behavior.

## Review Notes
- Portainer’s current API docs center on access tokens via `X-API-Key` for automation, but JWT Bearer tokens from `/api/auth` are still documented and supported.
- Stack webhooks are documented as a Portainer Business Edition feature and are only available on non-Edge environments.
