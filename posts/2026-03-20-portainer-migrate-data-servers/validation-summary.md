# Validation Summary: How to Migrate Portainer Data Between Servers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Docker volumes
- Docker CLI
- `tar`
- `scp`
- `rsync`

## Sources Consulted
- Portainer Documentation: What does Portainer's backup include? https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer Documentation: Back up Portainer / restore behavior https://docs.portainer.io/admin/settings/general
- Portainer Documentation: Updating on Docker Standalone https://docs.portainer.io/start/upgrade/docker
- Portainer Documentation: Install Portainer CE with Docker on Linux https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer Documentation: How can I move existing Edge Agent deployments to a new Portainer Server instance? https://docs.portainer.io/faqs/troubleshooting/agents-and-environment-management/how-can-i-move-existing-edge-agent-deployments-to-a-new-portainer-server-instance
- Portainer Documentation: The Portainer Edge Agent https://docs.portainer.io/advanced/edge-agent
- Portainer Documentation: How do I remove Portainer? https://docs.portainer.io/faqs/installing/how-do-i-remove-portainer
- Docker Docs: Volumes https://docs.docker.com/engine/storage/volumes/
- Local CLI help: `scp` usage output, `rsync --help`, and GNU `tar --help`

## Issues Found
- The description and introduction overstated the migration scope by implying the move preserved "everything". Portainer documents that its backed-up `/data` content covers Portainer configuration and metadata, not the managed environments' containers or application data. I updated the description and intro to scope the migration correctly.
- The original text implied Edge-related state would carry over transparently. Portainer documents that if the Portainer server URL, IP, or DNS name changes, existing Edge Agent deployments must be redeployed because the server URL is encoded into the `EDGE_KEY`. I added that caveat to the introduction and the post-migration checklist.
- The deployment example used `portainer/portainer-ce:latest` and exposed `9000` by default. Current Portainer installation and update docs use explicit release tags such as `lts`/`sts`, default to `9443` and `8000`, and only add `9000` for legacy HTTP access. I changed the example to use a source-matching tag variable and removed the default `9000` mapping.

## Review Notes
- The tar-based named-volume backup and restore approach is technically reasonable and consistent with Docker's documented volume migration pattern, even though Portainer also provides a built-in backup and restore workflow through the UI.
- Docker is not installed in this review workspace, so the commands were not executed end-to-end here. Command syntax and behavior were checked against official Portainer and Docker documentation plus local CLI help where available.
