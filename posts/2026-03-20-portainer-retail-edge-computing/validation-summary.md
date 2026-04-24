# Validation Summary: How to Set Up Portainer for Retail Edge Computing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Agent and Edge Compute
- Docker
- Docker Compose / Compose specification
- Portainer REST API

## Sources Consulted
- Portainer install docs for Docker Standalone: https://docs.portainer.io/start/install/server/docker/linux
- Portainer Edge Compute settings: https://docs.portainer.io/admin/settings/edge
- Portainer Edge Agent on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer Edge Groups: https://docs.portainer.io/user/edge/groups
- Portainer Edge Stacks: https://docs.portainer.io/user/edge/stacks/add
- Portainer Edge Jobs: https://docs.portainer.io/user/edge/jobs
- Portainer Edge Agent internals: https://docs.portainer.io/advanced/edge-agent
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer Edge Agent upgrade guidance: https://docs.portainer.io/start/upgrade/edge
- Official Portainer image tags: https://hub.docker.com/r/portainer/portainer-ee/tags
- Official Portainer Agent image tags: https://hub.docker.com/r/portainer/agent/tags
- Docker `image prune` reference: https://docs.docker.com/reference/cli/docker/image/prune/
- Docker `system df` reference: https://docs.docker.com/reference/cli/docker/system/df/
- Docker Compose top-level `version` reference: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Portainer server `docker run` example had invalid shell syntax because it placed an inline comment after a line-continuation backslash. I removed the inline comment so the command can be pasted into `bash` as written.
- The post used floating `latest` tags for both `portainer/portainer-ee` and `portainer/agent`. I changed both to matching `lts` tags to avoid version drift and to align with Portainer's documented guidance that the agent version must match the server version.
- The post went straight into Edge Groups / Edge Stacks / Edge Jobs without mentioning that Edge Compute must be enabled and configured first. I added the missing note to enable Edge Compute and set the API/tunnel addresses in Portainer settings.
- The Edge Agent enrollment command was incomplete for current Portainer guidance. I added the documented `/:/host` and `portainer_agent_data:/data` mounts and updated the container name to match Portainer's current convention.
- The original Edge Agent example set `EDGE_INSECURE_POLL=0`, but the Step 1 Portainer install uses Portainer's default self-signed HTTPS certificate. I changed this to `EDGE_INSECURE_POLL=1` and added the caveat that it can be set back to `0` when using a trusted certificate.
- The Edge Stack example implied per-store unique values inside one shared stack by using `STORE_ID` and `DISPLAY_ID` placeholders without showing Portainer's device-specific configuration mechanism. I changed the example to group-level variables that Portainer's documented stack environment-variable flow supports directly.
- The Compose example used the top-level `version` field. I removed it because current Docker Compose documentation marks that field as obsolete.
- The maintenance script said it would clean up unused images, but `docker image prune -f --filter "until=24h"` only removes dangling images. I changed the command to `docker image prune -a -f --filter "until=24h"` so the command matches the explanation.
- The monitoring section described a single Edge dashboard exposing heartbeat time, health status, and pending updates exactly as written. I reworded this to match Portainer's documented environment/snapshot, container, and update-status views.

## Review Notes
- Portainer Edge Jobs are currently documented as a beta feature and only available for Docker Standalone environments that use `/etc/cron.d` for scheduling.
- If the intended production design needs store-specific configuration within one shared Edge Stack, use Portainer Edge Configurations or GitOps Edge configurations rather than plain stack-level environment variables.
