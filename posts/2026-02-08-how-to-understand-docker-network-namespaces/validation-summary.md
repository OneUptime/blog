# Validation Summary: How to Understand Docker Network Namespaces

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker
- Linux network namespaces
- iproute2 `ip netns`
- `nsenter`
- Linux virtual Ethernet devices and bridge networking
- Docker bridge, host, and container network modes
- DNS resolution in Docker containers

## Sources Consulted
- Linux `network_namespaces(7)` manual page: https://man7.org/linux/man-pages/man7/network_namespaces.7.html
- Docker networking overview: https://docs.docker.com/engine/network/
- Docker host network driver documentation: https://docs.docker.com/engine/network/drivers/host/
- Michael Kerrisk, "Containers in less than 100 lines of shell" slides, for `ip netns` bind-mount behavior: https://www.man7.org/conf/ndcsecurity2025/Containers_in_100_lines_of_shell--NDC-Security-2025-Kerrisk.pdf
- Local `ip netns help` output
- Local `nsenter --help` output
- Local `docker run --help` output

## Issues Found
- The introduction said each Docker container gets its own network namespace. This is true for default isolated networking but not for host networking or `--network container:<name|id>`, so the wording now says "By default" and qualifies Docker-created namespaces as applying to containers that use isolated networking.
- The post used a symbolic link in `/var/run/netns/` to make a Docker namespace visible to `ip netns`. `ip netns` conventionally uses a bind mount under `/var/run/netns/`, so the commands now create a mount point with `touch` and use `mount --bind`.
- The DNS setup step said Docker usually configures `127.0.0.11`. Docker's embedded DNS server is used for custom networks, while containers on the default bridge receive a copy of the host's `/etc/resolv.conf`, so the wording now distinguishes those cases.
- The namespace lifecycle section described `/var/run/netns/` references as stale links. With the corrected bind-mount approach, the mount can keep the namespace alive until removed, so the cleanup guidance now uses `ip netns del`.
- The debugging command `nsenter ... nslookup google.com 127.0.0.11` assumed embedded DNS would exist for the default-bridge demo container. It now uses `getent hosts google.com` to test DNS lookup traffic from the namespace with the host resolver configuration.

## Review Notes
The examples assume a Linux Docker Engine host with Docker's default bridge present as `docker0`, iproute2 installed, and sufficient privileges for namespace and link manipulation. Host networking behavior on Docker Desktop has platform-specific limitations noted in Docker's current documentation.
