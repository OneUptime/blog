# Validation Summary: How to Use Docker Embedded DNS Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine networking
- Docker embedded DNS
- Docker bridge networks
- Docker CLI
- Docker Compose service discovery
- DNS search domains and TTL behavior
- CoreDNS / dnsmasq custom DNS patterns
- Java DNS caching behavior

## Sources Consulted
- Docker Docs: Networking overview - https://docs.docker.com/engine/network/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Docker container run CLI reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Networking in Compose - https://docs.docker.com/compose/how-tos/networking/
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Docker daemon configuration overview - https://docs.docker.com/engine/daemon/
- Oracle Java SE 23 API: java.net.InetAddress caching - https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/net/InetAddress.html
- Local Docker Engine 29.4.2 and Docker Compose v5.1.3 CLI behavior checks.

## Issues Found
- Fixed the Postgres container example so `-e POSTGRES_PASSWORD=secret` appears before the image name. Docker CLI options after the image name are treated as container command arguments, not `docker run` options.
- Replaced the claim that a shared Docker network alias performs round-robin load balancing. Docker/Compose documentation says shared aliases can resolve to more than one container, but the selected container is not guaranteed.
- Replaced the claim that Compose creates a stable `<project>_<service>` DNS alias. Current Compose documentation guarantees service-name discovery, and local Compose testing confirmed `database` resolves while `dnsreview_database` does not.
- Softened the Java DNS caching statement. Oracle documents cache-forever behavior when a security manager is installed and implementation-specific finite caching otherwise.
- Clarified Docker DNS TTL wording so applications do not assume Docker's TTL is the only caching policy involved.
- Corrected the custom DNS section to note that a CoreDNS/dnsmasq container must forward unresolved queries if Docker container names should still resolve through it.
- Made the healthcheck Compose snippet syntactically valid by defining `app-net`, and changed the wording from service availability to service name registration.

## Review Notes
- The post is technically relevant and remains a useful Docker DNS guide after targeted corrections.
- Commands using `alpine nslookup` assume the selected Alpine image includes BusyBox `nslookup`; this is common for Alpine examples but resolver output can vary with host search domains.
