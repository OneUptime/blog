# Validation Summary: How to Set Up GitOps Deployments with Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- GitOps
- Docker Compose
- Git
- GitHub webhooks
- Portainer API

## Sources Consulted
- Portainer Documentation: Add a new stack https://docs.portainer.io/user/docker/stacks/add
- Portainer Documentation: Inspect or edit a stack https://docs.portainer.io/user/docker/stacks/edit
- Portainer Documentation: How do automatic updates for stacks/applications work? https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer Documentation: API documentation https://docs.portainer.io/api/docs
- Portainer Documentation: API usage examples https://docs.portainer.io/sts/api/examples
- Portainer source: `createComposeStackFromGitRepository` handler https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/stacks/create_compose_stack.go
- Portainer source: `AutoUpdateSettings` definition https://raw.githubusercontent.com/portainer/portainer/develop/api/portainer.go
- Docker Docs: Compose file reference https://docs.docker.com/reference/compose-file/
- Docker Docs: Version and name top-level elements https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Environment variable interpolation https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Compose Specification: services / `healthcheck` and `env_file` https://github.com/compose-spec/compose-spec/blob/main/05-services.md
- GitHub Docs: Creating webhooks https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks

## Issues Found
- The repository example used `.env.portainer` and told readers to point Portainer at an arbitrary env file from the repo. Portainer documents automatic processing of a `.env` file for Git-deployed stacks, so I changed the example and explanation to use `.env` alongside the Compose file.
- The polling and webhook sections were written as if both should be enabled in sequence. Portainer documents GitOps updates as a single mechanism choice, so I corrected the wording to make polling and webhook updates explicit alternatives.
- The API example used `filePathInRepository`, but Portainer's stack creation API expects the Compose path as `composeFile`. I corrected the JSON payload key.
- The rollback section said Git-backed stacks could be edited directly in Portainer. Portainer documents that the editor is only available for stacks created with the web editor unless the stack is detached from Git, so I corrected the rollback guidance to use Git and updated the UI reference to the current Git details section.
- The Compose example included `version: "3.8"`, which Docker now documents as an obsolete top-level field in the Compose Specification. I removed it.

## Review Notes
- The healthcheck example is syntactically valid, but it assumes the application image contains `curl`.
- Portainer's current documentation emphasizes API access tokens via `X-API-Key`, but JWT authentication through `/api/auth` with `Authorization: Bearer` is still documented and remains valid for the example after the payload fix.
