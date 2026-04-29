# Validation Summary: How to Configure IPvlan L3 Mode for Container Routing in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Docker IPvlan networking
- Linux IP routing (`ip route`, `ip rule`)
- Linux packet filtering and NAT (`iptables`)
- Linux kernel IPv4 forwarding (`sysctl`)

## Sources Consulted
- Docker IPvlan network driver: https://docs.docker.com/engine/network/drivers/ipvlan/
- Docker `docker network create` reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose services reference (`ipv4_address`): https://docs.docker.com/reference/compose-file/services/
- Docker Compose top-level `version` reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Linux kernel IP sysctl documentation (`net.ipv4.ip_forward`): https://docs.kernel.org/6.4/networking/ip-sysctl.html
- Portainer networks documentation: https://docs.portainer.io/sts/user/docker/networks
- Portainer container details documentation: https://docs.portainer.io/user/docker/containers/view
- Portainer container statistics documentation: https://docs.portainer.io/user/docker/containers/stats
- Local command help checked for syntax: `ip route help`, `ip rule help`, `sysctl --help`, `iptables --help`

## Issues Found
- The introduction said the guide covered IPvlan L3 configuration "via Portainer", but the actual network creation and routing steps are Docker and host-level operations. I changed the wording to reflect Portainer’s real role here: deploying and monitoring containers on those networks.
- The L2 vs L3 comparison table described the IPvlan L3 container gateway as the "Host interface". Docker’s IPvlan L3 documentation shows that a traditional gateway is not used and the container route is a default route on its own interface (for example, `default dev eth0`). I corrected the table and later verification text to match that behavior.
- The pre-created Docker network names in Step 1 did not match the external network names used by the Compose example in Step 3. As written, the stack would fail to find the referenced networks. I aligned the Step 1 network names with the Compose network names.
- The Compose example used the top-level `version: "3.8"` field. Docker’s current Compose documentation marks `version` as obsolete and only informative. I removed it.
- The API service comment said the container "bridges frontend and backend". A multi-homed container does not automatically bridge traffic between networks; it is simply attached to both unless additional forwarding or proxy logic is configured. I corrected the wording.
- The routing notes implied that L3 containers use the host as a traditional gateway. Docker’s IPvlan L3 docs say the `--gateway` field is ignored and the default route points to the container interface. I corrected the note and the verification expectations, and added the missing upstream route-distribution caveat for direct routed external access.
- The isolation example appended `DROP` rules after earlier `ACCEPT` rules in the `FORWARD` chain. In that order, the `DROP` rules may never take effect. I changed the example to insert the `DROP` rules ahead of existing `ACCEPT` rules.
- The isolation note said the dual-homed API container could "bridge" the two networks. I corrected this to the accurate behavior: it can still communicate on both networks because it has an interface on each one.

## Review Notes
- The Compose example assumes the `frontend_l3` and `backend_l3` networks already exist with the matching subnets created in Step 1.
- Docker is not installed in this workspace, so the tutorial was validated against official Docker, Portainer, and Linux documentation plus local command help output, rather than by executing the Docker commands end to end.
