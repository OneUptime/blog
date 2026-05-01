# Validation Summary: How to Understand Docker Bridge Networking in Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Docker Engine
- Docker Compose
- Portainer
- Docker bridge networking
- Container DNS and service discovery

## Sources Consulted
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Networking overview - https://docs.docker.com/engine/network/
- Docker Docs: `docker network create` - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: Docker with iptables - https://docs.docker.com/engine/network/firewall-iptables/
- Docker Docs: Compose file `version` and `name` - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose file `networks` - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Compose file `services` - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Networking in Compose - https://docs.docker.com/compose/how-tos/networking/
- Portainer Docs: Add a new network - https://docs.portainer.io/user/docker/networks/add
- Portainer Docs: Networks - https://docs.portainer.io/user/docker/networks
- Portainer Docs: View a container's details - https://docs.portainer.io/user/docker/containers/view
- Portainer Docs: Advanced container settings - https://docs.portainer.io/user/docker/containers/advanced

## Issues Found
- The Compose example used the top-level `version: "3.8"` field. I removed it because the current Compose spec marks `version` as obsolete and Compose now always uses the latest schema.
- The default bridge comparison said "NO DNS". I corrected this to match Docker's documented behavior: the default bridge does not provide automatic name resolution, but legacy `--link` can still create name-based access.
- The DNS section claimed multi-word names map to underscores or hyphens depending on how the container was created. I replaced that with the documented and reliable behavior: use the Compose service name or a configured network alias.
- The isolation example described the application tier as isolated from public even though the `api` service is attached to the `public` network. I corrected the description to reflect that it bridges the public and internal tiers.
- The `internal: true` example described the network as "truly isolated". I corrected this because Docker documents `internal` networks as externally isolated, while host-to-container communication can still be possible.
- The troubleshooting section checked `iptables` from inside a container. I moved that command to the host because Docker's bridge-network firewall rules are created in the host network namespace.
- The troubleshooting section used `brctl show`, which is not the best current example. I replaced it with `ip link show type bridge` as a host-side bridge inspection command.
- The MTU and IP masquerade comments were too broad. I updated them to note that jumbo-frame MTU settings require underlying network support and that IP masquerading applies to outbound container traffic, not specifically container-to-host traffic.
- The DNS/connectivity troubleshooting examples now note when `nslookup`, `ping`, or `nc` must exist inside the container image, since those tools are not guaranteed to be present in minimal images.

## Review Notes
- Docker CLI was not installed in this workspace, so command behavior was verified against official Docker and Portainer documentation rather than local `docker ... --help` output.
- The `docker0` bridge discussion is accurate for Docker Engine on Linux. Docker Desktop environments abstract this behind their VM layer.
