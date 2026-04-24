# Validation Summary: How to Use Watchtower Monitor-Only Mode with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Watchtower
- Portainer
- Docker Compose
- Docker CLI
- Slack webhooks

## Sources Consulted
- Watchtower arguments: https://containrrr.dev/watchtower/arguments/
- Watchtower container selection: https://containrrr.dev/watchtower/container-selection/
- Watchtower notifications: https://containrrr.dev/watchtower/notifications/
- Shoutrrr Slack service URL format: https://containrrr.dev/shoutrrr/v0.8/services/slack/
- Portainer stack webhooks: https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer inspect or edit a stack: https://docs.portainer.io/user/docker/stacks/edit
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer authenticated Git redeploy handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/stack_update_git_redeploy.go
- Portainer stack webhook handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/webhook_invoke.go
- Portainer frontend Git stack redeploy query: https://github.com/portainer/portainer/blob/develop/app/react/portainer/gitops/queries/useUpdateGitStack.ts
- Docker inspect CLI reference: https://docs.docker.com/reference/cli/docker/inspect/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/

## Issues Found
- The introduction said monitor-only mode does not pull new images. Watchtower's official arguments documentation notes that monitor-only still pulls when needed to compare image digests, so the wording was corrected to say it does not replace or restart containers automatically.
- The first Compose example used the obsolete top-level `version` field. This was removed to align the snippet with the current Compose Specification.
- The notification comment said notifications were required for monitor-only mode. This was softened to recommended, since logs still provide value without a notification channel.
- The `review-and-update.sh` example stopped and removed the running container but never recreated it, so it would leave the service down. It was rewritten into a safe helper that pulls the latest image and then directs the reader to do the actual redeploy in Portainer.
- The Portainer manual workflow implied `Pull and redeploy` applied universally. Portainer documents that Git-deployed stacks use `Pull and redeploy`, while Web Editor stacks are updated via the editor and `Update the stack`, so the wording was clarified.
- The production and staging Watchtower examples were combined into a single invalid YAML block. They were split into separate Compose snippets so each example is valid on its own.
- The Portainer API example used the wrong HTTP method and omitted the environment query parameter. It was corrected to `PUT /api/stacks/{id}/git/redeploy?endpointId=...` with the current `RepullImageAndRedeploy` payload field based on Portainer's current backend and frontend code.
- The webhook example did not mention that stack webhooks are a Portainer Business Edition feature. That caveat was added from the official Portainer documentation.
- The sample Watchtower log output did not match current Watchtower logging. It was replaced with examples that align with current debug/info messages emitted by the official source.

## Review Notes
- Watchtower's Slack-specific notification variables are still officially documented as legacy-compatible options, but the current notification system is based on shoutrrr URLs. The post remains technically correct after review.
