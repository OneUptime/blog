# Validation Summary: How to Configure Rancher HA with NGINX - With

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- NGINX
- NGINX stream module
- NGINX Plus health checks
- TCP load balancing
- SSL/TLS passthrough
- Kubernetes API proxying

## Sources Consulted
- NGINX `ngx_stream_upstream_module`: https://nginx.org/en/docs/stream/ngx_stream_upstream_module.html
- NGINX `ngx_stream_upstream_hc_module`: https://nginx.org/en/docs/stream/ngx_stream_upstream_hc_module.html
- NGINX `ngx_stream_log_module`: https://nginx.org/en/docs/stream/ngx_stream_log_module.html
- NGINX `ngx_stream_proxy_module`: https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html
- NGINX `ngx_http_stub_status_module`: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- Rancher Helm chart options / external TLS termination and health checks: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher infrastructure guidance for HA RKE clusters: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/infrastructure-setup/ha-rke1-kubernetes-cluster
- Rancher port requirements: https://ranchermanager.docs.rancher.com/v2.13/getting-started/installation-and-upgrade/installation-requirements/port-requirements

## Issues Found
- The prerequisite version was too low. The post used stream access logging features from `ngx_stream_log_module`, which is documented from NGINX 1.11.4, so I updated the prerequisite accordingly.
- The load-balancer example omitted TCP/80 for Rancher even though Rancher’s HA guidance recommends forwarding both TCP/80 and TCP/443 to the Rancher management nodes. I added the HTTP upstream/listener and marked TCP/6443 as optional for direct Kubernetes API access rather than a default Rancher HA requirement.
- The stream timeout values were much shorter than Rancher’s documented guidance for long-lived sessions. I updated the example to use `proxy_connect_timeout 30s` and `proxy_timeout 1800s`.
- The NGINX Plus health-check example was syntactically incorrect because `health_check` was placed inside the `upstream` block. In stream mode it belongs in the `server` block, and the upstream must use a shared-memory `zone`, so I corrected both.
- The section about enabling active health checks incorrectly referenced `upstream_conf` and implied open-source stream active checks were available that way. I replaced that with the accurate statement that active stream health checks come from `ngx_stream_upstream_hc_module` in NGINX Plus.
- The validation command expected `/healthz` to return the body `ok`, but Rancher documents HTTP `200` for `/healthz`. I changed the check to validate the status code and added the `Host` header so the request targets Rancher correctly through the load balancer.
- The `stub_status` example listened on port 80, which would conflict with the Rancher HTTP listener, and it did not say the snippet belongs in the `http` block. I moved it to a separate localhost listener and clarified the module/context requirement.

## Review Notes
- No live Rancher/NGINX environment was available in this workspace, so validation was documentation-based rather than runtime-tested.
- `stub_status` provides only basic NGINX status visibility; stream-specific active health/status APIs remain commercial NGINX Plus features.
- If a distro packages `ngx_stream_module` as a dynamic module, installation/loading details can vary even though the `nginx -V` check remains a valid way to confirm stream support.
