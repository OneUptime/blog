# Validation Summary: How to Set Up IPv6 for Containers in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker Compose / Compose Specification
- Portainer
- IPv6 networking
- Linux networking (`sysctl`, `ip neigh`)

## Sources Consulted
- Docker Docs: Use IPv6 networking - https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: Networking overview - https://docs.docker.com/engine/network/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: Define and manage networks in Docker Compose - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Define services in Docker Compose - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: docker inspect - https://docs.docker.com/reference/cli/docker/inspect/
- Portainer Docs: Add a new stack - https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer Docs: Inspect a container - https://docs.portainer.io/user/docker/containers/inspect
- Portainer Docs: Advanced container settings - https://docs.portainer.io/user/docker/containers/advanced
- Linux Kernel Documentation: IP Sysctl (`proxy_ndp`) - https://docs.kernel.org/5.10/networking/ip-sysctl.html
- man7: `ip-neighbour(8)` - https://man7.org/linux/man-pages/man8/ip-neighbour.8.html

## Issues Found
- The original `daemon.json` example was not valid JSON because it included an inline comment. I removed the comment and kept only the relevant IPv6 settings so the snippet matches Docker's documented daemon configuration format.
- The original post implied daemon-level IPv6 enablement was required for the Portainer stack flow. I corrected this by making the daemon step optional for the default bridge and noting that Docker's native IPv6 container networking is supported on Linux hosts.
- The example reused overlapping IPv6 subnets (`fd00::/80`) for both the default bridge and the user-defined bridge network. I changed the examples to distinct `/64` ULA prefixes (`fd00:1::/64` and `fd00:2::/64`) to avoid routing/address conflicts and align with current Docker guidance.
- The Compose example used the obsolete top-level `version` field. I removed it because current Compose uses the Compose Specification and Docker documents `version` as obsolete.
- The Compose example defined `DB_HOST` twice with different values. I removed the conflicting duplicate and kept the Docker DNS-based hostname example.
- The CLI-created network in Step 2 and the Portainer-created network in Step 3 were inconsistent. I aligned them by naming the stack network `dual_stack_net` and clarifying that Step 2 should be skipped if Portainer is creating that network.
- The original test commands relied on utilities that are not guaranteed to exist in `nginx:alpine` or an arbitrary application image (`ip`, `curl`, `ss`, `ping6`, `nslookup`). I replaced them with host-side `docker inspect` and a temporary Alpine diagnostic container that installs the required tools explicitly.
- The original `curl` test targeted an undefined API port/path (`http://[fd00::20]:8080/health`). I removed that check because it depended on application-specific behavior that was not defined by the sample stack.
- The original IPv6 exposure example mixed alternative port-publishing patterns into one `ports` list. I simplified it to a single `80:80` mapping, which Docker documents as publishing on the host's IPv4 and IPv6 addresses by default.
- The original public IPv6/NDP proxy section suggested that NDP proxy alone would make a container publicly reachable. I corrected this to Docker's documented routed IPv6 bridge mode, added the required upstream routing caveat, and kept NDP proxy as one environment-specific way to advertise addresses on a directly connected L2 network.
- The conclusion overstated IPv6 behavior by implying Docker IPv6 always gives globally routable addresses. I corrected that to apply only when a routed public prefix is used.

## Review Notes
- Docker's documented IPv6 container networking support applies to Linux hosts.
- Direct public IPv6 reachability on a Docker bridge network requires upstream routing to the container prefix through the Docker host; NDP proxy is only one possible mechanism on directly connected L2 networks.
- Direct access to a container's own IPv6 address requires the application inside the container to listen on IPv6.
