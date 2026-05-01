# Validation Summary: How to Use Docker Host Network Mode for Direct IPv4 Access

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine container networking
- Docker host network driver
- Docker Compose
- Linux networking tools (`ss`, `/proc/net/dev`)
- NGINX container images

## Sources Consulted
- Docker Docs: Host network driver - https://docs.docker.com/engine/network/drivers/host/
- Docker Docs: Define services in Docker Compose - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: `docker inspect` CLI reference - https://docs.docker.com/reference/cli/docker/inspect/
- Official NGINX Dockerfiles repository - https://github.com/nginx/docker-nginx
- Official NGINX Alpine Dockerfile template - https://raw.githubusercontent.com/nginx/docker-nginx/master/Dockerfile-alpine.template
- Local CLI help output used to verify command behavior: `busybox hostname --help`, `ss --help`, `ip --help`

## Issues Found
- The Docker Desktop section was outdated. The post said host networking only worked as expected on Linux, but current Docker docs support host networking on Docker Desktop 4.34 and later as an opt-in feature with layer-4-only limitations. I updated the platform section and conclusion to reflect the current behavior.
- The verification command `docker exec nginx-host hostname -I` was not valid for `nginx:alpine`, because Alpine's BusyBox `hostname` implementation does not support `-I`. I replaced it with `docker inspect -f '{{.HostConfig.NetworkMode}}' nginx-host`, which directly verifies that the container is using host networking.
- The command `docker exec nginx-host ip addr show` was not valid for the example image, because the official `nginx:alpine` image does not include `iproute2` or the `ip` command. I replaced it with `docker exec nginx-host cat /proc/net/dev`, which works in the image and still demonstrates the shared network namespace on Linux.
- The Compose example used the obsolete top-level `version` key, and the note that `ports:` mappings are ignored was incorrect for Docker Compose. I removed `version: "3.8"` and corrected the note to state that Compose returns a runtime error when `ports:` is combined with `network_mode: host`.
- The introduction overstated host networking behavior as a general Docker rule. I scoped the namespace-sharing language to Linux and clarified that the benefit is removal of NAT and port-mapping overhead rather than elimination of all networking overhead.

## Review Notes
- The examples remain Linux-centric, which matches Docker's native host-networking model; Docker Desktop support is more limited than Linux host networking.
- `sudo ss -tlnp` may require elevated privileges to display process ownership, depending on the host.
- The post focuses on IPv4, but Docker host networking also affects IPv6 where the host and workload use it.
