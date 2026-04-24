# Validation Summary: How to Build a Slack Bot That Deploys Containers via Portainer API

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- Slack slash commands
- Slack Bolt for JavaScript
- Node.js
- Docker
- PM2

## Sources Consulted
- Slack Developer Docs, "Creating an app with Bolt for JavaScript" - https://docs.slack.dev/tools/bolt-js/creating-an-app/
- Slack Developer Docs, "Listening & responding to commands" - https://docs.slack.dev/tools/bolt-js/concepts/commands
- Slack Developer Docs, "Implementing slash commands" - https://docs.slack.dev/interactivity/implementing-slash-commands
- Slack Developer Docs, "`commands` scope" - https://docs.slack.dev/reference/scopes/commands/
- Slack Developer Docs, "`chat.postMessage` method" - https://docs.slack.dev/reference/methods/chat.postMessage
- Portainer Documentation, "Accessing the Portainer API" - https://docs.portainer.io/2.21/api/access
- Portainer Documentation, "Webhooks" - https://docs.portainer.io/sts/user/docker/stacks/webhooks
- Portainer source, `stack_list.go` - https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/stack_list.go
- Portainer source, `stack_file.go` - https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/stack_file.go
- Portainer source, `stack_update.go` - https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/stack_update.go
- Portainer source, `stack_update_git_redeploy.go` - https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/stack_update_git_redeploy.go
- Portainer source, `endpointproxy/handler.go` - https://github.com/portainer/portainer/blob/develop/api/http/handler/endpointproxy/handler.go
- Portainer source, `endpointproxy/proxy_docker.go` - https://github.com/portainer/portainer/blob/develop/api/http/handler/endpointproxy/proxy_docker.go
- Docker Docs, "Build, tag, and publish an image" - https://docs.docker.com/get-started/docker-concepts/building-images/build-tag-and-publish-an-image/
- Local CLI help: `npm help ci`

## Issues Found
- The Slack setup steps omitted the required slash-command Request URL ending in `/slack/events` and included an unnecessary Incoming Webhooks step. I updated the setup instructions to match Slack's documented Bolt slash-command flow.
- The sample used `GET /stacks?endpointId=...`, but Portainer's stack list endpoint accepts a JSON `filters` query instead. I updated the code to use `filters={"EndpointID":...}`.
- The deploy example tried to reuse `stack.Content`, which is not returned by Portainer's stack list response. I updated the file-based redeploy path to fetch `/stacks/{id}/file` and send `StackFileContent` back to the update endpoint.
- Portainer uses different redeploy endpoints for Git-based and file-based stacks. I updated the `/deploy` command to use `/stacks/{id}/git/redeploy` for Git stacks and `/stacks/{id}` for file-based stacks.
- The original success and failure notifications used `chat.postMessage`, which can fail when the bot is not a member of the target channel. I changed the sample to use the slash command `respond()` helper with `response_type` instead.
- The `/deploy` and `/restart` handlers defaulted to `dev` internally but still referenced the unresolved raw environment value in messages and validation. I normalized the resolved environment handling and updated the usage strings to show that the environment is optional.
- The Docker section ran `portainer-slack-bot:latest` without first building that image. I added the missing `docker build -t portainer-slack-bot:latest .` step.

## Review Notes
- The sample now matches Portainer's documented stack APIs more closely, but successful calls still depend on the Portainer token having permission to manage the target environment and stack.
- Slash commands require a public HTTPS endpoint that Slack can reach. For local development, a tunnel such as ngrok is still required.
