# Validation Summary: How to Use HAProxy as a Load Balancer for Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- HAProxy
- Kubernetes API server
- keepalived / VRRP
- Linux systemd package management and services

## Sources Consulted
- Talos Linux CLI reference: https://www.talos.dev/latest/reference/cli/
- Talos Linux configuration reference: https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- Talos Linux configuration patching guide: https://www.talos.dev/latest/talos-guides/configuration/patching/
- Talos Linux troubleshooting guide: https://www.talos.dev/v1.11/introduction/troubleshooting/
- Talos Linux network connectivity guide: https://www.talos.dev/v1.11/learn-more/talos-network-connectivity/
- Kubernetes API health endpoint documentation: https://kubernetes.io/docs/reference/using-api/health-checks/
- HAProxy configuration manual: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/
- HAProxy TCP configuration tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/protocol-support/tcp/
- HAProxy health checks tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/
- HAProxy global TLS settings tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/ssl-tls/global-tls-settings/
- Keepalived man page: https://www.keepalived.org/manpage.html
- Ubuntu keepalived.conf man page: https://manpages.ubuntu.com/manpages/xenial/man5/keepalived.conf.5.html

## Issues Found
- The post used `/healthz` for Kubernetes API server health checks and testing. Kubernetes documents `/healthz` as deprecated since v1.16 and recommends `/livez` or `/readyz`; for load-balancer readiness checks, `/readyz` is the appropriate endpoint. Updated the HAProxy HTTPS health-check example and curl test command to use `/readyz`.
- The Talos API HAProxy frontend/backend was described as "optional but recommended." Talos troubleshooting documentation says the VIP should not be used as the Talos API endpoint, and that TCP load balancer endpoints must be included in `.machine.certSANs` if used. Updated the wording to prefer direct Talos endpoints and added a certSAN/endpoints caveat.

## Review Notes
- The HAProxy TCP pass-through configuration, TCP checks, `check`, `fall`, `rise`, `inter`, stats dashboard directives, and `check-ssl verify none` health-check pattern are consistent with HAProxy documentation.
- The `talosctl gen config` command shape and `--config-patch-control-plane` flag are current, and the `/cluster/apiServer/certSANs` patch path matches the Talos configuration schema for Kubernetes API server certificates.
- The keepalived VRRP example is syntactically consistent with keepalived configuration documentation, but production deployments should verify interface names, firewall rules for VRRP, and whether multicast or unicast VRRP is appropriate for the network.
