# Validation Summary: How to Hide Containers Using Labels in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Portainer Business Edition
- Docker Engine
- Docker labels
- Docker Compose

## Sources Consulted
- Portainer Documentation, General settings: https://docs.portainer.io/admin/settings/general
- Portainer Documentation, CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer Documentation, Environments and access management: https://docs.portainer.io/admin/environments/environments
- Portainer Documentation, Why can't my users see anything in the environment they have access to?: https://docs.portainer.io/faqs/troubleshooting/logs-errors-and-debugging/why-cant-my-users-see-anything-in-the-environment-they-have-access-to
- Portainer Documentation, Install Portainer Agent on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/agent
- Docker Docs, Docker object labels: https://docs.docker.com/engine/manage-resources/labels/
- Docker Docs, Define services in Docker Compose: https://docs.docker.com/reference/compose-file/services/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, Frequently asked questions about Docker Compose: https://docs.docker.com/compose/support-and-feedback/faq/

## Issues Found
- The post incorrectly implied that Portainer uses a built-in hide label and referenced `portainer.agent.secret` plus `com.docker.compose.project=portainer` as the hiding mechanism. I corrected this to reflect Portainer's actual behavior: administrators configure the label name/value in **Settings** → **Hidden containers** or via the `--hide-label` (`-l`) CLI option.
- The Method 1 heading implied a special `portainer.hide` label existed. I changed it to a custom-label workflow and clarified that `hide=true` only works when Portainer is configured to hide that label.
- The settings instructions used an imprecise path and save flow. I updated them to match Portainer's documented **Settings** → **Hidden containers** flow and the **Add filter** action.
- The Compose example used the top-level `version: "3.8"` field, which is now obsolete in modern Compose. I removed it.
- The text referred to `docker-compose` in a generic instruction. I updated this to Docker Compose terminology to align with current Docker documentation.
- The Business Edition visibility section oversimplified access behavior as environment-only. I corrected it to reflect Portainer's documented environment access plus resource ownership/public visibility behavior for non-admin users.

## Review Notes
- The post now accurately describes Portainer's hidden-container feature as a configurable label filter rather than a special hardcoded label.
- Label-based hiding reduces UI clutter but is not a substitute for access control. Portainer's environment permissions and resource ownership controls remain the correct mechanism for security-sensitive visibility requirements.
