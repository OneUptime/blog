# Validation Summary: How to Use Docker Compose ports Long Syntax

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Docker
- Docker Compose
- Compose file `ports` configuration
- Container port publishing
- IPv4 and IPv6 host binding
- TCP and UDP protocols
- Docker Swarm publishing modes

## Sources Consulted
- Docker Compose file reference, `ports` short and long syntax: https://docs.docker.com/reference/compose-file/services/#ports
- Docker CLI reference, `docker compose ps`: https://docs.docker.com/reference/cli/docker/compose/ps/
- Docker Engine networking docs, port publishing and mapping: https://docs.docker.com/engine/network/port-publishing/
- Docker Swarm routing mesh docs, published ports and `host` mode: https://docs.docker.com/engine/swarm/ingress/
- Local CLI verification with Docker 29.4.2 and Docker Compose v5.1.3 using `docker compose config` and `docker compose ps --help`.

## Issues Found
- The introduction described the `mode` field as "network mode". Changed this to "Swarm publishing mode" because Compose `ports[].mode` controls Swarm port publishing behavior, not the service `network_mode`.
- The long-syntax port range example used `target: 10000-10100`, which current Compose rejects because long syntax `target` is a single container port. Updated the section to show `target: 10000` with `published: "10000-10100"`, matching the official Compose reference behavior for assigning an available host port from a published range.
- The validation command used `ss -tlnp`, which only checks TCP listeners. Updated it to `ss -tulnp` so it includes both TCP and UDP port bindings discussed in the post.

## Review Notes
The remaining examples use valid Compose `ports` long syntax fields and match the documented defaults for `host_ip`, `protocol`, and Swarm `mode`. Numeric `published` values are accepted by the local Compose CLI and normalized to strings in rendered config, while the range form is quoted to match the official documentation and avoid YAML ambiguity.
