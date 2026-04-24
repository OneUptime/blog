# Validation Summary: How to Fix 'Connection Reset by Peer' Errors in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine and Docker CLI
- Nginx
- Apache HTTP Server
- Traefik
- Cloudflare and Cloudflare Tunnel
- AWS Application Load Balancer
- Linux networking / MTU configuration

## Sources Consulted
- Portainer reverse proxy docs: https://docs.portainer.io/advanced/reverse-proxy
- Portainer Traefik reverse proxy guide: https://docs.portainer.io/sts/advanced-topics/reverse-proxy/traefik
- Portainer nginx reverse proxy guide: https://docs.portainer.io/sts/advanced-topics/reverse-proxy/nginx
- Portainer CLI configuration options: https://docs.portainer.io/sts/advanced
- Portainer API access / port reference: https://docs.portainer.io/2.21/api/access
- Portainer troubleshooting for console timeout behind reverse proxy: https://docs.portainer.io/sts/faqs/troubleshooting/logs-errors-and-debugging/why-is-my-console-closing-after-a-certain-time
- Nginx WebSocket proxying docs: https://nginx.org/en/docs/http/websocket.html
- Apache `mod_proxy` docs: https://httpd.apache.org/docs/current/mod/mod_proxy.html
- Apache `mod_proxy_wstunnel` docs: https://httpd.apache.org/docs/2.4/mod/mod_proxy_wstunnel.html
- Apache `mod_ssl` docs (`SSLProxyEngine`, proxy TLS behavior): https://httpd.apache.org/docs/trunk/mod/mod_ssl.html
- Apache `mod_headers` docs (`RequestHeader`): https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- Traefik WebSocket docs: https://doc.traefik.io/traefik/master/expose/overview/
- Traefik headers docs: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/headers/
- Traefik servers transport docs: https://doc.traefik.io/traefik/reference/routing-configuration/http/load-balancing/serverstransport/
- Cloudflare WebSockets docs: https://developers.cloudflare.com/network/websockets/
- Cloudflare Tunnel configuration and origin parameters: https://developers.cloudflare.com/tunnel/configuration/ and https://developers.cloudflare.com/tunnel/advanced/origin-parameters/
- Cloudflare Rocket Loader docs: https://developers.cloudflare.com/speed/optimization/content/rocket-loader/
- AWS ALB attribute docs: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html
- AWS ALB target group protocol docs: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- AWS ALB sticky session behavior docs: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html
- AWS CLI reference for `modify-load-balancer-attributes`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-load-balancer-attributes.html
- Docker `docker container logs` reference: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker `docker network inspect` reference: https://docs.docker.com/reference/cli/docker/network/inspect/
- Docker daemon configuration docs: https://docs.docker.com/engine/daemon/ and https://docs.docker.com/reference/cli/dockerd/

## Issues Found
- The post listed `Portainer session timeout` as a common cause, but current Portainer documentation supports reverse-proxy timeout and network-path issues rather than a generic Portainer-side session timeout causing TCP resets. I replaced this with incorrect upstream protocol/port selection (`9000` HTTP vs `9443` HTTPS), which is explicitly documented in Portainer docs.
- The `docker logs` example used a non-canonical argument order and the grep command used an older regex style. I updated them to current Docker CLI syntax and a clearer `grep -Ei` form.
- The Nginx example proxied to `https://localhost:9443`, which adds avoidable upstream TLS/SNI complexity for a reverse proxy. Portainer’s official reverse proxy guides use the HTTP listener on `9000`, so I changed the example to `http://localhost:9000`.
- The Apache example used an older rewrite-based WebSocket pattern, omitted the required `headers` module for `RequestHeader`, and proxied to `9443` without addressing upstream TLS proxy caveats. I updated it to the current `ProxyPass ... upgrade=websocket` approach against `http://localhost:9000/`.
- The Traefik example was misleading in two ways: Traefik supports WebSockets automatically, and the `portainer-headers` middleware was never attached to the router, so it would have had no effect. I replaced the snippet with a minimal valid backend service configuration using `http://portainer:9000/`.
- The Cloudflare section implied Cloudflare’s default WebSocket behavior was itself the problem. Current Cloudflare docs state proxied WebSockets are supported, but the zone WebSocket toggle and tunnel origin TLS settings still matter. I corrected the wording, changed the Tunnel service example to `http://portainer:9000`, and added the self-signed `No TLS Verify` caveat for `https://portainer:9443`.
- The AWS ALB section incorrectly said the target group protocol must be HTTPS. AWS documents both HTTP and HTTPS target groups for ALB. I changed the guidance so the protocol must match the Portainer backend.
- The ALB section also suggested enabling sticky sessions to address these resets. AWS documents that upgraded WebSocket connections are inherently sticky to the selected target, so I removed that implication and replaced it with listener/target-group routing guidance.
- The MTU troubleshooting section assumed an `eth0` interface and overwrote `/etc/docker/daemon.json`, which is unsafe if the file already contains other daemon settings. I replaced this with more portable inspection commands and an edit-in-place instruction for `daemon.json`.
- The conclusion overstated the diagnosis and promised immediate resolution. I toned it down to match the broader set of supported causes in Portainer, Cloudflare, AWS, and Docker documentation.

## Review Notes
- The reverse proxy examples now align with Portainer’s documented reverse-proxy pattern of sending the proxy to Portainer’s HTTP listener on `9000`. If a deployment explicitly disables HTTP with `--http-disabled`, the backend examples would need to be adapted to `9443` with proxy-specific upstream TLS settings.
- The Apache WebSocket fix assumes a current Apache 2.4 release where `mod_proxy_http` handles protocol upgrades via `ProxyPass ... upgrade=websocket`.
- The Traefik notes are valid for current Traefik releases where WebSocket upgrade handling and forwarded headers are automatic.
