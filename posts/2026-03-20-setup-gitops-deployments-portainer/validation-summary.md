# Validation Summary: How to Set Up GitOps Deployments with Portainer - Setup

## Status
validated

## Post Type
Tutorial / Setup guide

## Technologies Covered
- Portainer
- GitOps
- Git
- Docker Compose
- Docker Swarm / Docker Standalone stack deployment
- Webhooks / CI/CD automation

## Sources Consulted
- OpenGitOps principles: https://opengitops.dev/
- Portainer 2.39 LTS, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer automatic updates for stacks/applications: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer environment variable management: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/environment-variable-management-in-docker-.env-vs.-stack.env
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose variable interpolation: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Git revert documentation: https://git-scm.com/docs/git-revert
- Git push documentation: https://git-scm.com/docs/git-push

## Issues Found
- The Compose example used `version: "3.8"`, but Docker's current Compose Specification marks the top-level `version` field as obsolete and warns when it is used. Removed the `version` key.
- The Portainer setup steps used older/general field labels (`Branch` and `Compose file path`). Updated them to the current Portainer labels `Repository reference` and `Compose path`.
- The webhook explanation implied Git directly triggers Portainer. Updated it to explain that Portainer provides a webhook URL that a Git provider or CI/CD workflow calls.
- The image-tag comment said versioned tags were for Portainer change detection. Portainer GitOps detects changes by comparing Git commit hashes, so the comment was corrected to say versioned tags make the deployed version recorded in Git.
- The secret environment variable example did not show the Compose file referencing the variables defined in Portainer. Added `DB_PASSWORD=${DB_PASSWORD}` and `API_KEY=${API_KEY}` to the Compose environment list and clarified that Portainer variables should correspond to Compose placeholders.
- The verification section used brittle UI wording (`Current Git commit hash`, `Pull status`). Reworded it to refer to checking the deployed commit hash and update status.

## Review Notes
Docker was not installed in the local workspace, so the Compose example was reviewed against Docker's official Compose reference rather than executed with `docker compose config`. Git commands were checked against official Git documentation and local Git 2.43.0 help output.
