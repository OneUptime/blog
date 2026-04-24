# Validation Summary: How to Force Pull Latest Images When Updating Stacks in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Docker Swarm
- GitHub Actions
- Watchtower

## Sources Consulted
- Portainer stack editing docs: https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer FAQ on relative bind mounts and manual redeploy flow: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/empty-relative-bind-mounts
- Portainer FAQ on automatic updates behavior: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer stack creation docs covering `Re-pull image` / GitOps updates: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer API docs index: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI schema: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker `docker compose pull` reference: https://docs.docker.com/reference/cli/docker/compose/pull/
- Docker `docker compose up` reference: https://docs.docker.com/reference/cli/docker/compose/up/
- Docker `docker service update` reference: https://docs.docker.com/reference/cli/docker/service/update/
- Docker Swarm services docs: https://docs.docker.com/engine/swarm/services/
- Docker `docker inspect` reference: https://docs.docker.com/reference/cli/docker/inspect/
- Docker `docker image inspect` reference: https://docs.docker.com/reference/cli/docker/image/inspect/
- Watchtower arguments docs: https://containrrr.dev/watchtower/arguments/
- Watchtower usage overview: https://containrrr.dev/watchtower/usage-overview/

## Issues Found
- The introduction overstated Docker’s default behavior by saying Docker only pulls when a tag is missing locally. I corrected this to describe the real problem: stack redeploys can continue using a previously resolved digest for an unchanged mutable tag unless a re-pull is forced.
- The Portainer UI wording was outdated/inconsistent. I updated the post to use current terminology such as `Re-pull image` and to describe the current manual redeploy/update flow instead of the older `Force re-pull images` wording.
- The Git-based automatic update section used outdated option text. I changed it to `Re-pull image` and clarified that it applies when updates are triggered by polling or webhook.
- The Compose CLI example did not explicitly force a fresh pull. I changed it to `docker compose pull --policy always` so the command matches the “force pull” behavior described in the article.
- The Swarm CLI explanation was too absolute. I corrected it to reflect Docker’s documented behavior: `docker service update --image ...` resolves the tag to its current digest and rolls the service if that digest changes.
- The Portainer API example was incorrect for current Portainer. It used the file-based stack update endpoint, omitted the endpoint distinction, and used deprecated `PullImage`. I replaced it with the Git stack redeploy endpoint `/api/stacks/{id}/git/redeploy` and the current `RepullImageAndRedeploy` field.
- The verification section described `docker inspect ... {{.Image}}` as a digest and used `Metadata.LastTagTime`, which is not the right documented field to rely on here. I corrected the output description to image ID and replaced the timestamp check with a documented `RepoDigests` inspection.
- The Watchtower example configured the poll interval twice, once via CLI flag and again via environment variable. I removed the redundant environment variable to avoid conflicting or confusing configuration.

## Review Notes
- Portainer’s UI labels around stack image pulling have changed over time from `Pull latest image` to `Re-pull image`; the post now reflects current terminology.
- The production recommendation to use immutable digests or versioned tags is technically correct and remains the most reliable deployment strategy.
