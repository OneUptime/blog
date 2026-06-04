# Validation Summary: How to Troubleshoot Docker Container Cannot Reach Internet

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker Engine
- Docker bridge networking
- Docker DNS configuration
- Linux IP forwarding
- iptables/NAT
- UFW and firewalld
- systemd Docker daemon proxy configuration
- Docker daemon JSON configuration

## Sources Consulted
- Docker Docs: Networking - https://docs.docker.com/network/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Docker with iptables - https://docs.docker.com/engine/network/firewall-iptables/
- Docker Docs: Packet filtering and firewalls - https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Docs: Docker daemon configuration overview - https://docs.docker.com/engine/daemon/
- Docker Docs: dockerd CLI reference - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Troubleshooting the Docker daemon - https://docs.docker.com/engine/daemon/troubleshoot/
- Docker Docs: Daemon proxy configuration - https://docs.docker.com/engine/daemon/proxy/
- Docker Docs: Use a proxy server with the Docker CLI - https://docs.docker.com/engine/cli/proxy/
- Local Docker CLI help for `docker run`, `docker inspect`, `docker network create`, and `dockerd`

## Issues Found
- The post implied that `internal: true` would be visible from `docker inspect my-container --format '{{.HostConfig.NetworkMode}}'`. Updated Step 7 to inspect the Docker network's `Internal` property directly and clarified that isolation applies when the container is attached only to internal networks.
- The proxy section blurred daemon proxy settings with container outbound proxy settings. Updated the wording to clarify that daemon proxy settings affect daemon operations such as image pulls and pushes, while containers need proxy environment variables for their own outbound HTTP/HTTPS traffic.
- The subnet conflict fix used `default-address-pools` after checking the built-in `bridge` network. Docker's default `docker0` bridge address is configured with `bip`, while `default-address-pools` applies to automatic subnet allocation for newly created user-defined networks. Updated the JSON example to use `bip` and added a note for user-defined networks.

## Review Notes
The remaining Docker commands, daemon JSON keys, DNS examples, IP forwarding checks, iptables/NAT guidance, and systemd proxy override commands are technically valid for Docker Engine on Linux. The UFW and firewalld sections are reasonable troubleshooting guidance, but firewall behavior can vary by distribution, Docker firewall backend, and whether Docker is using iptables or nftables.
