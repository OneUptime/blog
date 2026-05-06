# Validation Summary: How to Configure Docker to Use a Specific IPv4 Address Range

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Docker Engine
- Docker bridge networking
- Docker Compose networking
- IPv4 addressing
- Linux `iproute2`
- `daemon.json`

## Sources Consulted
- Docker Docs, Networking overview: https://docs.docker.com/engine/network/
- Docker Docs, Bridge network driver: https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs, `dockerd` CLI reference: https://docs.docker.com/reference/cli/dockerd/
- Docker Docs, `docker network inspect` CLI reference: https://docs.docker.com/reference/cli/docker/network/inspect/
- Docker Docs, Compose file `networks` reference: https://docs.docker.com/reference/compose-file/networks/
- RFC 1918, Address Allocation for Private Internets: https://datatracker.ietf.org/doc/html/rfc1918
- RFC 6598, IANA-Reserved IPv4 Prefix for Shared Address Space: https://datatracker.ietf.org/doc/html/rfc6598
- Local Docker 29.4.2 validation using `dockerd --validate`, plus local CLI help from `dockerd --help`, `docker network inspect --help`, `ip route help`, and `ip address help`

## Issues Found
- The introduction simplified Docker's built-in automatic subnet allocation too aggressively and omitted the `192.168.0.0/16` subdivisions Docker also uses by default. I corrected the explanation to match Docker's current networking documentation.
- The description of `default-address-pools` said it applied to "new networks" generically. Docker documents this as automatic allocation for local node-specific networks, so I narrowed the wording to new local bridge networks.
- The verification command `ip addr show docker0 | grep inet` could also match `inet6` output. I changed it to `ip -4 addr show docker0 | grep 'inet '` so it checks the IPv4 bridge address directly.
- The sample verification note implied the new network should specifically become `10.200.1.0/24`. Docker guarantees allocation from the configured pool, but this wording was more specific than the docs support, so I changed it to expect any `/24` from `10.200.0.0/16`.
- The multiple-pool section claimed Docker always exhausts the first pool before moving to the second. I replaced that with a doc-backed statement that Docker allocates from the configured pools and that the pools must not overlap.
- The "safe choices" list included `100.64.0.0/10`, which RFC 6598 reserves as shared address space for carrier-grade NAT rather than RFC 1918 private addressing. I replaced that guidance with RFC 1918 examples and updated the wording accordingly.
- The route-listing script and conflict-check wording overstated what the commands proved. I simplified the script to list IPv4 route prefixes and changed the follow-up check to describe it as a quick exact-prefix route-table check.
- The Docker Compose section was too broad. I clarified that the statement applies to bridge networks created by Compose without explicit subnets.

## Review Notes
- The post is Linux-specific. `/etc/docker/daemon.json` and `systemctl restart docker` are appropriate for Docker Engine on Linux, while Docker Desktop uses its own Docker Engine settings surface.
- The route-table check in the post is a quick sanity check, not a full CIDR overlap analysis across broader private ranges.
