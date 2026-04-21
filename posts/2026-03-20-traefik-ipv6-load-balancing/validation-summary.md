# Validation Summary: How to Configure Traefik for IPv6 Load Balancing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Traefik Proxy
- IPv6
- HTTP reverse proxying and load balancing
- Docker Compose
- Docker bridge networking
- Kubernetes Services and dual-stack networking
- Traefik Kubernetes IngressRoute CRDs

## Sources Consulted
- Traefik EntryPoints documentation: https://doc.traefik.io/traefik/reference/install-configuration/entrypoints/
- Traefik Docker routing labels documentation: https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/
- Traefik HTTP services/load balancing documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/load-balancing/service/
- Traefik Headers middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/headers/
- Traefik Kubernetes IngressRoute documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- Docker IPv6 networking documentation: https://docs.docker.com/engine/daemon/ipv6/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Kubernetes IPv4/IPv6 dual-stack Services documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html

## Issues Found

1. **Invalid IPv6 address placeholders**: Replaced non-hexadecimal placeholders such as `2001:db8::proxy`, `2001:db8::server1`, `2001:db8::server2`, `2001:db8:proxy::/64`, `fd00:traefik::/64`, and `fd00:docker::/80` with syntactically valid IPv6 example addresses and ULA prefixes.

2. **Ambiguous IPv6-only entrypoint wording**: Changed the `[::]:80` entrypoint example from `ipv6-only` to `ipv6` and clarified it as the IPv6 wildcard address. The Traefik address format allows an optional host plus port, but `[::]` itself is the IPv6 unspecified address, not a portable guarantee of IPv6-only behavior.

3. **Missing TLS enablement for the Docker HTTPS router**: Added `traefik.http.routers.webapp.tls=true` because the router is attached to the `websecure` entrypoint and the Compose snippet does not enable TLS globally on the entrypoint.

4. **Compose network inspect command did not match the default network name**: Added `name: traefik-net` to the Compose network so `docker network inspect traefik-net` works as written. Without this, Compose scopes the network name with the project name.

5. **Incorrect real-IP middleware example**: Removed the `customRequestHeaders` example that set `X-Real-IP: ""`, because Traefik's Headers middleware treats an empty custom header value as removal. Rewrote the section to use `forwardedHeaders.trustedIPs` and Traefik's automatic `X-Forwarded-For` / `X-Real-Ip` forwarding behavior.

6. **Verification commands did not match the configured routes or Compose container names**: Replaced the `/health` localhost curl and public `example.com` curl with a local IPv6 `curl --resolve` command that matches the Traefik Host rule, made the `ss` grep portable, and changed `docker inspect webapp` to inspect the Compose-managed container ID.

## Review Notes
- The Traefik v3 configuration keys used in the post match current Traefik v3 documentation.
- The `2001:db8::/32` addresses are documentation-only examples; production deployments should replace them with real routable IPv6 addresses or valid internal ULA ranges.
- The local HTTPS verification command uses `-k` because the Compose example enables TLS but does not configure a trusted certificate or certificate resolver.
