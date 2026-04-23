# Validation Summary: How to Configure Rancher HA with HAProxy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- HAProxy
- RKE2
- Keepalived
- TLS termination and load balancing

## Sources Consulted
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher Architecture Recommendations: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/rancher-manager-architecture/architecture-recommendations
- Setting up a High-availability RKE2 Kubernetes Cluster for Rancher: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/kubernetes-cluster-setup/rke2-for-rancher
- RKE2 High Availability: https://docs.rke2.io/install/ha
- HAProxy Configuration Manual 2.8: https://docs.haproxy.org/2.8/configuration.html
- Keepalived man page: https://www.keepalived.org/manpage.html

## Issues Found
- The primary HAProxy example terminated TLS at HAProxy and forwarded Rancher traffic to backend port `443`. Rancher's current guidance for Rancher Manager on Kubernetes is to start with a Layer 4 load balancer that forwards TCP `80` and `443` to the cluster nodes, so the main configuration was rewritten to match that model.
- The alternative section was labeled as SSL passthrough, but the Rancher-supported alternative is external TLS termination with Rancher installed using `--set tls=external` and backend traffic sent to port `80`. I rewrote that section accordingly and added the required proxy headers.
- The post used `/ping` and expected `pong` for Rancher health checks. Current Rancher docs document `/healthz` as the load-balancer health endpoint returning HTTP `200`, so the checks and verification command were updated.
- The stats example used `curl http://localhost:8404/stats` even though `stats auth` was enabled. I corrected the command to use basic auth.
- The RKE2 backend health check used `option ssl-hello-chk`. I replaced it with `option tcp-check`, which aligns better with current HAProxy health-check guidance and the RKE2 load-balancer use case.
- The certificate creation step assumed `/etc/haproxy/certs` already existed, so I added `mkdir -p /etc/haproxy/certs`.
- The Keepalived process check used `killall -0 haproxy`; I changed it to `pidof haproxy` to avoid depending on `killall` being present.

## Review Notes
- Rancher currently recommends Layer 4 forwarding as the default pattern for Rancher Manager on Kubernetes. External TLS termination remains supported, but only when Rancher is installed with `tls=external`.
- Rancher's external TLS termination docs also warn that direct access from clients to the Rancher cluster nodes would be unencrypted on port `80`, so network access should be restricted to the load balancer in that mode.
- `haproxy` and `keepalived` binaries were not installed in this workspace, so the configuration was verified against official documentation rather than by running local binary validation.
