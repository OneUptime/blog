# Validation Summary: How to Edit an Existing Stack in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Swarm
- Git-based stack deployments
- Docker environment variables
- Docker volumes

## Sources Consulted
- Portainer Documentation, "Inspect or edit a stack": https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer Documentation, "Add a new stack": https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer Documentation, "How do automatic updates for stacks/applications work?": https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer Documentation, "Why do relative bind mounts appear empty after updating a stack that was deployed from Git?": https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/empty-relative-bind-mounts
- Docker Docs, "`docker compose up`": https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Docs, "Define services in Docker Compose": https://docs.docker.com/reference/compose-file/services/
- Docker Docs, "Compose Deploy Specification": https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs, "Define and manage volumes in Docker Compose": https://docs.docker.com/reference/compose-file/volumes/

## Issues Found
- The post implied that every existing stack can be edited through the **Editor** tab. I corrected Step 1 to distinguish Web editor stacks from Git-based stacks, and to point Git-based stacks to **Pull and redeploy** or **Detach from Git**, matching Portainer's documented behavior.
- The update-behavior section stated that updates are applied "container by container within each service". I removed that unsupported claim and kept the documented behavior that changed Compose services are recreated while unchanged ones keep running.
- The image re-pull instructions were written as if they applied to the standard editor update flow. I corrected Step 3 to describe the documented Git-based workflow: **Pull and redeploy** with **Re-pull image** enabled.
- The Environment Variables section described Portainer-managed variables as a method "for secrets". I corrected this to show the documented `${VAR}` substitution pattern used by Portainer environment variables instead of presenting it as a secrets mechanism.
- The resource-limit section did not clearly scope `deploy.resources` to Swarm-style deployments. I corrected Step 5 so the `deploy:` example is explicitly for Docker Swarm, while `mem_limit` and `cpus` remain the standalone Docker example.
- The rename-service section said the old service container is removed automatically. I corrected Step 6 to note that Compose-based stacks can leave the old container as an orphan unless it is removed, while Swarm stacks can use **Prune services** during update.
- The rollback section incorrectly said Portainer does not maintain stack version history. I corrected Step 7 to use Portainer's documented **Version** dropdown for Web editor stacks and updated the Git rollback wording to use repository history and redeployment.

## Review Notes
- The `nginx:1.25-alpine` image tag is acceptable as an example, but specific image tags age over time; production guidance should use a currently supported tag.
- Portainer UI labels can vary slightly across releases, but the corrected workflow matches the current Portainer 2.38-2.40 documentation consulted during review.
