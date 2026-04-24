# Validation Summary: How to Configure Git Polling for Auto-Updates in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer API
- Docker Standalone stacks
- Git / GitOps
- `curl`
- `jq`

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer docs, Add a new stack: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer docs, Inspect or edit a stack: https://docs.portainer.io/user/docker/stacks/edit
- Portainer docs, How do automatic updates for stacks/applications work?: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer source, stack Git settings update handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/stack_update_git.go
- Portainer source, auto-update validation: https://github.com/portainer/portainer/blob/develop/api/git/update/validate.go
- Portainer source, GitOps auto-update view model mapping: https://github.com/portainer/portainer/blob/develop/app/react/portainer/gitops/AutoUpdateFieldset/utils.ts

## Issues Found
- The existing-stack API examples used the wrong endpoint and wrong payload shape. The draft used `PUT /api/stacks/{id}` with `FetchInterval` and top-level `pullImage`, but current Portainer uses `POST /api/stacks/{id}/git` with `AutoUpdate.Interval`, `AutoUpdate.ForcePullImage`, and `AutoUpdate.ForceUpdate`. I updated all affected snippets.
- The new-stack API example used incorrect field names and casing such as `name`, `repositoryURL`, `filePathInRepository`, and `autoUpdate`. Portainer’s current API expects `Name`, `RepositoryURL`, `ComposeFile`, `AutoUpdate`, and `Env`. I corrected the request body to match the official schema.
- The force-redeployment explanation conflated redeployment with image pulling. In Portainer, `ForceUpdate` forces redeployment, while `ForcePullImage` controls whether fresh images are pulled. I rewrote the explanation and example to distinguish those settings accurately.
- The monitoring example referenced `.GitConfig.LastPollTime`, which is not present in the documented stack response schema. I replaced it with documented fields that are returned by `GET /api/stacks/{id}`.
- The disable-polling API example used an empty interval on the wrong endpoint. I replaced it with the Git settings endpoint and `AutoUpdate: null`, which matches current Portainer behavior.
- The polling-versus-webhook comparison overstated polling latency as `1-60 minutes` and the conclusion suggested using polling and webhooks together as a documented pattern. I corrected the latency wording to reflect the configured interval with a one-minute minimum and changed the conclusion to recommend choosing webhooks instead when lower latency is required.

## Review Notes
- The corrected update examples are explicitly scoped to a public Docker Standalone stack on `refs/heads/main` with no Portainer-managed stack environment variables, because Portainer’s Git settings endpoint overwrites some values if they are omitted from the payload.
- Portainer’s FAQ page on automatic updates is accurate on the overall GitOps behavior, but its illustrative `docker-compose` command currently contains a typo. The API payload corrections were therefore verified against the OpenAPI spec and Portainer source code as the authoritative references.
