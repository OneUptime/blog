# Validation Summary: How to Migrate Portainer Data Between Servers - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Portainer HTTP API
- Portainer Agent
- Portainer Edge Agent
- DNS

## Sources Consulted
- Portainer documentation, "Back up Portainer" and restore workflow: https://docs.portainer.io/admin/settings/general
- Portainer documentation, "What does Portainer's backup include?": https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer documentation, "Install Portainer CE with Docker on Linux": https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer documentation, "Updating on Docker Standalone": https://docs.portainer.io/start/upgrade/docker
- Portainer documentation, "Install Portainer Agent on Docker Standalone": https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer documentation, "Portainer architecture": https://docs.portainer.io/start/architecture
- Portainer documentation, "How does Portainer secure connectivity to and from Agents and Edge Agents?": https://docs.portainer.io/faqs/getting-started/how-does-portainer-secure-connectivity-to-and-from-agents-and-edge-agents
- Portainer documentation, "How can I move existing Edge Agent deployments to a new Portainer Server instance?": https://docs.portainer.io/faqs/troubleshooting/agents-and-environment-management/how-can-i-move-existing-edge-agent-deployments-to-a-new-portainer-server-instance
- Portainer documentation, "API usage examples": https://docs.portainer.io/sts/api/examples
- Portainer API spec: https://raw.githubusercontent.com/portainer/portainer/master/api/swagger.yaml
- Docker documentation, "Bind mounts": https://docs.docker.com/engine/storage/bind-mounts/

## Issues Found
- The backup command mounted host `/tmp` at `/backup` but wrote the archive to the container's `/tmp`, so the backup file would be lost when the helper container exited. I changed the tar output path to `/backup/portainer-migration.tar.gz`.
- The post used `portainer/portainer-ce:latest` and `portainer/agent:latest`. I changed these to documented `:lts` examples and clarified that the destination should use the same Portainer image tag/version as the source server.
- The API examples used legacy HTTP on port `9000` as if it were the default access method. I updated the examples to use current HTTPS on port `9443` with `curl -k` for the default self-signed certificate.
- The environment URL section implied that a Portainer server IP/hostname change means the environment URLs themselves must be updated. I corrected this so the URL is only changed when the managed environment address changes or the new Portainer server must reach it through a different endpoint address.
- The classic Agent section incorrectly said that agents store the Portainer server address and need a new server URL after migration. I corrected this to reflect Portainer's documented model: the standard Agent listens on `9001`, Portainer connects to it, and a restored Portainer instance generally keeps working as long as reachability and any `AGENT_SECRET` configuration remain valid.
- The Edge Agent section was incomplete for server URL changes. I updated it to match Portainer's documented process: remove the existing Edge environment, recreate it to generate a new deployment command, then redeploy the Edge Agent.

## Review Notes
The guide now reflects current Portainer defaults around HTTPS on `9443`, but it still describes a direct archive-and-restore of the `/data` volume rather than Portainer's UI-driven backup/restore workflow. That approach is still aligned with Portainer's documented backup contents, but using the same Portainer version/channel during migration remains the safest path.
