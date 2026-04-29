# Validation Summary: How to Set Up Let's Encrypt for Services via Portainer - Letsencrypt

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker networking
- Docker Swarm overlay networks
- Linux firewalling with iptables
- ntopng

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Networking in Compose: https://docs.docker.com/compose/how-tos/networking/
- Docker overlay network driver: https://docs.docker.com/engine/network/drivers/overlay/
- Docker host network driver: https://docs.docker.com/engine/network/drivers/host/
- Docker with iptables: https://docs.docker.com/engine/network/firewall-iptables/
- Packet filtering and firewalls: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Portainer networks documentation: https://docs.portainer.io/user/docker/networks?fallback=true
- Portainer add network documentation: https://docs.portainer.io/user/docker/networks/add
- ntop official Docker repository: https://github.com/ntop/docker-ntop

## Issues Found
- The post title, tags, description, and introduction described Let's Encrypt and SSL certificate provisioning, but the body content was actually a Docker/Portainer networking guide. I corrected the metadata and intro to match the technical content of the article.
- The prerequisites said a Docker or Kubernetes environment could be used, but the examples are Docker-specific and overlay networking requires Swarm mode. I corrected the prerequisites accordingly.
- The stack example used the obsolete top-level `version` field. I removed it to match the current Compose Specification.
- The overlay network examples used `encrypted: true` as a top-level network field, which is not the correct Compose network syntax. I replaced it with the `driver_opts` form that maps to Docker's documented `--opt encrypted` overlay network option.
- The network creation step pointed readers to Portainer's Networks UI while showing a stack YAML example. I clarified that the networks can be created in the Networks UI or defined in a stack.
- The API service comment said it connected only to the frontend and backend networks even though the example also attached it to `db-net`. I corrected the comment.
- The firewall section used UFW rules as if they would control access to Docker-published ports. Docker documents that published ports bypass UFW processing, so I replaced that section with `DOCKER-USER` chain guidance based on Docker's firewall documentation.
- The troubleshooting example used `curl -I http://frontend:3000`, but `frontend` is a network name, not a service name. I changed it to `http://nginx`, which is resolvable on the shared network.
- The troubleshooting text implied Portainer's console for commands that are actually run from the Docker host. I corrected the wording.
- The `ntopng` example combined `ports` with `network_mode: host`, which Docker Compose documents as invalid. I removed the port mapping, added a host-interface command argument, and declared the named volume.
- The tiered architecture YAML example was syntactically invalid because `internal: true` was indented under an inline mapping. I fixed the YAML structure.

## Review Notes
- Overlay networks require Swarm mode even when used for standalone containers, and enabling overlay encryption adds performance overhead.
- Encrypted overlay networks are not supported for Windows containers.
- Host networking is platform-specific: it works on Docker Engine for Linux, and on Docker Desktop only when host networking support is enabled.
- The directory slug still references `letsencrypt-services-portainer`; only the post content and validation artifacts were corrected in this review.
