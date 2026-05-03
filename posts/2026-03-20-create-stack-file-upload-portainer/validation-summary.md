# Validation Summary: How to Create a Stack from a File Upload in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Community Edition / Business Edition, 2.x)
- Docker Compose
- Portainer HTTP API (auth, stacks, webhooks)
- GitOps / Git-based stack deployment
- curl

## Sources Consulted
- [Portainer API documentation](https://docs.portainer.io/api/docs)
- [Portainer API access / authentication](https://docs.portainer.io/api/access)
- [Portainer API usage examples](https://docs.portainer.io/api/examples)
- [Stack Deployment - Portainer source code reference (DeepWiki)](https://deepwiki.com/portainer/portainer/3.3-stack-deployment)
- [Portainer Stack Webhooks documentation](https://docs.portainer.io/user/docker/stacks/webhooks)
- [How automatic updates for stacks work (Portainer FAQ)](https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work)
- [Add a new stack | Portainer Documentation](https://docs.portainer.io/user/docker/stacks/add)

## Issues Found

1. **Incorrect stack creation API endpoint and payload structure.**
   The original example used `POST /api/stacks` and placed `type: 2` and `endpointId: 1` in the JSON body. This does not match the current Portainer API. The current endpoint for creating a Compose stack from inline content is `POST /api/stacks/create/standalone/string?endpointId=<id>`, where the stack type (`standalone`) and method (`string`) are encoded in the URL path and `endpointId` is a query parameter — not body fields.
   - **Fix:** Updated the curl command to use `https://localhost:9443/api/stacks/create/standalone/string?endpointId=1` and removed the `type` and `endpointId` fields from the JSON body. The remaining body fields (`name`, `stackFileContent`, `env`) match the documented payload.

2. **Inaccurate webhook redeploy comment (`--pull-always`).**
   The original comment said `# Portainer redeploys the stack with --pull-always`. Portainer does not invoke Docker's `--pull-always` flag. According to the Portainer webhook documentation, the default behavior on webhook trigger is to pull the latest image of the same tag and redeploy, with optional query parameters `?pullimage=false` (skip pull) and `?tag=<tag>` (deploy a different tag).
   - **Fix:** Replaced the inaccurate comment with one that correctly describes the default behavior and mentions the supported `?pullimage=false` and `?tag=` query parameters.

## Review Notes
- The Compose YAML uses `version: "3.8"`. The version field is no longer required by the modern Compose Specification but remains valid and accepted by Portainer; left unchanged since this is a stylistic/legacy choice rather than a technical error.
- The `/api/auth` endpoint and the `jwt` field name in the response are correct for current Portainer versions.
- The polling-interval field (e.g., `5m`) for Git auto-update is correct; Portainer accepts Go-style duration strings.
- The UI navigation (`Stacks > Add stack`, build methods labeled Web editor / Upload / Repository / Custom template) matches current Portainer 2.x UI.
- The note about Docker Compose expecting a `.env` file alongside `compose.yml` (`stack.env: no such file or directory`) reflects a known class of issues users hit when uploading a compose file that references env vars without providing the `.env` content; the suggested fixes are reasonable.
