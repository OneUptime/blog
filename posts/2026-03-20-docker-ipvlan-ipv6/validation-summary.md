# Validation Summary: How to Configure Docker IPvlan Networks with IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Engine networking
- Docker IPvlan driver
- Docker Compose networking
- IPv6
- Linux `iproute2` / `ip link`
- Macvlan

## Sources Consulted
- Docker IPvlan network driver: https://docs.docker.com/engine/network/drivers/ipvlan/
- Docker `docker network create` reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker `docker inspect` reference: https://docs.docker.com/reference/cli/docker/inspect/
- Docker IPv6 networking: https://docs.docker.com/engine/daemon/ipv6/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose services reference (`ipv6_address`): https://docs.docker.com/reference/compose-file/services/
- Docker Macvlan network driver: https://docs.docker.com/engine/network/drivers/macvlan/
- Linux kernel IPVLAN HOWTO: https://docs.kernel.org/networking/ipvlan.html
- `ip-link(8)` manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Docker Official Image metadata for `nginx:latest`: https://raw.githubusercontent.com/docker-library/repo-info/master/repos/nginx/local/latest.md

## Issues Found
- The example IPv6 literals used invalid hextets such as `2001:db8:lan::/64` and `2001:db8:containers::/64`. I replaced them with valid documentation prefixes such as `2001:db8:1::/64` and `2001:db8:100::/64`.
- The post claimed internet reachability while using the `2001:db8::/32` documentation prefix. I added explicit notes that readers must replace that prefix with a real IPv6 prefix in production.
- The container-to-container test targeted `2001:db8:...::31`, but the post only created one L2 container. I added a second L2 container so the test has a real target.
- The verification commands used `ip` and `ping6` inside `nginx:latest`, but the official image metadata shows `curl` is present while the post did not establish availability of `iproute2`/`iputils` tooling. I replaced those checks with `docker inspect` and `curl`-based commands that match the documented image contents and Docker CLI behavior.
- The host-side IPvlan example reused the subnet gateway address on `ipvlan-host`, which would conflict with the router/gateway if that address is already in use. I changed it to use an unused IPv6 address in the subnet.
- The host-side `ip link add` example used a non-canonical argument order. I changed it to `ip link add link eth0 name ipvlan-host type ipvlan mode l2`, matching the documented syntax.

## Review Notes
- Docker's IPv6 networking support and the IPvlan/macvlan drivers discussed here apply to Linux hosts.
- Docker's IPvlan L3 examples require upstream route distribution; the post now reflects that accurately.
- The `2001:db8::/32` prefix is correct for documentation examples, but it is not suitable for public internet routing.
