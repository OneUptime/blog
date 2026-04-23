# Validation Summary: How to Configure Reverse Proxy Rules per Service in Portainer (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Engine networking
- Docker Compose
- Docker Swarm overlay networks
- Nginx
- ntopng
- iptables / Docker firewall rules

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Engine network drivers: https://docs.docker.com/engine/network/drivers/
- Docker overlay network driver: https://docs.docker.com/engine/network/drivers/overlay/
- Docker network create CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker packet filtering and firewalls: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker with iptables: https://docs.docker.com/engine/network/firewall-iptables/
- Portainer Docker networks documentation: https://docs.portainer.io/user/docker/networks
- Portainer add network documentation: https://docs.portainer.io/user/docker/networks/add
- Portainer service network and port options: https://docs.portainer.io/user/docker/services/configure
- Author GitHub profile URL: https://github.com/nawazdhandala

## Issues Found
- Removed the obsolete top-level `version: "3.8"` Compose field because the current Compose Specification treats `version` as backward-compatible informational metadata and emits an obsolete warning.
- Replaced invalid top-level network `encrypted: true` fields with `driver_opts: encrypted: "true"` for overlay networks. Docker overlay encryption is configured as a driver option equivalent to `--opt encrypted=true`.
- Changed the database network comment from "fully isolated" to "externally isolated" because `internal: true` restricts external connectivity while still allowing containers attached to that network to communicate.
- Corrected the API service comment to include `db-net`, matching the actual network membership in the example.
- Replaced UFW-based container firewall examples with `DOCKER-USER` iptables examples because Docker's own firewall rules can make UFW unsuitable for filtering forwarded container traffic.
- Changed the connectivity test from `http://frontend:3000` to `http://nginx`; `frontend` was a network name, not a service hostname in the example.
- Removed `ports` from the `ntopng` service using `network_mode: host`, because Compose must not combine host networking with port mappings. Added the missing top-level `volumes` declaration for `ntopng-data`.
- Fixed invalid YAML in the tiered architecture example by changing `data: {}` plus an indented `internal` key into a proper mapping.

## Review Notes
Docker CLI was not available in the local environment, so snippets were reviewed statically against official Docker and Portainer documentation rather than by running `docker compose config`.
