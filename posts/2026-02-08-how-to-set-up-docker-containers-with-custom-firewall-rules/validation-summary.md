# Validation Summary: How to Set Up Docker Containers with Custom Firewall Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine networking
- Docker Compose networking
- iptables
- nftables
- Linux firewall persistence
- systemd
- nmap

## Sources Consulted
- Docker Docs: Packet filtering and firewalls - https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: Docker with nftables - https://docs.docker.com/engine/network/firewall-nftables/
- Docker Docs: Compose networks reference - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: dockerd reference - https://docs.docker.com/reference/cli/dockerd/
- Local CLI help: `iptables --help`, `nft --help`, `docker run --help`, `docker inspect --help`, `docker network create --help`

## Issues Found
- The `/etc/docker/daemon.json` example used a JavaScript-style `//` comment inside a `json` code block. JSON does not allow comments, so the comment was removed.
- Several `DOCKER-USER` allow/drop examples used repeated `iptables -I` commands in an order that would insert the later `DROP` rule before the earlier allow rule. The commands were reordered with explicit rule position `1` so the effective chain order matches the text.
- The Docker Compose example included `version: "3.8"`, which is obsolete under the current Compose Specification. It was removed while keeping the same service and network configuration.
- The nftables example targeted `ip filter DOCKER-USER`, but Docker's native nftables backend does not create a `DOCKER-USER` chain. The example was changed to iptables rules that match the rest of the article's recommended `DOCKER-USER` approach.
- The subnet-based outbound filtering example had the same `iptables -I` ordering problem, causing the broad TCP drop rule to precede the HTTP/HTTPS allow rules. The commands were reordered.
- The RHEL/CentOS persistence command used `sudo iptables-save > /etc/sysconfig/iptables`, where shell redirection would run as the non-root user. It was changed to `sudo sh -c 'iptables-save > /etc/sysconfig/iptables'`.
- The logging example appended the `DROP` rule after existing chain rules, which could leave it after Docker's default `RETURN`. It now inserts the `DROP` rule and then inserts the `LOG` rule before it.

## Review Notes
The `DOCKER-USER` examples assume Docker is using the iptables firewall backend. Docker's nftables backend is experimental as of Docker 29.0.0 documentation and requires separate nftables base chains rather than relying on `DOCKER-USER`.
