# Validation Summary: How to Set Up Docker Compose with Custom DNS Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Compose
- Docker Engine DNS configuration
- CoreDNS
- Pi-hole Docker
- dnsmasq
- Consul DNS
- Linux resolver configuration

## Sources Consulted
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Engine networking and DNS reference: https://docs.docker.com/engine/network/
- Docker Engine daemon configuration reference: https://docs.docker.com/engine/daemon/
- Pi-hole Docker configuration docs: https://docs.pi-hole.net/docker/configuration/
- Pi-hole Docker quick-start docs: https://docs.pi-hole.net/docker/
- CoreDNS file plugin docs: https://coredns.io/plugins/file/
- CoreDNS forward plugin docs: https://coredns.io/plugins/forward/
- CoreDNS cache plugin docs: https://coredns.io/plugins/cache/
- CoreDNS health plugin docs: https://coredns.io/plugins/health/
- Consul ports reference: https://developer.hashicorp.com/consul/docs/reference/architecture/ports
- Consul agent command reference: https://developer.hashicorp.com/consul/commands/agent
- jpillora/docker-dnsmasq README: https://github.com/jpillora/docker-dnsmasq
- dnsmasq manual: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html

## Issues Found
- Removed obsolete `version: "3.8"` lines from Docker Compose snippets. Current Compose treats the top-level `version` field as obsolete and only informative.
- Updated the Pi-hole example from legacy `WEBPASSWORD` and `PIHOLE_DNS_` variables to current Pi-hole v6 `FTLCONF_webserver_api_password` and `FTLCONF_dns_upstreams` variables.
- Added `FTLCONF_dns_listeningMode: "all"` to the Pi-hole example so the Pi-hole DNS service listens for queries from other containers on the Docker network.
- Removed the unused Pi-hole `/etc/dnsmasq.d` volume from the example because the current Pi-hole Docker docs only recommend it for custom dnsmasq config use or v5-to-v6 migration.
- Assigned the `api` service the static IP address published in the CoreDNS zone file so `api.internal.local` resolves to the actual container address shown in the Compose example.
- Corrected the DNS healthcheck guidance. The official CoreDNS image does not include `dig` or a shell, so the example now states that a DNS client must be present in the image or added in a custom image before using a `dig`-based healthcheck.

## Review Notes
- Local validation with `docker compose -f - config --quiet` passed for all YAML Compose blocks in the post.
- The JSON daemon configuration snippet parsed successfully.
- The healthcheck snippet remains an illustrative pattern because it references a custom CoreDNS image that includes `dig`.
