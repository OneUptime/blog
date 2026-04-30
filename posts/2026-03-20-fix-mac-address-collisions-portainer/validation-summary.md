# Validation Summary: How to Fix MAC Address Collisions in Docker Compose via Portainer

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Docker macvlan networking
- Python 3
- MAC addressing

## Sources Consulted
- Docker Docs, Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Docs, Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Docs, macvlan network driver: https://docs.docker.com/engine/network/drivers/macvlan/
- Docker Docs, `docker system events`: https://docs.docker.com/reference/cli/docker/system/events/
- Docker Docs, `docker network inspect`: https://docs.docker.com/reference/cli/docker/network/inspect/
- Docker Docs, `docker compose down`: https://docs.docker.com/reference/cli/docker/compose/down/
- Docker Docs, `docker compose up`: https://docs.docker.com/reference/cli/docker/compose/up/
- Portainer Docs, add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer Docs, inspect or edit a stack: https://docs.portainer.io/2.21/user/docker/stacks/edit
- RFC 7042, IEEE 802 MAC address local/administered bit semantics: https://www.rfc-editor.org/rfc/rfc7042

## Issues Found
- The post claimed Docker's random MAC generation was a common collision source. I removed that claim because the Docker documentation reviewed here does not document random MAC generation as the normal cause of collisions; duplicated static assignments and cloned host/network state were the supported causes.
- The diagnostic example inspected the default `bridge` network even though the article is about `macvlan` stacks. I changed the example to inspect the actual stack network name and made the Python loop tolerate networks with no attached containers.
- The Portainer log example assumed the container was always named `portainer`. I kept the command but added a note to replace the name if the installation uses a different container name.
- The section titled `Fixing Macvlan IP/MAC Pool Exhaustion` incorrectly said Docker supports defining both IP and MAC ranges for macvlan. I corrected this to IP allocation range overlap, because the documented Compose/macvlan configuration supports `ip_range` and related IPAM settings, not a configurable MAC pool range.
- The cloned-host remediation instructed readers to delete `/var/lib/docker/network/files/*`. I replaced that with updating duplicated static addresses and redeploying the stack, because deleting Docker's internal network state is not documented here as a supported fix and is riskier than necessary.

## Review Notes
- `services.<name>.networks.<network>.mac_address` is documented in current Compose and is the safer form for this topic. Docker Docs also note that service-level `mac_address` can be rejected by Docker Engine `v25.0` and later.
- The Python MAC generator snippet is syntactically valid and correctly sets the locally administered unicast bit pattern.
