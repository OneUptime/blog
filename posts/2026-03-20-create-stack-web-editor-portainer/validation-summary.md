# Validation Summary: How to Create a Stack from the Web Editor in Portainer

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Portainer (Community/Business Edition)
- Docker Compose (Compose Spec, version "3.8" example)
- Portainer HTTP API (`/api/auth`, `/api/stacks`, stack webhooks)
- Bash / curl
- nginx, PostgreSQL 16 (used in example compose file)
- Git / GitOps (polling, webhooks, auto-update)

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API examples (deviantony gist referenced from official docs): https://gist.github.com/deviantony/77026d402366b4b43fa5918d41bc42f8
- Portainer stack webhooks documentation: https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer "Add a new stack" documentation: https://docs.portainer.io/user/docker/stacks/add
- Portainer GitOps / automatic updates FAQ: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work

## Issues Found

1. **`POST /api/stacks` payload structure was wrong.** The original example put `type: 2` and `endpointId: 1` inside the JSON body. Per the Portainer API, `type`, `method`, and `endpointId` are required **query parameters** on `/api/stacks`, while the body holds the stack definition (`Name`, `StackFileContent`, `Env`, etc.). Updated the curl URL to `https://localhost:9443/api/stacks?type=2&method=string&endpointId=1` and removed the `type`/`endpointId` fields from the body. Also normalized field casing to `Name`/`StackFileContent`/`Env`, which is the canonical form shown in Portainer's API examples (the API accepts case-insensitive variants but the documented form is capitalized).

2. **Misleading `--pull-always` comment in the webhook section.** The original comment said "Portainer redeploys the stack with `--pull-always`", which is not a real Docker Compose / Portainer flag, and it misrepresents default webhook behavior. By default a stack webhook redeploys with the existing configuration. To force a re-pull, callers must either send `{"pullImage": true}` in the body (Business Edition) or enable "Re-pull image" in the stack's automatic updates settings. Replaced the comment with an accurate description.

## Review Notes

- Docker Compose `version: "3.8"` is still accepted but is considered obsolete in the current Compose Spec — Compose now ignores the `version` top-level element. Keeping it does no harm and matches what the Portainer web editor templates often show, so this was left as-is.
- The webhook URL path shown (`/api/stacks/webhooks/<uuid>`) matches Portainer's current documented format.
- `5m` polling-interval format is correct (Go duration syntax: `s`, `m`, `h`).
- The `python3 -c "...['jwt']..."` one-liner is syntactically fine: single quotes inside a bash double-quoted string don't conflict.
- The `stack.env` "no such file or directory" troubleshooting section is a real Portainer issue and the listed fixes (upload via UI, remove `${VARIABLE}` references, commit `.env` to the Git repo) are all valid mitigations.
- Self-signed cert handling via `--insecure` on `curl` is appropriate for the localhost example shown but should not be carried into production scripts.
