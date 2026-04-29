# Validation Summary: How to Migrate a Stack Between Environments in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Community Edition, v2.x)
- Docker Compose
- Portainer HTTP API (`/api/auth`, `/api/stacks`, `/api/stacks/webhooks/{uuid}`)
- nginx, postgres (example images)
- Bash + curl + python3 (for API examples)

## Sources Consulted
- Portainer source — stack handler routes: https://github.com/portainer/portainer/blob/master/api/http/handler/stacks/handler.go
- Portainer source — `stack_create.go` (verifies `type`, `method`, `endpointId` are read via `RetrieveNumericQueryParameter` / query parameters, not body)
- Portainer source — `webhook_invoke.go` (stack webhook handler calls `RedeployWhenChanged`, takes only `webhookID` from the URL)
- Portainer API docs index: https://docs.portainer.io/api/docs and https://docs.portainer.io/api/examples
- Compose specification (for `version: "3.8"` validity)

## Issues Found
1. **`POST /api/stacks` parameter placement was wrong.** The original example placed `type: 2` and `endpointId: 1` inside the JSON body. The Portainer handler (`stack_create.go`) reads `type`, `method`, and `endpointId` exclusively as query parameters via `request.RetrieveNumericQueryParameter` / `RetrieveQueryParameter`. The original call also omitted `method` entirely, so it would have been rejected. Fixed by moving them to the query string and adding `method=string`:
   `"https://localhost:9443/api/stacks?type=2&method=string&endpointId=1"`.

2. **Misleading webhook comment.** The original said "Portainer redeploys the stack with `--pull-always`". The stack webhook handler (`webhook_invoke.go`) does not invoke any such CLI flag — it calls `RedeployWhenChanged` on the stack, which is the Git-aware redeploy path. Reworded the comment to describe the actual behavior.

## Review Notes
- The post title talks about "migrating a stack between environments" but the body is really about creating stacks (web editor, Git, API) with no explicit migration walkthrough. That's a content/structure concern outside the scope of a technical-correctness review, so it was left alone.
- `version: "3.8"` in the Compose YAML is still accepted by Docker Compose, but the Compose Specification has deprecated the top-level `version` field and Compose v2 ignores it. Not incorrect, just dated — leaving as-is.
- The `python3 -c "...json.load(sys.stdin)['jwt']"` snippet is correct: `POST /api/auth` returns `{"jwt": "..."}`.
- The webhook URL pattern `/api/stacks/webhooks/<uuid>` matches the registered route `POST /stacks/webhooks/{webhookID}`.
- Auto-update polling interval format (`5m`) is consistent with Portainer's stack auto-update settings.
