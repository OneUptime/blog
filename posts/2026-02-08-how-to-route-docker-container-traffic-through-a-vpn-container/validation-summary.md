# Validation Summary: How to Route Docker Container Traffic Through a VPN Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine networking
- Docker CLI
- Docker Compose
- WireGuard
- LinuxServer.io WireGuard container image
- OpenVPN
- dperson/openvpn-client container image
- iptables

## Sources Consulted
- Docker networking overview: https://docs.docker.com/engine/network/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker CLI local help output for `docker run`
- Docker Compose local `config` validation
- LinuxServer.io WireGuard image documentation: https://docs.linuxserver.io/images/docker-wireguard/
- dperson/openvpn-client Docker Hub documentation: https://hub.docker.com/r/dperson/openvpn-client

## Issues Found
- The WireGuard client configuration path was outdated for the current LinuxServer.io image. The post placed `wg0.conf` directly under `/config`, but LinuxServer.io documents client tunnel files under `/config/wg_confs/<tunnel name>.conf`. Updated the directory creation command and config file path to use `/opt/vpn/config/wg_confs/wg0.conf`.
- The WireGuard image references used `linuxserver/wireguard`. LinuxServer.io's current documentation uses `lscr.io/linuxserver/wireguard:latest`. Updated the Docker CLI and Compose examples to use the documented image reference.
- The health check wording implied `wg show wg0` verifies that the VPN connection is fully ready. That command verifies the WireGuard interface exists, but does not prove a successful peer handshake. Updated the wording and comment to describe the check as verifying the interface.

## Review Notes
- Docker's `--network container:<name|id>` behavior and unsupported flags such as `--publish` are correctly described.
- Docker Compose `network_mode: "service:vpn"` and `depends_on` with `condition: service_healthy` are valid according to the current Compose services reference.
- The OpenVPN container example matches the dperson/openvpn-client documentation for `--cap-add=NET_ADMIN`, `--device /dev/net/tun`, `/vpn` mounting, and `--net=container:vpn` usage.
