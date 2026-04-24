# Validation Summary: How to Configure Service Discovery for Microservices in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker networking and embedded DNS
- Traefik
- Consul
- JavaScript
- DNS-based service discovery

## Sources Consulted
- Docker networking docs: https://docs.docker.com/engine/network/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose `version` top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker guide for Traefik with Docker: https://docs.docker.com/guides/traefik/
- Traefik Docker provider docs: https://doc.traefik.io/traefik/v3.0/providers/docker/
- Traefik entrypoints docs: https://doc.traefik.io/traefik/v3.0/routing/entrypoints/
- Consul agent service API docs: https://developer.hashicorp.com/consul/api-docs/agent/service
- Consul DNS overview: https://developer.hashicorp.com/consul/docs/discover/dns
- Consul DNS reference: https://developer.hashicorp.com/consul/docs/reference/dns
- Consul DNS forwarding docs: https://developer.hashicorp.com/consul/docs/manage/dns/forwarding
- Consul DNS configuration docs: https://developer.hashicorp.com/consul/docs/discover/dns/configure
- Consul service definition reference: https://developer.hashicorp.com/consul/docs/reference/service
- Portainer stack docs: https://docs.portainer.io/user/docker/stacks/add?fallback=true

## Issues Found
- The Compose examples used the top-level `version` field, which Docker now keeps only for backward compatibility and marks as obsolete. I removed it from the examples.
- The Consul configuration block was a partial YAML fragment and did not expose Consul's DNS port. I replaced it with a valid Compose service snippet and added `8600/tcp` and `8600/udp` so the DNS role described in the post is represented accurately.
- The Consul registration example used `http://localhost:3001/health` for the health check. Because that check runs from the Consul agent container, `localhost` would incorrectly point back to the Consul container rather than the `user-service` container. I changed the payload to register `Address: "user-service"` and to probe `http://user-service:3001/health`.
- The post implied `.service.consul` hostnames could be used directly without any DNS setup. I added a clarification that the resolver must be configured to send `.consul` queries to Consul.
- The monitoring note implied Consul must deregister an unhealthy service before discovery stops returning it. Consul's standard DNS omits unhealthy services when health checks are enabled, so I corrected that example to focus on missing or misconfigured health checks and stale routing/DNS updates.

## Review Notes
- The pinned image tags (`traefik:v3.0` and `consul:1.16`) are older than the current docs examples, but the features used in the post are still valid.
- For multi-stack or multi-network Portainer setups, future revisions could mention that Docker DNS and Traefik routing require the relevant services to share a reachable Docker network.
