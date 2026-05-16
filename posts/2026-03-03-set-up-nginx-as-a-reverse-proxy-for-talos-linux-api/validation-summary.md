# Validation Summary: How to Set Up Nginx as a Reverse Proxy for Talos Linux API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- Nginx stream module
- TCP reverse proxying and load balancing
- gRPC over TLS
- Kubernetes API server
- kubectl

## Sources Consulted
- Talos Linux network connectivity documentation: https://docs.siderolabs.com/talos/v1.12/learn-more/talos-network-connectivity
- Talos Linux troubleshooting documentation for Talos API endpoints and TCP load balancers: https://docs.siderolabs.com/talos/v1.11/troubleshooting/troubleshooting
- Talos Linux machine configuration reference for `machine.certSANs` and `cluster.apiServer.certSANs`: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux CLI reference for `talosctl gen config`, `talosctl config endpoint`, `talosctl patch`, and `talosctl version`: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux configuration patching documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- NGINX TCP and UDP load balancing documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/tcp-udp-load-balancer/
- NGINX TCP health checks documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/tcp-health-check/
- NGINX stream proxy module reference: https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html
- NGINX stream access control documentation: https://docs.nginx.com/nginx/admin-guide/security-controls/controlling-access-proxied-tcp/

## Issues Found
- The post described Nginx as providing TLS termination for the Talos API. This setup uses TCP stream proxying and should preserve Talos API TLS/mTLS passthrough, so the wording was corrected to "TLS passthrough."
- The post stated that gRPC requires Layer 4 proxying rather than Layer 7 proxying. Nginx can proxy gRPC at Layer 7, but this Talos API setup should use TCP passthrough to preserve Talos TLS authentication and certificate validation. The explanation was corrected.
- The config generation command used `talosgen`, which is not the Talos CLI command. It was changed to `talosctl gen config`.
- The post used the Talos API port `50000` as the `talosctl gen config` cluster endpoint. Talos documents this argument as the Kubernetes API endpoint, so the example was corrected to use port `6443` with a note to use the actual Kubernetes API endpoint.
- The post used `--additional-sans` as if it configured Talos API certificate SANs. Talos documents this flag as adding SANs to the Kubernetes API server certificate, so the post now uses a `machine.certSANs` patch for Talos API SANs and explains the distinction.
- The post used `talosctl apply-config --patch` to patch a running cluster. The Talos patching documentation shows `talosctl patch mc --nodes ... --patch ...` for patching live machine configuration, so the commands were corrected.
- The health check script was introduced as an active health check. Since it only checks connectivity and does not configure Nginx upstream active health checks, the wording was changed to describe it as additional health visibility.
- The Talos API validation command omitted a target node. The command now includes `--nodes 10.0.1.10` while overriding the endpoint with the proxy.
- The Kubernetes API proxy section did not mention that the proxy hostname/IP must be present in the Kubernetes API server certificate SANs. A brief note was added.

## Review Notes
Nginx and talosctl were not installed in the local review environment, so command verification was performed against official documentation rather than local `--help` output. The Nginx stream configuration syntax and directives match the documented stream context examples.
