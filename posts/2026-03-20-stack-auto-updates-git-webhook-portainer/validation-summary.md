# Validation Summary: How to Set Up Stack Auto-Updates from Git in Portainer (Webhook) (2)

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Portainer stacks
- Portainer GitOps updates
- Portainer stack webhooks
- Portainer HTTP API
- Docker Compose
- Git repositories and webhooks
- curl

## Sources Consulted
- Portainer documentation: Add a new stack - https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer documentation: Stack webhooks - https://docs.portainer.io/sts/user/docker/stacks/webhooks
- Portainer documentation: Automatic updates for stacks/applications - https://docs.portainer.io/sts/faqs/troubleshooting/how-do-automatic-updates-for-stacks-applications-work
- Portainer documentation: Deprecated and removed features - https://docs.portainer.io/sts/advanced/deprecated
- Portainer CE 2.40.0 OpenAPI schema - https://api-docs.portainer.io/versions/ce/2.40.0.yaml
- Docker Compose documentation: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose documentation: Set environment variables - https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/
- Docker Compose documentation: Variable interpolation - https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/

## Issues Found
- The Compose examples used the obsolete top-level `version: "3.8"` field. Removed it from the YAML and API stack file content so the examples follow the current Compose Specification.
- The Git stack instructions referred to **Repository** as the build method. Updated it to **Git Repository**, matching the current Portainer UI terminology.
- The API example used the removed `POST /api/stacks` endpoint, lower-case payload fields, and `endpointId`/`type` in the JSON body. Updated it to `POST /api/stacks/create/standalone/string?endpointId=1` with the current `Name`, `StackFileContent`, and `Env` payload fields.
- The authentication payload used lower-case `username` and `password` keys. Updated them to the current OpenAPI schema keys, `Username` and `Password`.
- The API stack file content did not reference the environment variables it created. Updated the Compose content to pass `APP_ENV` and `DB_PASSWORD` into the service environment.
- The webhook example claimed Portainer redeploys the stack with `--pull-always`. Updated the wording to state that Portainer checks Git and updates the stack when a new commit is found, which matches GitOps webhook behavior unless force redeployment settings are enabled.
- The webhook section omitted Portainer's availability constraints. Added the Business Edition and non-Edge environment caveat from the official stack webhook documentation.
- The `stack.env` troubleshooting section described the cause as a missing `.env` file next to `compose.yml`. Corrected it to explain that the compose file is referencing `env_file: stack.env` and the file is unavailable during deployment, then adjusted the fixes to match Portainer's documented environment-variable behavior.

## Review Notes
- The API example now targets Docker Standalone/Compose stacks. Docker Swarm stacks use a different `/stacks/create/swarm/...` API path and Swarm-specific payload.
- The webhook update behavior depends on the stack's GitOps settings. Without force redeployment, Portainer only updates when it detects a change in the remote Git repository.
- The `--insecure` curl flag is acceptable for the local self-signed HTTPS example, but production automation should use valid TLS certificates.
