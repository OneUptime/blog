# Validation Summary: How to Fix Port Mapping Errors When Editing Containers in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose / Compose YAML
- Linux networking tools (`ss`, `lsof`, `fuser`, `ip`)
- Linux TCP/sysctl behavior

## Sources Consulted
- Portainer Documentation, "Edit or duplicate a container" - https://docs.portainer.io/user/docker/containers/edit
- Portainer Documentation, "Add a new container" - https://docs.portainer.io/user/docker/containers/add
- Portainer Documentation, "Inspect or edit a stack" - https://docs.portainer.io/user/docker/stacks/edit
- Docker Docs, "Port publishing and mapping" - https://docs.docker.com/engine/network/port-publishing/
- Docker Docs, "docker container run" - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs, "Define services in Docker Compose" - https://docs.docker.com/reference/compose-file/services/
- Linux manual page, `fuser(1)` - https://man7.org/linux/man-pages/man1/fuser.1.html
- Linux manual page, `ip-address(8)` - https://man7.org/linux/man-pages/man8/ip-address.8.html
- Linux kernel documentation, "IP Sysctl" - https://docs.kernel.org/6.18/networking/ip-sysctl.html
- Local CLI help output for `ss`, `fuser`, `ip`, and `sysctl`

## Issues Found
- The post said the "address already in use" case was specifically caused by a non-Docker process. I corrected this to the broader and accurate condition: another process already bound to the requested host IP and port.
- The `ps -p $(sudo fuser ...)` example was not reliable when `fuser` returned multiple PIDs. I changed it to `ps -fp $(sudo fuser 8080/tcp 2>/dev/null)`, which works with space-separated PID output.
- The invalid-port section implied entering host port `0` was the way to express a random host port. I corrected this to Portainer's actual behavior: use the random host port option instead.
- The invalid-port section used a vague "mixing protocol types incorrectly" example. I replaced it with mismatched port ranges, which is a concrete documented Docker/Compose error condition.
- The IP-checking command claimed to list all host IPs while filtering only `inet` lines. I corrected it to `ip addr show`, which matches the claim and includes both IPv4 and IPv6 addresses.
- The `TIME_WAIT` section was technically misleading. Linux socket and kernel docs indicate `TIME_WAIT` reuse tuning is about connection reuse, while bind failures are caused by an active listening socket. I replaced that section with guidance to re-check for an active listener and removed the recommendation to change `net.ipv4.tcp_tw_reuse`.
- The Portainer edit workflow omitted the documented **Replace** confirmation step after **Deploy the container**. I added it.
- The stack-editing note was too broad. I corrected it to reflect Portainer's documented behavior: direct editing is available for Web Editor/uploaded stacks, while Git-deployed stacks must be edited in the repository or detached first.

## Review Notes
- Docker publishes to all interfaces by default when no host IP is specified. Using `0.0.0.0` explicitly keeps the post accurate for IPv4, but omitting the host IP is the normal default behavior.
- Portainer's random-host-port behavior is exposed through a UI toggle rather than by entering `0` in a host port field.
- No additional technical issues were found after these corrections.
