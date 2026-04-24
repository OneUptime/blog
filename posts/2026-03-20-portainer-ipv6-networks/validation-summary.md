# Validation Summary: How to Set Up IPv6 Networks in Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Engine networking
- Docker bridge networks
- Docker Compose
- IPv6
- Nginx

## Sources Consulted
- Docker Docs: Use IPv6 networking - https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: Networking overview - https://docs.docker.com/engine/network/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: docker inspect reference - https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: Compose file services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose file networks reference - https://docs.docker.com/reference/compose-file/networks/
- Portainer Docs: Add a new network - https://docs.portainer.io/user/docker/networks/add
- NGINX Docs: `listen` directive - https://nginx.org/r/listen

## Issues Found
- The post implied daemon-level IPv6 configuration was required for the user-defined bridge networks used later in the tutorial. I narrowed Step 1 to Docker's default `bridge` network and updated the conclusion, because Docker documents daemon IPv6 settings as applying to the default bridge while user-defined bridge networks use `--ipv6` or `enable_ipv6`.
- The `fixed-cidr-v6` example used `/80`, while current Docker bridge documentation says the prefix should normally be `/64` or shorter for the default bridge. I changed the example to `/64` and updated the sample `docker0` output accordingly.
- The IPv6-only bridge network example was missing `--ipv4=false`. I added it because Docker documents IPv6-only bridge networks as requiring both `--ipv6` and `--ipv4=false`.
- The Portainer UI instructions referred to an IPv6 toggle. I changed them to match the current Portainer docs, which describe entering IPv6 network configuration values directly.
- The `docker inspect --format` example used dot notation with a hyphenated network name (`dual-stack-network`), which is invalid in Docker's Go-template formatting. I changed it to use `index`.
- The connectivity test used `docker exec another-container ...` even though that container was never created. I replaced it with a self-contained `docker run --rm --network dual-stack-network alpine ping -6 -c 3 web` example.
- The Compose example used the obsolete top-level `version` field. I removed it to align with the current Compose Specification and Docker's current reference docs.
- The Compose example published the same port twice (`80:80` and `[::]:80:80`), even though Docker currently publishes `80:80` on both IPv4 and IPv6 by default. I removed the duplicate mapping and clarified the comment.
- The port-publishing section had a shell syntax error from a backslash followed by an inline comment, reused the existing `web` container name, reused the same host port across two alternative examples, and incorrectly bound/pinged a container IPv6 address as if it were a host bind address. I corrected the shell syntax, used distinct container names and ports, and changed the external test to target the Docker host's IPv6 address and published port.
- The verification section used `ping6`, which is less portable than `ping -6`, and mixed in an `api` service that only existed in the separate Compose example. I changed the test to `ping -6` and replaced the final lookup with a direct `docker inspect` of the existing `web` container.

## Review Notes
- The examples target Docker Engine on Linux. Docker's IPv6 engine documentation explicitly scopes support to Linux hosts, and Docker Desktop environments may have additional host-networking differences.
