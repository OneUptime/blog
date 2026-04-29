# Validation Summary: How to Set Up Load Balancing Across Containers in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Compose / Compose Specification
- Docker networking
- Docker Swarm overlay networks
- iptables / `DOCKER-USER`
- Nginx
- ntopng

## Sources Consulted
- Portainer Add a new network documentation: https://docs.portainer.io/user/docker/networks/add
- Docker Compose file reference: Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose file reference: Networks: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose file reference: Services: https://docs.docker.com/reference/compose-file/services/
- Docker Engine network drivers overview: https://docs.docker.com/engine/network/drivers/
- Docker Engine overlay network driver: https://docs.docker.com/engine/network/drivers/overlay/
- Docker Engine packet filtering and firewalls: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Engine with iptables: https://docs.docker.com/engine/network/firewall-iptables/
- Docker Engine host network driver: https://docs.docker.com/engine/network/drivers/host/

## Issues Found
- The post title, tags, description, and introduction described load balancing, but the body of the article was a Docker networking guide. Updated that metadata to match the actual technical scope of the content.
- The prerequisites said a Kubernetes environment was supported, but all examples used Docker Compose, Docker networks, and Docker CLI commands. Updated the prerequisites to target Docker and to note that overlay networks require Docker Swarm.
- The stack example used the obsolete top-level Compose `version` field. Removed it to align with the current Compose Specification.
- The overlay network examples used `encrypted: true` as a top-level network key, which is not a valid Compose network attribute. Replaced it with `driver_opts`-based overlay encryption and clarified that the example is Swarm-only.
- The Portainer navigation text pointed to the Networks UI while showing a stack YAML definition. Corrected the wording so stack-based and individually created networks are distinguished.
- The host firewall section recommended UFW rules for container traffic. Docker’s official firewall documentation states that published container ports bypass UFW, so I replaced the example with `DOCKER-USER` `iptables` rules that match Docker’s documented behavior.
- The connectivity test used `http://frontend:3000`, but `frontend` was the network name, not a service hostname. Updated the command to target the `nginx` service name, which is resolvable on the shared network.
- The `ntopng` example combined `network_mode: host` with published `ports`, but Docker ignores published ports in host network mode. Removed the `ports` section and adjusted the comment.
- The tiered architecture example had invalid YAML indentation for the `internal: true` setting. Corrected the YAML so the example is syntactically valid.

## Review Notes
- Docker documents overlay encryption as a Swarm overlay feature and notes a non-trivial performance cost. It also does not support encrypted overlay networking for Windows containers.
- The `network_mode: host` example is most appropriate on Linux hosts. Docker documents additional limitations for host networking on Docker Desktop.
- The troubleshooting commands still assume the target container image includes tools such as `nslookup`, `ping`, and `curl`. If those utilities are missing, a dedicated toolbox container on the same network is a better diagnostic path.
