# Validation Summary: How to Attach Containers to Multiple Networks in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine networking
- Docker Compose
- PostgreSQL Docker Official Image
- Nginx
- Redis
- `jq`

## Sources Consulted
- Portainer documentation: Add a new container - https://docs.portainer.io/sts/user/docker/containers/add
- Portainer documentation: Advanced container settings - https://docs.portainer.io/sts/user/docker/containers/advanced
- Portainer documentation: View a container's details - https://docs.portainer.io/user/docker/containers/view
- Portainer documentation: Add a new network - https://docs.portainer.io/user/docker/networks/add
- Docker CLI reference: `docker network create` - https://docs.docker.com/reference/cli/docker/network/create/
- Docker CLI reference: `docker network connect` - https://docs.docker.com/reference/cli/docker/network/connect/
- Docker CLI reference: `docker network disconnect` - https://docs.docker.com/reference/cli/docker/network/disconnect/
- Docker Compose file reference: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose file reference: Networks - https://docs.docker.com/reference/compose-file/networks/
- Docker Compose file reference: Services - https://docs.docker.com/reference/compose-file/services/
- PostgreSQL Docker Official Image - https://hub.docker.com/_/postgres

## Issues Found
- The introduction described a multi-homed container as a bridge between network segments, which is misleading because attaching a container to multiple networks does not make it a Layer 2 or Layer 3 bridge by itself. I changed the wording to say the container spans multiple networks.
- Step 1 said all three example networks were isolated, but only the networks created with `--internal` are externally isolated. I corrected the wording so the command comments match Docker's documented behavior.
- Step 2 described a Portainer `+Add network` flow during standalone container creation. Current Portainer docs describe selecting a single network in the advanced network settings when creating a container, then attaching additional networks afterward. I updated the steps and note accordingly.
- The Compose example used the obsolete top-level `version` field. I removed it to match the current Compose Specification behavior.
- The Compose example's `DATABASE_URL` did not match the PostgreSQL container's configured user and database. I aligned the API connection string with `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`.
- The internal-network comments implied a blanket lack of internet access. I changed them to "externally isolated network", which matches Docker's terminology more closely.
- The sample `docker inspect --format` output implied a fixed network-name order. I changed the comment to make it clear the displayed order can vary.

## Review Notes
- Portainer's docs explicitly describe attached networks on the container details page and the "Enable manual container attachment" network option, but the exact button labels in the UI can vary slightly between releases. The post now uses wording that stays accurate across current versions.
- Command and configuration syntax was verified against current official documentation. The commands were not executed in this workspace because Docker is not installed here.
