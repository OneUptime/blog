# Validation Summary: How to Set Up Docker Swarm Ingress Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine Swarm mode
- Docker Swarm ingress routing mesh
- Docker overlay networks
- Docker service discovery and VIP load balancing
- Docker service port publishing
- Nginx reverse proxy/load balancing
- HAProxy load balancing and health checks
- IPVS and iptables troubleshooting

## Sources Consulted
- Docker Docs: Use Swarm mode routing mesh - https://docs.docker.com/engine/swarm/ingress/
- Docker Docs: Manage swarm service networks - https://docs.docker.com/engine/swarm/networking/
- Docker Docs: Overlay network driver - https://docs.docker.com/engine/network/drivers/overlay/
- Docker Docs: Deploy services to a swarm - https://docs.docker.com/engine/swarm/services/
- Docker CLI reference: docker network create - https://docs.docker.com/reference/cli/docker/network/create/
- Local Docker CLI help: `docker service create --help` and `docker network create --help`
- NGINX Docs: ngx_http_upstream_module - https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX Docs: ngx_http_proxy_module - https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- HAProxy Configuration Manual - https://docs.haproxy.org/2.9/configuration.html

## Issues Found
- The post said Swarm creates the ingress overlay network when a service with a published port is created. Docker creates the ingress network when a node initializes or joins a swarm, so this was corrected.
- The service discovery section implied VIP DNS behavior was universal. Docker uses VIP mode by default but also supports DNSRR, so the statement was qualified with "By default."
- The host-mode section described `--mode global` as a placement constraint. It is a service mode, not a constraint, so the wording and command comment were corrected.
- The production load balancer paragraph implied every shown load balancer configuration actively health-checks nodes. This was softened to "With health checks configured" because health-check behavior depends on the load balancer and configuration.
- The Nginx example was labeled as `/etc/nginx/nginx.conf`, but the shown `upstream` and `server` blocks are valid in the `http` context. The example path was changed to `/etc/nginx/conf.d/swarm.conf`, which is commonly included from the main `http` context.
- The port-conflict troubleshooting note said service creation succeeds if another local process is using the published port and traffic to that node fails. Docker's routing mesh reserves published ports at the Swarm level, and host-mode placement has different conflict behavior, so the troubleshooting guidance was corrected.
- The ingress network recreation snippet omitted Docker's requirement to remove or stop services that publish ports before removing `ingress`. A warning comment was added before `docker network rm ingress`.

## Review Notes
The Docker commands and long `--publish published=...,target=...,mode=...` syntax are current and match Docker's documented service publishing behavior. The encrypted overlay network example is correct, though Docker documents the performance impact as non-negligible rather than a fixed percentage, so the existing estimate should be treated as workload-dependent.
