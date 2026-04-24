# Validation Summary: How to Set Up Portainer for Retail Edge Locations

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Edge Agent
- Portainer Edge Stacks
- Portainer Edge Jobs
- Docker Compose
- Docker CLI
- PostgreSQL
- Bash

## Sources Consulted
- Portainer Edge Stacks: https://docs.portainer.io/user/edge/stacks
- Add a new Edge Stack: https://docs.portainer.io/user/edge/stacks/add
- Portainer Edge Jobs: https://docs.portainer.io/user/edge/jobs
- Portainer Edge Agent overview: https://docs.portainer.io/advanced/edge-agent
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker `docker inspect` reference: https://docs.docker.com/reference/cli/docker/inspect/
- Docker `docker cp` reference: https://docs.docker.com/reference/cli/docker/container/cp/
- Docker filter commands reference: https://docs.docker.com/config/filter/
- PCI SSC FAQ on product compliance claims: https://www.pcisecuritystandards.org/faq/articles/Frequently_Asked_Question/does-pci-ssc-endorse-specific-products-to-meet-pci-dss-requirements/

## Issues Found
- The Compose example used a top-level `version: "3.8"` field, which Docker now documents as obsolete. I removed it so the stack reflects the current Compose Specification.
- The `inventory-service` used `DATABASE_URL=postgres://inventory:password@postgres:5432/inventory` while the PostgreSQL service configured `POSTGRES_PASSWORD=inventory_pw`. I corrected the database URL so the application credentials match the database configuration.
- Step 3 pointed readers to `Environments > [Store Environment] > Environment Variables`, but Portainer documents stack-scoped environment variables under the Edge Stack deployment flow, and this UI is a Business Edition feature. I updated the instructions to the correct Edge Stack location and noted the edition requirement.
- The Edge Job script wrote to `/var/signage/promotions.json` on the host even though Edge Jobs run on the underlying host, not inside the container, and the stack mounted the signage cache at `/var/signage/cache` inside the container. I changed the script to download to a host temp file, copy it into the running container with `docker cp`, and then reload the signage process.
- The Edge Job script assumed a container named `signage-player`, but Compose-managed containers are not guaranteed to use the bare service name. I updated the script to resolve the running container by the Compose service label before executing commands against it.
- The Edge Job script referenced `${STORE_ID}` directly even though Edge Job scripts do not inherit stack environment variables from the container. I updated the script to read `STORE_ID` from the running signage container's configured environment before downloading content.
- The security section framed the sample hardening settings as sufficient "for retail PCI-DSS compliance". PCI SSC explicitly notes that no single product or configuration by itself provides PCI DSS compliance. I changed the wording to "PCI-DSS hardening" to keep the claim technically accurate.

## Review Notes
- Portainer documents Edge Jobs as a beta feature and notes they are currently only available for Docker Standalone environments that use `/etc/cron.d`. The post now reflects the Docker Standalone requirement, but readers should still treat Edge Jobs as a feature with rollout limitations.
- Portainer's Edge Stack environment-variable UI is documented as a Business Edition feature. The rest of the Compose example remains broadly valid for Docker-based retail edge deployments.
