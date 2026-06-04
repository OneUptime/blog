# Validation Summary: How to Run OpenVPN Server in a Docker Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- OpenVPN
- kylemanna/openvpn Docker image
- Easy-RSA
- Linux firewalling and NAT with iptables
- UFW
- dperson/openvpn-client Docker image

## Sources Consulted
- kylemanna/docker-openvpn README: https://github.com/kylemanna/docker-openvpn/blob/master/README.md
- kylemanna/docker-openvpn `ovpn_genconfig` source: https://github.com/kylemanna/docker-openvpn/blob/master/bin/ovpn_genconfig
- kylemanna/docker-openvpn `ovpn_run` source: https://github.com/kylemanna/docker-openvpn/blob/master/bin/ovpn_run
- kylemanna/docker-openvpn `ovpn_revokeclient` source: https://github.com/kylemanna/docker-openvpn/blob/master/bin/ovpn_revokeclient
- kylemanna/docker-openvpn Docker Compose docs: https://github.com/kylemanna/docker-openvpn/blob/master/docs/docker-compose.md
- Docker CLI `docker run` reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker Engine volumes documentation: https://docs.docker.com/engine/storage/volumes/
- OpenVPN 2.6 manual: https://openvpn.net/community-docs/community-articles/openvpn-2-6-manual.html
- OpenVPN Connect profile import docs: https://openvpn.net/connect-docs/import-profile.html
- dperson/openvpn-client README and entrypoint source: https://github.com/dperson/openvpn-client
- Local CLI checks: `docker --version`, `docker compose version`, `docker run --help`, and `ufw --help`

## Issues Found
- The post described `kylemanna/openvpn` as "well-maintained." The repository is still available and widely used, but that maintenance claim is stronger than the current evidence supports, so it was changed to "widely used."
- The post said `ovpn_genconfig` creates iptables rules. The image's `ovpn_genconfig` writes the OpenVPN configuration and routing environment; NAT/iptables rules are applied by `ovpn_run` when the server container starts. The explanation was corrected.
- The client-to-client example used `ovpn_genconfig ... -C`. In `kylemanna/openvpn`, lowercase `-c` enables `client-to-client`; uppercase `-C` sets a cipher value. The command was corrected to use `-c`.
- The TCP/443 customization generated a TCP client/server config but did not mention that Docker must publish TCP 443 to the container's internal OpenVPN port 1194. A short note was added with `-p 443:1194/tcp`.

## Review Notes
Docker Hub image pulls could not be used for live container `--help` checks because the environment hit Docker Hub's unauthenticated pull rate limit. Validation used the upstream GitHub source, Docker official documentation, OpenVPN official documentation, and local Docker/UFW CLI help instead.
