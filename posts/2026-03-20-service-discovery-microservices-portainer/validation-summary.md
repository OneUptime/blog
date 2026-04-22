# Validation Summary: How to Configure Service Discovery for Microservices in Portainer (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker networking and embedded DNS
- Consul service discovery and DNS
- Gliderlabs Registrator
- Fabio load balancer
- Traefik Docker provider
- DNS

## Sources Consulted
- Docker Compose networking documentation: https://docs.docker.com/compose/how-tos/networking/
- Docker Engine networking and DNS documentation: https://docs.docker.com/engine/network/
- Compose Specification version element documentation: https://compose-spec.github.io/compose-spec/04-version-and-name.html
- Docker Compose CLI reference for `up`, `exec`, and `scale`: https://docs.docker.com/reference/cli/docker/compose/
- Docker Compose services reference for `dns`, `dns_search`, `expose`, labels, and networks: https://docs.docker.com/reference/compose-file/services/
- Consul ports reference: https://developer.hashicorp.com/consul/docs/reference/architecture/ports
- Consul agent CLI reference: https://developer.hashicorp.com/consul/commands/agent
- Consul agent service API documentation: https://developer.hashicorp.com/consul/api-docs/agent/service
- Consul health API documentation: https://developer.hashicorp.com/consul/api-docs/health
- Consul DNS static service lookup documentation: https://developer.hashicorp.com/consul/docs/discover/service/static
- Registrator Consul backend documentation: https://gliderlabs.github.io/registrator/latest/user/backends/
- Registrator service model documentation: https://gliderlabs.github.io/registrator/latest/user/services/
- Fabio Docker support documentation: https://fabiolb.net/feature/docker/
- Traefik Docker provider documentation: https://doc.traefik.io/traefik/providers/docker/
- Traefik HTTP service load-balancer documentation: https://doc.traefik.io/traefik/v3.3/reference/routing-configuration/http/load-balancing/service/
- Portainer container console documentation: https://docs.portainer.io/sts/user/docker/containers/console
- Portainer service scaling documentation: https://docs.portainer.io/user/docker/services/scale

## Issues Found
- The post described Docker bridge networks too broadly. Docker name resolution applies to user-defined bridge networks and Compose networks, while the default bridge network does not provide service-name DNS. Updated the wording to match Docker's documented behavior.
- The Compose examples used the obsolete top-level `version: "3.8"` key and legacy `docker-compose` command. Removed the version keys and changed commands to current `docker compose` syntax.
- The DNS round-robin section claimed Docker balances traffic by rotating DNS results. Docker DNS can return multiple addresses for scaled Compose services, but client behavior determines whether those addresses are retried or balanced. Reworded the section and fixed the `docker exec service_a` command to `docker compose exec service_a`.
- The Consul example exposed only UDP 8600 and later configured containers to use the Consul IP as a DNS server, which would query port 53, not 8600. Updated Consul to listen on DNS port 53 inside the Docker network, published host port 8600 to that DNS port for `dig`, and added TCP/UDP DNS exposure.
- The Consul example used `-bind=0.0.0.0`. Updated it to bind to the configured static Consul network address.
- The Registrator comment called environment variables labels. Updated the comment and added a Fabio `urlprefix-` tag so Fabio can route the registered service.
- The Fabio example used `CONSUL_ADDR`, which is not Fabio's documented configuration key. Replaced it with the documented `-registry.consul.addr=consul:8500` command option.
- The Traefik section described Traefik as a service registry. Traefik's Docker provider discovers containers and creates routers/load balancers; it is not itself a registry. Updated the heading and description.
- The Traefik example set `providers.docker.network=traefik_net` without ensuring that Compose creates a Docker network with that exact name. Added `name: traefik_net`.
- The Traefik health-check comment described circuit breaking. Updated it to active load-balancer health checking, which matches Traefik's documented behavior.
- The DNS configuration snippet was marked as `bash` even though it was YAML and included a fallback DNS resolver that did not address Consul's non-standard DNS port. Changed the fence to `yaml` and aligned the snippet with the corrected Consul DNS-on-port-53 setup.
- The Portainer monitoring note mentioned only overlay networks. Updated it to bridge or overlay networks to match the examples.

## Review Notes
The examples are still illustrative: the application images (`service-a:latest`, `user-service:latest`, `api-gateway:latest`) must provide the shown ports and health endpoints, and tools such as `nslookup`, `dig`, and `jq` must be installed where the commands are run. The Traefik example uses `--api.insecure=true`, which is acceptable for a local demo but should be secured before production use.
