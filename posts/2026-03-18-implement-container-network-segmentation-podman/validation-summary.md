# Validation Summary: How to Implement Container Network Segmentation with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman custom networks
- Podman internal networks
- Podman pods
- Quadlet systemd units
- PostgreSQL and Redis container images
- Container port publishing

## Sources Consulted
- Podman network create documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman network documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman ps documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman network inspect documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html
- Podman Quadlet systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres/

## Issues Found
- The post claimed it covered firewall rules, but no firewall rule examples or implementation details were present. Removed the firewall-rule references from the description and introduction.
- The default networking section described all default Podman containers as being placed on a shared default network. Updated this to specify rootful Podman default bridge behavior and IP-based reachability, matching current Podman documentation.
- Several `postgres:16` examples omitted `POSTGRES_PASSWORD`, which the official image requires unless trust authentication is explicitly configured. Added `POSTGRES_PASSWORD=secret` where needed.
- The basic API connection string referenced database `app`, but the Postgres example did not create that database. Added `POSTGRES_DB=app`.
- The internal-network example attached a container to `app-external` without creating that network first. Added the missing `podman network create app-external` command.
- The internal-network verification used `curl` inside the Postgres container and `psql` inside an unspecified API image. Replaced those with commands that use tools available in purpose-built client images.
- The verification script assumed `curl` and `pg_isready` existed in `nginx` and arbitrary API images. Reworked those checks to use temporary client containers attached to the same network sets being tested.
- The verification script expected the database tier to have no internet access, but the earlier `database` network was not internal. Updated the backend and database network creation commands to use `--internal`.
- The microservices API gateway was only connected to internal service networks while publishing a host port. Added a public gateway network so the published service also has an external-facing network attachment.
- The Quadlet Postgres container omitted the required `POSTGRES_PASSWORD` environment variable. Added `Environment=POSTGRES_PASSWORD=secret`.

## Review Notes
Podman was not installed in the local workspace, so CLI behavior was validated against official Podman documentation rather than local `--help` output. The examples still use placeholder application images such as `my-api`, `orders-service`, and `api-gateway`; their internal ports and health endpoints are illustrative and depend on those images exposing the expected services.
