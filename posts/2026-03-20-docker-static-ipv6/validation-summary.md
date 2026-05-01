# Validation Summary: How to Assign Static IPv6 Addresses to Docker Containers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Engine networking
- Docker CLI (`docker run`, `docker network create`, `docker inspect`)
- Docker Compose networking
- IPv6 addressing

## Sources Consulted
- Docker Docs: Networking overview - https://docs.docker.com/engine/network/
- Docker Docs: Use IPv6 networking - https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: `docker container run` reference - https://docs.docker.com/reference/cli/docker/container/run
- Docker Docs: `docker network create` reference - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: Compose networking - https://docs.docker.com/compose/how-tos/networking/
- Docker Docs: Compose services reference (`ipv4_address`, `ipv6_address`) - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose networks reference (`enable_ipv6`, `ipam`, `ip_range`) - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Format command and log output - https://docs.docker.com/go/formatting/
- RFC 4291: IP Version 6 Addressing Architecture - https://www.rfc-editor.org/rfc/rfc4291
- RFC 4193: Unique Local IPv6 Unicast Addresses - https://www.rfc-editor.org/rfc/rfc4193

## Issues Found
- The post used invalid IPv6 literals such as `fd00:static::/64` and `fd00:other::99`. IPv6 hextets must be hexadecimal, so these examples would not parse. I replaced them with valid ULA examples under `fd12:3456:789a::/64` and a different subnet for the failure case.
- The `docker inspect` examples accessed `.NetworkSettings.Networks.static-net...`, which is invalid in Docker's Go-template formatting because `static-net` is a hyphenated map key. I changed those examples to use `index`.
- The Compose test section relied on `ip` and `ping6` being present inside example images, which is not guaranteed for `nginx:latest`, `redis:7`, or `myapp:latest`. I replaced those checks with host-side `docker inspect` commands and kept the Redis reachability check with `redis-cli` from the Redis container.
- The post stated that static IPv6 assignment requires a user-defined bridge network. Docker documents static `--ip`/`--ip6` assignment for user-defined networks; the examples use a bridge network, but bridge is not the general requirement. I corrected that wording.
- One shell example had an invalid line continuation: the backslash was followed by an inline comment, which would break the command. I fixed the command so it is copy-paste safe.
- The guidance that Docker auto-assigns a predictable low IPv6 range such as `::2` to `::9` was inaccurate. I replaced it with accurate guidance to use `--ip-range` or Compose `ipam.config[].ip_range` when separating dynamic allocation from manual assignments.

## Review Notes
- Docker documents IPv6 networking support for Docker daemons running on Linux hosts. That caveat may be worth calling out explicitly in a future revision if the post is intended for a broad audience.
- Local Docker CLI help output could not be checked in this workspace because `docker` is not installed here, so command validation was performed against current official Docker documentation.
