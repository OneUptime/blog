# Validation Summary: How to Configure Traefik as an IPv6 Reverse Proxy

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Traefik Proxy
- IPv6 and dual-stack networking
- Docker
- Docker Compose
- Kubernetes Services
- Traefik IngressRoute CRDs
- Traefik HTTP middlewares
- curl

## Sources Consulted
- Traefik EntryPoints documentation: https://doc.traefik.io/traefik/reference/install-configuration/entrypoints/
- Traefik v3.0 EntryPoints documentation: https://doc.traefik.io/traefik/v3.0/routing/entrypoints/
- Traefik ACME certificate resolver documentation: https://doc.traefik.io/traefik/reference/install-configuration/tls/certificate-resolvers/acme/
- Traefik Docker provider documentation: https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/
- Traefik v3.1 Docker provider IPv4/IPv6 documentation: https://doc.traefik.io/traefik/v3.1/providers/docker/
- Traefik IngressRoute CRD documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- Traefik Headers middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/headers/
- Traefik IPAllowList middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/ipallowlist/
- Traefik API documentation: https://doc.traefik.io/traefik/reference/install-configuration/api-dashboard/
- Docker Compose services and ports documentation: https://docs.docker.com/reference/compose-file/services/
- Docker Compose networks documentation: https://docs.docker.com/reference/compose-file/networks/
- Docker IPv6 networking documentation: https://docs.docker.com/engine/daemon/ipv6/
- Docker Compose CLI documentation: https://docs.docker.com/reference/cli/docker/compose/
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- RFC 4193 Unique Local IPv6 Unicast Addresses: https://www.rfc-editor.org/rfc/rfc4193

## Issues Found
- The static Traefik YAML defined `entryPoints` twice, which would overwrite or invalidate the intended entry point configuration. Merged `forwardedHeaders.trustedIPs` into the existing `websecure` entry point.
- The specific-address IPv6 entry point reused port 80 while `web` already listened on `[::]:80`, creating a likely bind conflict. Changed the example to use a distinct port.
- Two IPv6 examples contained non-hex text: `2001:db8:lb::/48` and `fd00:traefik::/64`. Replaced them with syntactically valid IPv6 CIDRs.
- The Docker Compose example referenced the `letsencrypt` certificate resolver in router labels without defining that resolver in the Traefik command. Added the matching ACME resolver flags and persistent storage mount.
- The Docker port publishing example included both bare host port mappings and `[::]` mappings for the same ports. Docker's IPv6 documentation shows a single `80:80` mapping can publish on IPv4 and IPv6 when IPv6 is enabled, so the duplicate mappings were removed.
- The middleware section claimed to extract the real IPv6 client IP, but the shown middleware only adds a request header; Traefik handles forwarded-header trust on the entry point. Updated the heading and comment to match the actual behavior.
- The verification command used `docker logs traefik`, but the provided Compose file does not set `container_name: traefik`. Changed it to `docker compose logs traefik`, which targets the Compose service.
- The API verification command assumed Traefik's API was enabled and published on port 8080. Added that prerequisite to the command comment.
- The conclusion overstated Docker backend IPv6 behavior. Traefik's Docker provider prefers the IPv4 container IP when one exists, so the conclusion now explains when Docker backend dialing will use IPv6.
- The Kubernetes conclusion implied the Service setting alone exposes IPv6 endpoints. Updated it to note that the cluster and pods also need dual-stack support.

## Review Notes
- `2001:db8::/32` is retained only as a documentation prefix and the post now tells readers to replace it with their real organization range.
- `traefik:v3.0` is still valid for the examples checked, but it is not the latest Traefik v3 line as of this review.
