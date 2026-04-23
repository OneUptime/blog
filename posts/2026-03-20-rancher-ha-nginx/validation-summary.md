# Validation Summary: How to Configure Rancher HA with NGINX

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- NGINX
- NGINX `stream` and `http` modules
- TLS/SSL termination
- WebSocket proxying
- Passive upstream health checks

## Sources Consulted
- Rancher Helm chart options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher layer-7 NGINX example for TLS termination: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/advanced-user-guides/configure-layer-7-nginx-load-balancer
- Rancher NGINX load balancer reference: https://ranchermanager.docs.rancher.com/v2.8/how-to-guides/new-user-guides/infrastructure-setup/nginx-load-balancer
- RKE2 high-availability installation guide: https://docs.rke2.io/install/ha
- RKE2 networking requirements: https://docs.rke2.io/install/requirements
- NGINX HTTP health checks documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-health-check/
- NGINX `map` module documentation: https://nginx.org/en/docs/http/ngx_http_map_module.html
- NGINX core directives (`load_module`, `user`): https://nginx.org/en/docs/ngx_core_module.html
- NGINX WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html

## Issues Found
- The post described TLS termination at NGINX but proxied Rancher traffic to backend port `443` over `https`. Current Rancher guidance for external TLS termination is to install Rancher with `tls=external` and send the load balancer to backend `80`, so I updated the prerequisites, upstream ports, and `proxy_pass` targets accordingly.
- The reverse-proxy example omitted the `X-Forwarded-Port` header, which Rancher documents as required for external TLS termination. I added `proxy_set_header X-Forwarded-Port $server_port;`.
- The health-check examples used `/ping`. Current Rancher documentation for ingress-backed HA installations documents `/healthz` for load balancer health checks, so I changed the location block and verification command to `/healthz`.
- Step 4 redefined `upstream rancher_servers` in a separate file. That would make the NGINX configuration invalid because the same upstream would be declared twice. I changed the step to explicitly update the existing upstream block instead of creating a duplicate definition.
- The active health-check explanation implied a generic “nginx-plus or lua module” requirement. Official NGINX documentation states active upstream health checks are an NGINX Plus feature, so I corrected the wording to reflect that and kept the example on passive checks for NGINX Open Source.
- The post relied on the `stream` module without accounting for distros that ship it as a dynamic module. I added module include lines and clarified the installation step so the `stream {}` block is compatible with common packaged layouts.
- The RKE2 fixed-registration-address requirement was missing. I added the `tls-san` prerequisite because RKE2 documents it as necessary to avoid certificate errors when using a load balancer hostname or IP.
- The examples mixed Debian/Ubuntu and RHEL/CentOS service-account assumptions. I clarified the NGINX worker-user comment and added a note to the logrotate example so the distro-specific account can be adjusted safely.

## Review Notes
- Rancher still recommends a Layer 4 load balancer as the default option for HA management clusters; this post is valid for the narrower case where TLS is intentionally terminated at NGINX.
- Live `nginx -t` validation was not run in the repository environment because the post references host-level paths, certificates, service accounts, and private IP addresses that do not exist in the repo.
