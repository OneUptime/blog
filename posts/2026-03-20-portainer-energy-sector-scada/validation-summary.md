# Validation Summary: How to Set Up Portainer for Energy Sector SCADA Systems

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Agent
- Portainer Edge Stacks
- Portainer API
- Docker Engine
- Docker Compose / Compose Specification
- Docker Registry
- TimescaleDB
- PostgreSQL container initialization

## Sources Consulted
- Portainer Docs: Using your own SSL certificate with Portainer - https://docs.portainer.io/advanced/ssl
- Portainer Docs: The Portainer Edge Agent - https://docs.portainer.io/advanced/edge-agent
- Portainer Docs: Install Edge Agent Standard on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer Docs: API documentation - https://docs.portainer.io/api/docs
- Portainer OpenAPI spec (BE 2.39.1) - https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer Docs: Add a new Edge Stack - https://docs.portainer.io/user/edge/stacks/add
- Docker Docs: Mirror the Docker Hub library - https://docs.docker.com/docker-hub/image-library/mirror/
- Docker Docs: Secrets in Compose - https://docs.docker.com/compose/how-tos/use-secrets/
- Docker Docs: Secrets top-level element - https://docs.docker.com/reference/compose-file/secrets/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Official Image Docs: Postgres - https://hub.docker.com/_/postgres
- Timescale Docs: Install TimescaleDB from a Docker container - https://docs.timescale.com/self-hosted/latest/install/installation-docker/
- Docker Hub: timescale/timescaledb image tags - https://hub.docker.com/r/timescale/timescaledb

## Issues Found
- The Portainer server install command was incomplete and outdated for the documented TLS setup. It was missing the Docker socket mount and the certificate bind mount, used `:latest` instead of a supported channel tag, and included the deprecated `--ssl` flag. I updated the command to match current Portainer installation guidance for custom certificates.
- The firewall guidance was incorrect. Edge environments do not use only port `8000`; the Edge Agent polls the Portainer API on `9443` and opens the reverse tunnel on `8000` when required. I corrected the text to reflect OT-initiated outbound access to both ports and clarified that IT must not initiate sessions into OT.
- The article referred to a "registry mirror" but the command deployed a plain Docker registry. Docker's mirror mode requires pull-through cache configuration with `proxy.remoteurl`. I changed the wording to "local registry" so the command and explanation match.
- The Edge Agent enrollment example did not match Portainer's documented standalone deployment. It used an arbitrary `EDGE_ID`, omitted the required host and Docker volume mounts, and used an unpinned `latest` tag. I updated the command to use the Portainer-generated `EDGE_ID` and `EDGE_KEY`, added the documented mounts, aligned the image to `:lts`, and noted the self-signed certificate requirement for `EDGE_INSECURE_POLL=1`.
- The Compose example used the obsolete top-level `version` field. I removed it to match the current Compose Specification guidance.
- The historian service referenced `POSTGRES_PASSWORD_FILE` without defining or granting a secret. I added a Compose secret, mounted it into the service, and documented that the password must be provided as a Portainer stack environment variable before deployment.
- The TimescaleDB image reference used a tag pattern that does not match the official image naming guidance. I changed it to the official `latest-pg14` tag format under the internal registry path.
- The Portainer API example used the wrong path and an authentication pattern that was not aligned with Portainer's documented API token usage. I changed `/api/edge/stacks` to `/api/edge_stacks`, added the supported `summarizeStatuses=true` query parameter, and switched the example to the documented `X-API-Key` header.

## Review Notes
- The local registry example is technically valid, but it is a basic private registry only. If the environment requires a true pull-through mirror or authenticated/TLS-protected registry access, that would need additional Docker Registry configuration beyond what the post currently shows.
- The `modbus-gateway` container image and its application-specific environment variables are custom examples rather than vendor-documented Portainer or Docker interfaces, so review focused on the surrounding Docker and Portainer mechanics.
- The post now aligns with current Portainer documentation as of 2026-04-24, but Portainer recommends keeping server and agent versions aligned. If this post is revisited after a future Portainer release, the `:lts` channel references should be rechecked.
