# Validation Summary: How to Fix Port Mapping Errors When Editing Containers in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker networking and port publishing
- Docker Compose
- Linux networking tools (`ss`, `fuser`, `iptables`, `journalctl`, `sysctl`)

## Sources Consulted
- [Docker Docs: Port publishing and mapping](https://docs.docker.com/engine/network/port-publishing/)
- [Docker Docs: Host network driver](https://docs.docker.com/engine/network/drivers/host/)
- [Docker Docs: Docker with iptables](https://docs.docker.com/engine/network/firewall-iptables/)
- [Docker Docs: Rootless mode tips](https://docs.docker.com/engine/security/rootless/tips/)
- [Docker Docs: Rootless mode troubleshooting](https://docs.docker.com/engine/security/rootless/troubleshoot/)
- [Docker Docs: docker inspect](https://docs.docker.com/reference/cli/docker/inspect/)
- [Docker Docs: docker container ls](https://docs.docker.com/reference/cli/docker/container/ls/)
- [Docker Docs: docker container rm](https://docs.docker.com/reference/cli/docker/container/rm/)
- [Docker Docs: Compose file services reference](https://docs.docker.com/reference/compose-file/services/)
- [Portainer Docs: Add a new container](https://docs.portainer.io/sts/user/docker/containers/add)
- [Portainer Docs: Edit or duplicate a container](https://docs.portainer.io/2.21/user/docker/containers/edit)

## Issues Found
- The Portainer UI section described Docker publish-string syntax as if it were entered directly in Portainer. I clarified that Portainer uses separate host/container/protocol/host-IP fields and kept the Docker syntax as the equivalent reference.
- The "driver failed programming external connectivity" section overstated the cause as broken `iptables` state and recommended flushing Docker chains. I replaced that with doc-aligned troubleshooting: inspect Docker-managed NAT and user chains, then restart Docker so it can rebuild its own rules.
- The manual `docker run` recreation example was not runnable because it had an inline comment after a line-continuation backslash and an invalid placeholder inside the command. I replaced it with a valid minimal example.
- The privileged-port section treated low ports as a general Docker issue and used `net.ipv4.ip_unprivileged_port_start=80`. Docker documents this as a rootless-Docker-specific issue and recommends `net.ipv4.ip_unprivileged_port_start=0` if you need privileged ports, or using a port `>= 1024`.
- The host network mode check depended on `jq`, which was unnecessary. I changed it to Docker's documented `docker inspect --format` usage.
- The Portainer UI steps used outdated button and section labels. I updated them to Portainer's documented wording: `Network ports configuration` and `publish a new network port`.
- The UDP examples were shell fragments instead of runnable commands. I converted them to valid `docker run` examples.
- One listed error string was too specific and not well-supported (`invalid containerPort`). I simplified it to Docker's broader `Invalid port specification`.

## Review Notes
- Docker documents that published ports without a host IP bind to all host addresses by default. On modern hosts this can include both IPv4 and IPv6 listeners.
- Docker also documents that published ports and `host` networking are mutually exclusive. The post covers this correctly after the edits.
- On Linux hosts using Docker's nftables backend or other custom firewall tooling, the exact firewall-inspection commands may differ from the `iptables` examples in the post.
