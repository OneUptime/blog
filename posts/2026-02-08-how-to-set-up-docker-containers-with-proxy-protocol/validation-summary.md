# Validation Summary: How to Set Up Docker Containers with Proxy Protocol

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Docker Swarm
- Proxy Protocol v1 and v2
- HAProxy
- Nginx
- Traefik
- iptables
- Flask

## Sources Consulted
- HAProxy PROXY protocol tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/client-ip-preservation/enable-proxy-protocol/
- HAProxy 2.9 configuration manual: https://docs.haproxy.org/2.9/configuration.html
- HAProxy PROXY protocol specification: https://github.com/haproxy/haproxy/blob/master/doc/proxy-protocol.txt
- NGINX PROXY protocol documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/using-proxy-protocol/
- NGINX logging documentation: https://docs.nginx.com/nginx/admin-guide/monitoring/logging/
- Traefik v3.0 Swarm provider documentation: https://doc.traefik.io/traefik/v3.0/providers/swarm/
- Traefik v3.0 entryPoints documentation: https://doc.traefik.io/traefik/v3.0/routing/entrypoints/
- Traefik v2 to v3 migration documentation: https://doc.traefik.io/traefik/v3.0/migration/v2-to-v3-details/
- Docker Swarm ingress routing mesh documentation: https://docs.docker.com/engine/swarm/ingress/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker iptables documentation: https://docs.docker.com/engine/network/firewall-iptables/

## Issues Found
- The Nginx example placed `log_format` inside a `server` block, but Nginx defines `log_format` in the `http` context. Moved `log_format` above the `server` block in the `/etc/nginx/conf.d/default.conf` example, which is included from the official `nginx:alpine` image's `http` block.
- The Nginx example used `add_header Content-Type ...` after `return`. Replaced those lines with `default_type` before `return` so the returned text and JSON responses have the intended content type without relying on duplicate response-header behavior.
- The Traefik v3 Swarm example used the removed Docker provider `swarmMode` option. Updated it to use the v3 Swarm provider endpoint syntax.
- The Traefik Swarm labels were attached at service level instead of `deploy.labels`, and the required Swarm backend port label was missing. Moved labels under `deploy.labels` and added `traefik.http.services.web.loadbalancer.server.port=80`.
- The TLS wording said Proxy Protocol "wraps" the TLS connection. Updated it to describe the shown HAProxy configuration accurately: TLS is terminated by HAProxy, then Proxy Protocol is sent on the backend connection.
- The multi-layer proxy wording implied the exact Proxy Protocol header is forwarded unchanged. Updated it to explain that each layer accepts Proxy Protocol from the previous proxy and sends a new header to the next backend.
- The debugging table said Proxy Protocol version mismatch causes "Connection refused." Changed this to connection closes or parsing errors, which is more accurate for an application protocol parse mismatch.
- The initial security wording said Proxy Protocol cannot be forged by application-layer attackers. Narrowed the claim to trusted-proxy-only backend access, matching the later security guidance.

## Review Notes
The examples are conceptually correct after the fixes. The iptables example is intentionally simplified; production deployments should adjust source CIDRs, interfaces, rule order, IPv6/nftables handling, and persistence for the target host environment.
