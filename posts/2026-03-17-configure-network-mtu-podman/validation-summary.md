# Validation Summary: How to Configure Network MTU for Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container networking
- Linux MTU configuration
- Linux `ip` and `ping` diagnostics
- Alpine Linux package installation

## Sources Consulted
- Podman `network create` official documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `network inspect` official documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html
- Podman `run` official documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Ubuntu/iputils `ping` man page: https://manpages.ubuntu.com/manpages/questing/man8/ping4.8.html

## Issues Found
- The post ran `ip link` and `ping -M do` inside `docker.io/library/nginx:alpine`, but that image does not reliably include the required `iproute2` and `iputils` tools. Added an `apk add --no-cache iproute2 iputils` command after starting the container.
- The fragmentation test used a hard-coded gateway address, `10.89.0.1`, which may not match the subnet Podman assigns to `vpn-net`. Changed the example to read the gateway from `podman network inspect vpn-net --format "{{range .Subnets}}{{.Gateway}}{{end}}"` before running `ping`.

## Review Notes
The `podman network create --opt mtu=...` examples match current Podman documentation. The `ping -s 1372` example is appropriate for testing a 1400-byte IPv4 MTU because `ping -s` specifies ICMP payload size and IPv4 plus ICMP headers add 28 bytes.
