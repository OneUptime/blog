# Validation Summary: How to Configure Docker DNS Round-Robin Load Balancing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Engine networking
- Docker embedded DNS
- Docker bridge networks and network aliases
- Docker Compose services and replicas
- Docker health checks
- Nginx reverse proxy DNS resolution
- curl, nslookup, and dig command-line testing

## Sources Consulted
- Docker Docs: Networking overview, DNS services - https://docs.docker.com/engine/network/
- Docker Docs: Bridge network driver, user-defined bridge DNS behavior - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Docker container run CLI reference, including `--network-alias` - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Compose Deploy Specification, including `deploy.replicas` - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Compose services reference, including `deploy` and `healthcheck` - https://docs.docker.com/reference/compose-file/services/
- Nginx official documentation: `proxy_pass` domain resolution and round-robin behavior - https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx official documentation: `resolver` directive and `valid` cache override - https://nginx.org/en/docs/http/ngx_http_core_module.html#resolver
- Local verification with Docker Engine 29.4.2 and Docker Compose v5.1.3.

## Issues Found
- The DNS TTL text described 600 seconds as "very short." Changed it to state that Docker commonly returns a 600-second TTL for container-name and alias records, which matches live `dig` verification and avoids mischaracterizing the value.
- The container failure section said stopping a container provides "health-aware routing." Changed this to say stopped containers are removed from new DNS lookups, because Docker DNS does not filter merely unhealthy containers.
- The health check section said health checks ensure DNS only returns healthy backends, contradicting the next sentence. Changed it to say health checks mark unhealthy backends, while Docker DNS still returns unhealthy container addresses.
- The monitoring example created only one backend with an `X-Backend` header while previous unlabelled backends could still share the `backend` alias. Updated the example to replace earlier test backends with three header-identifying backends and updated cleanup accordingly.

## Review Notes
Docker Compose `deploy.replicas` is valid in the current Compose specification and was also verified locally with `docker compose up`. Compose implementations that do not support `deploy` may ignore that section, as allowed by the Compose specification.
