# Validation Summary: How to Expose Docker Container Ports on IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker Compose
- IPv6
- Port publishing
- `userland-proxy`

## Sources Consulted
- Docker Docs, Port publishing and mapping: https://docs.docker.com/engine/network/port-publishing/
- Docker Docs, Use IPv6 networking: https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs, Define services in Docker Compose (`ports`): https://docs.docker.com/reference/compose-file/services/
- Docker Docs, `dockerd` CLI reference: https://docs.docker.com/reference/cli/dockerd/
- Docker Docs, Bridge network driver: https://docs.docker.com/network/drivers/bridge/
- Docker Docs, `docker container port` CLI reference: https://docs.docker.com/reference/cli/docker/container/port/
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849

## Issues Found
- The introduction said ports bind to both IPv4 and IPv6 "when IPv6 is enabled," but Docker's current docs describe the default behavior more precisely as publishing to all host addresses when no host address is specified. I updated the wording and added the Linux-host scope from Docker's IPv6 documentation.
- The specific-address example used `2001:db8::1` as if it were directly runnable. That prefix is reserved for documentation, and the bind address must actually exist on the host. I added an inline note telling readers to replace it with an IPv6 address assigned to their host.
- The `userland-proxy` section overstated how published ports work by saying Docker uses the proxy for port binding and that disabling it makes Docker use `ip6tables` directly for IPv6. Docker's port-publishing docs describe published ports in terms of firewall/NAT rules, and specifically note the IPv6-to-IPv4 mapping behavior only for the `--userland-proxy=true` default on IPv4-only bridge networks. I corrected that explanation and the conclusion to match the docs.
- The code comment said "Verify with netstat" while the command used `ss`. I corrected the comment so it matches the command shown.

## Review Notes
- The examples are accurate for current Docker Engine behavior, but exact `docker port` and `ss` output can vary depending on daemon settings, bridge network mode, and whether `userland-proxy` is enabled.
- Docker's IPv6 documentation states that IPv6 networking support is for Docker daemons running on Linux hosts.
- Runtime verification was not possible in this environment because `docker` and `dockerd` are not installed.
