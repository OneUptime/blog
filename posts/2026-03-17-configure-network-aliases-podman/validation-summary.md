# Validation Summary: How to Configure Network Aliases in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman container networking
- Podman network aliases
- Container DNS service discovery

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman network connect` documentation: https://docs.podman.io/en/stable/markdown/podman-network-connect.1.html
- Podman Quadlet/systemd unit documentation for `NetworkAlias=` behavior: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html

## Issues Found
- The summary said aliases can be added with `--network-alias` when connecting to networks. `podman network connect` uses `--alias`, so the summary was corrected to distinguish `--network-alias` at container startup from `--alias` during network connection.
- The post described shared aliases as "round-robin" DNS load balancing. Official Podman documentation states that a DNS query resolves to all containers with that alias, but does not promise round-robin balancing behavior. The wording was changed to "resolve to all matching containers" and "DNS-based service grouping."
- The compose-like workflow used `podman exec myapp-web-1 ping -c 1 db`, which assumes the `nginx:latest` image includes `ping`. The example was changed to run an Alpine container on the same network for the connectivity check.
- The service abstraction example described the stop/start replacement as a "seamless switch." Since stopping one container before starting the replacement can introduce downtime, the comment was changed to say clients still use the same `api` alias after the replacement.

## Review Notes
The alias flags and network-scoped DNS behavior are current in the official Podman documentation. DNS resolution requires DNS to be enabled on the Podman network; the official docs recommend checking this with `podman network inspect -f {{.DNSEnabled}} <name>`. CNI has a documented limitation where aliases are available only on the first joined network, while netavark/aardvark-dns does not have that limitation.
