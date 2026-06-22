# Validation Summary: How to Fix Docker DNS Resolution Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker Engine networking
- Docker embedded DNS
- Docker Compose networking
- Docker daemon configuration
- CoreDNS
- Linux DNS resolver configuration

## Sources Consulted
- Docker Docs: Networking overview, https://docs.docker.com/engine/network/
- Docker Docs: Bridge network driver, https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Docker daemon troubleshooting DNS configuration, https://docs.docker.com/engine/daemon/troubleshoot/
- Docker Docs: dockerd CLI reference, https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: docker container run CLI reference, https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Docker Compose services reference, https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Docker Compose networking, https://docs.docker.com/compose/how-tos/networking/
- Docker Docs: Compose version top-level element, https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: docker network inspect CLI reference, https://docs.docker.com/reference/cli/docker/network/inspect/
- CoreDNS manual: Configuration, https://coredns.io/manual/configuration/
- CoreDNS plugin docs: forward, cache, and log plugins, https://coredns.io/plugins/forward/, https://coredns.io/plugins/cache/, https://coredns.io/plugins/log/

## Issues Found
- The first `/etc/resolv.conf` example claimed to show output on a user-defined network, but the command used Docker's default bridge network. Updated the command to create and use `mynetwork` so the documented `127.0.0.11` embedded DNS output matches Docker's documented behavior.
- Several `daemon.json` snippets included `//` comments inside `json` code blocks, which would make the copied configuration invalid JSON. Moved the file path notes outside the JSON blocks.
- Compose examples used the obsolete top-level `version` field. Removed it so the examples match the current Compose Specification guidance.
- The embedded DNS debugging section implied Docker's embedded DNS had container logs available through `docker logs`. Reworded the note and changed the example to `docker compose logs dns` for a user-run custom DNS service.

## Review Notes
The main Docker DNS behavior described in the post is accurate: user-defined networks use Docker's embedded DNS server at `127.0.0.11`, default bridge containers do not get automatic name resolution, Compose services are discoverable by service name on the default network, and Docker daemon/container/Compose DNS settings use the documented fields and flags. The corporate DNS fallback examples are generally valid, but real split-DNS environments may require domain-specific forwarding in an internal resolver rather than relying only on resolver fallback order.
