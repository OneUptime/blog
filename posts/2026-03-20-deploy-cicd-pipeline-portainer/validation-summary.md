# Validation Summary: How to Deploy a CI/CD Pipeline with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Stacks, Webhooks, REST API)
- Docker (image build/push, tags)
- Shell / Bash scripting (CI pipeline)
- curl + jq (API interaction)
- Mermaid (diagram)

## Sources Consulted
- [Portainer Webhooks documentation](https://docs.portainer.io/user/docker/stacks/webhooks)
- [Portainer Inspect/edit a stack documentation](https://docs.portainer.io/user/docker/stacks/edit)
- [Portainer Add a new stack documentation](https://docs.portainer.io/user/docker/stacks/add)
- [Portainer HTTP API by example (deviantony gist)](https://gist.github.com/deviantony/77026d402366b4b43fa5918d41bc42f8)
- [JuliusFreudenberger/portainer-stack-git-redeploy-action (reference implementation of git/redeploy call)](https://github.com/JuliusFreudenberger/portainer-stack-git-redeploy-action)
- [Portainer issue #6289 - Update stack (pull image) via the API](https://github.com/portainer/portainer/issues/6289)

## Issues Found

1. **Step 3: missing required `endpointId` query parameter on `git/redeploy`.** The original example called `PUT /api/stacks/$STACK_ID/git/redeploy` without `endpointId`. The Portainer API requires `endpointId` (the environment ID) on this endpoint — calls without it return an error like "Unable to find the environment associated to the stack". Fixed by adding an `ENDPOINT_ID=1` variable and appending `?endpointId=$ENDPOINT_ID` to the URL, with a comment explaining where to find the environment ID in the UI.

2. **Step 4: `POST /api/stacks/$STACK_ID/images/update?pullImage=true` is not a real Portainer API endpoint.** This path does not exist in Portainer. To pull latest images and redeploy a stack via the authenticated API, the correct endpoint for a Git-deployed stack is `PUT /api/stacks/{id}/git/redeploy?endpointId={id}` with body `{"pullImage": true, "prune": false}` (and for compose-uploaded stacks, `PUT /api/stacks/{id}?endpointId={id}` with `StackFileContent`). Fixed by replacing the call with the same `git/redeploy` PUT used in Step 3, adding an `ENDPOINT_ID` variable derived from `PORTAINER_ENDPOINT_ID` env var (defaulting to 1), and including the JSON body and `Content-Type: application/json` header.

## Review Notes
- The webhook URL format (`POST /api/stacks/webhooks/{webhookID}`) used in Step 1/Step 2 is correct.
- The auth endpoint (`POST /api/auth` with `{"Username": ..., "Password": ...}`) is correct; Portainer's JSON unmarshalling matches both PascalCase and lowercase forms.
- Portainer also supports an `X-API-Key` header as an alternative to JWT bearer tokens for CI use; the post sticks with JWT, which is fine but worth knowing for token rotation.
- The `git/redeploy` endpoint only works for stacks that were created from a Git repository. For stacks created from an uploaded compose file or web editor, the correct endpoint is `PUT /api/stacks/{id}` with the full `StackFileContent`. The post does not call this distinction out, but the simpler webhook approach in Step 2 works for both stack types and is the recommended path for most CI/CD setups.
- The Step 4 example is a little simplistic (no error handling on the redeploy call, no health check after redeploy) but that is a stylistic concern, not a correctness issue.
