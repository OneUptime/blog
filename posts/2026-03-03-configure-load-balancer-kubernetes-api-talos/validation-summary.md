# Validation Summary: How to Configure a Load Balancer for the Kubernetes API in Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes API server
- HAProxy (TCP load balancing)
- nginx (stream module / TCP load balancing)
- keepalived (VRRP / floating VIP)
- talosctl CLI
- Prometheus / haproxy_exporter

## Sources Consulted
- Kubernetes documentation — default API server port 6443: https://kubernetes.io/docs/reference/networking/ports-and-protocols/
- HAProxy configuration manual (health checks, balance algorithms, tcp-check): https://docs.haproxy.org/ and https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/
- HAProxy time format reference (us/ms/s/m/h/d suffixes for `inter`): https://docs.haproxy.org/
- NGINX stream upstream module documentation: https://nginx.org/en/docs/stream/ngx_stream_upstream_module.html
- NGINX stream proxy module: https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html
- Ubuntu package `libnginx-mod-stream`: https://packages.ubuntu.com/jammy/libnginx-mod-stream
- Talos Linux talosctl documentation (`gen config`, `shutdown`, `reboot`): https://docs.siderolabs.com/talos/latest/learn-more/talosctl/
- Talos Linux network connectivity / ports (Talos API on TCP 50000): https://www.talos.dev/latest/learn-more/talos-network-connectivity/
- keepalived configuration manual (vrrp_instance, virtual_ipaddress): https://www.keepalived.org/manpage.html
- HAProxy Prometheus exporter: https://github.com/prometheus/haproxy_exporter

## Issues Found
No technical issues found.

All HAProxy configuration directives (`mode tcp`, `option tcp-check`, `balance roundrobin`, `server ... check fall N rise N inter Ns`, time-suffix `5s`, stats listener on 8404) are valid. The nginx `stream` block with `least_conn`, `max_fails`, `fail_timeout`, `proxy_pass`, `proxy_timeout`, and `proxy_connect_timeout` matches the official module documentation. The `talosctl gen config <cluster-name> <endpoint>` syntax and `talosctl shutdown/reboot --nodes` flags are correct. The keepalived VRRP snippet (state, interface, virtual_router_id, priority, advert_int, authentication, virtual_ipaddress) is syntactically correct. Default ports (Kubernetes API 6443, Talos API 50000) are accurate.

## Review Notes
- HAProxy 2.4+ ships native Prometheus metrics via the built-in `prometheus-exporter` service, which is generally preferred over the separate `haproxy_exporter` sidecar for newer deployments. The post's recommendation to use `haproxy_exporter` still works but is the older approach.
- The `timeout client/server 300s` value is a reasonable default; production deployments with long-running `kubectl exec`/`port-forward`/`watch` sessions sometimes raise these to `1h` or higher to avoid mid-session disconnects. Not incorrect, but worth noting.
- The keepalived example uses a plaintext `auth_pass`; in production this should be treated as a secret and ideally use a configuration-management secret store. Style/security note only, not a technical error.
- The nginx `stream` block snippet is shown in isolation; readers should remember it must sit at the top level of `nginx.conf` (alongside `events` and `http`), not inside `http`. The example labels the file correctly but does not show surrounding context.
