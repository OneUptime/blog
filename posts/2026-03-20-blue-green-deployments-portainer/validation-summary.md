# Validation Summary: How to Implement Blue-Green Deployments with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- Traefik
- Bash
- Blue-green deployment

## Sources Consulted
- Docker Docs: Version and name top-level elements. https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Define and manage networks in Docker Compose. https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Networking overview. https://docs.docker.com/network/
- Docker Docs: Docker object labels. https://docs.docker.com/engine/manage-resources/labels/
- Docker Docs: docker container update. https://docs.docker.com/reference/cli/docker/container/update/
- Traefik Docs: Traefik & Docker. https://doc.traefik.io/traefik/v3.1/providers/docker/
- Traefik Docs: Traefik & File. https://doc.traefik.io/traefik/v3.4/providers/file/
- Portainer Docs: Add a new stack. https://docs.portainer.io/user/docker/stacks/add
- Portainer Docs: Stack webhooks. https://docs.portainer.io/user/docker/stacks/webhooks

## Issues Found
1. The original Traefik setup disabled `app_green` with `traefik.enable=false` while also claiming Green could still be tested through Traefik. With `exposedByDefault=false`, Traefik ignores containers that are not enabled. I replaced the label-switching approach with a Traefik file-provider routing file so both environments stay reachable and production traffic can switch cleanly.
2. The original traffic-switch and rollback scripts depended on changing container labels at runtime using unsupported commands and options, including `docker label` and `docker update --label-add` for containers. I rewrote those scripts to update the watched Traefik routing file instead.
3. The original automated deployment script recreated containers outside the Portainer-managed stack. That would drift from the stack definition and undermine Portainer-based management. I changed the deployment flow to use a Portainer stack webhook with `GREEN_IMAGE_TAG`, which matches Portainer's documented webhook behavior.
4. The original compose snippet used the obsolete top-level `version` field. I removed it to align the example with current Compose behavior.
5. The original compose file referenced an external `public` network without telling readers to create it first. I added the required host-side setup step and the routing-file creation step.
6. The original webhook section omitted that stack webhooks are only available in Portainer Business Edition on non-Edge environments. I added that constraint.

## Review Notes
- The example still exposes the Traefik dashboard with `--api.insecure=true` on port `8080` for simplicity. That is acceptable for a demo, but it should not be exposed publicly in production without proper access controls.
- The example pins `traefik:v3.0`. The tag is still valid, but newer v3 releases exist and could be evaluated in a future refresh.
