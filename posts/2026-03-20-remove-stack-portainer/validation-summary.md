# Validation Summary: How to Remove a Stack in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Portainer API
- Git-based stack deployments
- Stack webhooks

## Sources Consulted
- Portainer Docs, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer Docs, Webhooks: https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer Docs, How do automatic updates for stacks/applications work?: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer Docs, Environment Variable Management in Docker: .env vs. stack.env: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/environment-variable-management-in-docker-.env-vs.-stack.env
- Portainer Docs, API documentation: https://docs.portainer.io/api/docs
- Portainer CE API 2.39.1 spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker Docs, Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, Interpolation and `.env` behavior: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/

## Issues Found
- The Compose examples used the top-level `version` field. I removed it because Docker documents that field as obsolete in the current Compose Specification.
- The Portainer API example used an outdated stack-creation endpoint and request body shape. I updated it to the current standalone stack creation route, moved `endpointId` into the query string, and aligned the payload keys with the current API spec.
- The authentication example used lowercase JSON keys for `/api/auth`. I aligned the example with Portainer's documented request schema using `Username` and `Password`.
- The webhook example claimed Portainer redeploys with `--pull-always`. I corrected this because Portainer documents webhook behavior in terms of its configured stack webhook settings, not a `--pull-always` flag, and stack webhooks are documented as a Business Edition feature for non-Edge environments.
- The `stack.env` troubleshooting section incorrectly described the issue as Docker Compose looking for a standard `.env` file. I corrected this to distinguish Portainer's generated `stack.env` file from Docker Compose's `.env` handling and to note that `env_file` is not supported by `docker stack deploy` on Swarm.

## Review Notes
- The body content is technically relevant and now accurate, but it is focused primarily on creating and updating stacks rather than removing them. If the editorial goal is to match the current title and description exactly, the post would need a separate content pass.
