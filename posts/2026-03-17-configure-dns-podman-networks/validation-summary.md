# Validation Summary: How to Configure DNS in Podman Networks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman custom networks
- Netavark and aardvark-dns
- Container DNS configuration
- containers.conf

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman-network-create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman-pod-create` documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- containers.conf(5) man page: https://manpages.debian.org/bookworm/golang-github-containers-common/containers.conf.5.en.html
- aardvark-dns project README: https://github.com/containers/aardvark-dns
- Netavark project README: https://github.com/containers/netavark

## Issues Found
- The custom DNS example implied that `/etc/resolv.conf` directly verifies the configured upstream DNS servers. Podman documentation notes that on DNS-enabled custom networks, `/etc/resolv.conf` may point only to the aardvark-dns resolver, which then forwards non-container lookups to the configured DNS server. Updated the comment to reflect that behavior.
- The troubleshooting example used `journalctl -u aardvark-dns`, which assumes an `aardvark-dns` systemd unit. Aardvark-dns is launched by Netavark for Podman DNS handling rather than being documented as a standalone service unit. Changed the command to search recent journal entries for `aardvark-dns`.
- The summary called aardvark-dns a plugin. Official project documentation describes aardvark-dns as an authoritative DNS server used with Netavark. Updated the wording.

## Review Notes
The remaining commands and flags match current Podman documentation, including `--dns`, `--dns-search`, `--dns-option`, `--network-alias`, pod network usage, and the `dns_servers`, `dns_searches`, and `dns_options` containers.conf keys. DNS is specific to networks with DNS enabled, and Podman documents support for that behavior primarily with bridge networks using Netavark/aardvark-dns.
