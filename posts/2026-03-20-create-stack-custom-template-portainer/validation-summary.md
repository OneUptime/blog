# Validation Summary: How to Create a Stack from a Custom Template in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (CE, stacks API)
- Docker Compose
- Docker / containers (nginx, postgres)
- Git / GitOps polling and webhooks
- Bash + curl for API interaction

## Sources Consulted
- Portainer API examples — https://docs.portainer.io/api/examples
- Portainer API access (auth + JWT) — https://docs.portainer.io/api/access
- Portainer stack webhooks — https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer "Add a new stack" — https://docs.portainer.io/user/docker/stacks/add
- GitHub Discussion #12670 — `POST /stacks` removed in 2.27.0 — https://github.com/orgs/portainer/discussions/12670
- DeepWiki Stack Deployment (stack type IDs) — https://deepwiki.com/portainer/portainer/3.3-stack-deployment
- Docker Compose file reference — https://docs.docker.com/reference/compose-file/

## Issues Found
1. **Deprecated stack creation endpoint and incorrect parameter placement.**
   The post used `POST /api/stacks` with `type` and `endpointId` placed in the JSON body. The legacy `POST /api/stacks` endpoint was deprecated and removed in Portainer CE 2.27.0, and even on the legacy endpoint `type`, `method`, and `endpointId` were query parameters, not body fields. Updated to the current `POST /api/stacks/create/standalone/string?endpointId=1` (orchestrator encoded in path; `type` is no longer used) and removed `type`/`endpointId` from the body.

2. **Incorrect description of webhook redeploy behavior.**
   The post claimed Portainer redeploys with `--pull-always`. That flag is `docker run` semantics and is not how Portainer documents the webhook. Portainer documents webhooks as redeploying stack containers with the latest image of the same tag (subject to the stack's pull configuration). Updated the comment accordingly.

3. **Incorrect Portainer UI reference (".env file tab").**
   No tab named ".env file" exists in the Portainer UI. The relevant section is "Environment variables", which has a "Load variables from .env file" button. Corrected the fix instruction to match the actual UI.

## Review Notes
- The `version: "3.8"` Compose top-level key still works but is considered obsolete by recent Docker Compose versions; this is not strictly an error and the post's snippet remains valid.
- The post's title mentions "Custom Template" but the body covers the broader Add-stack flow (web editor, Git, API, webhooks). Per the review scope, structural changes were not made.
- The `python3 -c` JWT extraction one-liner relies on the response key being lowercase `jwt`, which matches Portainer's documented response.
- The `/api/auth` endpoint, JWT response shape, webhook URL pattern (`/api/stacks/webhooks/<uuid>`), and stack `type` integer mapping (1=Swarm, 2=Compose, 3=Kubernetes) were all confirmed against official sources.
