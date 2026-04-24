# Validation Summary: How to Set Up Container-to-Container Communication in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer stacks
- Docker Compose networking
- Docker bridge networks
- Docker overlay networks
- Docker Swarm service discovery
- Docker CLI networking and container inspection commands

## Sources Consulted
- Docker Compose networking docs: https://docs.docker.com/compose/how-tos/networking/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose `version` top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker overlay network driver docs: https://docs.docker.com/engine/network/drivers/overlay/
- Docker `docker network create` CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker `docker exec` CLI reference: https://docs.docker.com/reference/cli/docker/container/exec/
- Portainer stacks docs: https://docs.portainer.io/user/docker/stacks
- Portainer networks docs: https://docs.portainer.io/sts/user/docker/networks

## Issues Found
- The opening explanation generalized hostname-based discovery too broadly. I scoped it to Portainer-managed Compose stacks, where Docker's embedded DNS on the stack network provides service-name resolution.
- The same-stack Compose example used the top-level `version` key. Current Docker Compose documentation marks `version` as obsolete, so I removed it.
- The post said the default network is named `{stack-name}_default` as an absolute rule. I corrected this to say it is typically named that way, since Compose network naming is project-based and can be customized.
- The cross-stack section described the pattern as an "external named network" even though the first stack creates the network and the second references it as external. I changed the wording to describe it accurately as a shared named network with external reuse from the second stack.
- The communication-patterns table incorrectly said "Same stack, different compose files" for the external-network case. I corrected it to "Different stacks / different Compose projects".
- The connectivity test section implied the example commands would always work inside the target containers. I added a note that the examples assume `nslookup`, `nc`, and `curl` are available in the image.

## Review Notes
- If you want the shared cross-stack network lifecycle to be independent of either stack, create the network separately first, then declare `external: true` in both stacks.
- The Swarm section is technically correct, but service-name resolution on Swarm uses the swarm service discovery model rather than standalone container-to-container DNS behavior.
