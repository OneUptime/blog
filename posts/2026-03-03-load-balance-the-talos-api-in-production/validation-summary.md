# Validation Summary: How to Load Balance the Talos API in Production

## Status
validated

## Post Type
Tutorial / Production guide

## Technologies Covered
- Talos Linux (machine config, VIP feature, talosctl, certSANs, controlPlane endpoint)
- Kubernetes API (port 6443)
- HAProxy (TCP mode, tcp-check, balance roundrobin/leastconn, stats page)
- Keepalived (VRRP, vrrp_script, virtual_ipaddress)
- AWS Network Load Balancer (elbv2 CLI: create-target-group, create-load-balancer, create-listener, register-targets)
- Prometheus alerting rules (HAProxy exporter metrics)
- gRPC over HTTP/2 (long-lived connection considerations)

## Sources Consulted
- Talos VIP documentation: https://docs.siderolabs.com/talos/v1.7/networking/vip/ (etcd-based election, Layer 2 requirement)
- Kubernetes API documentation: https://kubernetes.io/docs/concepts/overview/kubernetes-api/ (confirms HTTP/REST, not gRPC for client-facing API)
- HAProxy configuration manual: https://docs.haproxy.org/2.8/configuration.html (balance algorithms, tcp-check, timeout directives)
- Talos machine config reference (VIP / certSANs / controlPlane.endpoint schema)
- AWS ELBv2 CLI reference (create-target-group, create-load-balancer, create-listener, register-targets)
- Keepalived VRRP / vrrp_script reference
- HAProxy native Prometheus exporter metric names (haproxy_backend_active_servers)

## Issues Found
1. **Incorrect protocol claim for Kubernetes API.** The post originally said "Both [Talos API and Kubernetes API] are gRPC-based and use TLS." The Kubernetes API is HTTP/REST (with JSON or protobuf serialization), not gRPC. Updated the line to clarify that the Talos API is gRPC and the Kubernetes API is HTTP/REST, while noting both use TLS over HTTP/2 and benefit from Layer 4 (TCP) load balancing.
2. **Incorrect description of Talos VIP advertisement mechanism.** The post said "The VIP uses ARP or BGP to advertise the floating IP." The Talos built-in VIP feature uses an etcd-based election among control plane nodes and the active node advertises the IP via gratuitous ARP only — there is no native BGP mode in the Talos VIP feature. Rewrote the sentence to reflect the etcd election plus gratuitous ARP, and tightened the related Cons bullet from "(for ARP mode)" to "(since it uses ARP)" to remove the implication that other modes exist.
3. **Wrong HAProxy keyword for least-connections balancing in prose.** The bullet referenced "The `least_conn` algorithm" (NGINX spelling) while the HAProxy config example one paragraph below correctly used `leastconn`. Updated the bullet to `leastconn` to match HAProxy syntax and the example.

## Review Notes
- The HAProxy config snippets are syntactically correct: `mode tcp`, `option tcp-check`, `balance roundrobin`/`leastconn`, and `server ... check inter 5s fall 3 rise 2` all match current HAProxy syntax.
- The Keepalived VRRP configuration is valid; `killall -0 haproxy` correctly signals signal 0 to check whether the process is alive without affecting it. Primary/backup priority values (101/100) and matching `virtual_router_id` are correct.
- The AWS ELBv2 CLI command structure is correct for creating an internal NLB with TCP listener and TCP health checks; the `--targets Id=...` syntax is the correct shorthand form.
- The Talos machine config snippets (interfaces.vip.ip, certSANs, cluster.controlPlane.endpoint) align with the current Talos machine config schema.
- `talosctl config endpoint ...` and the endpoint-vs-nodes distinction described in the "Configuring talosctl" section are accurate: the endpoint terminates the gRPC connection and proxies to the target node specified by `--nodes`.
- `haproxy_backend_active_servers` is a real metric exposed by the HAProxy native Prometheus exporter (HAProxy 2.0+), so the alert rules will work as written when the exporter is enabled.
- Version caveat: the post does not pin a specific Talos version. Schema fields used (interfaces[].vip.ip, certSANs, cluster.controlPlane.endpoint) have been stable across recent Talos 1.x versions, but readers on much older or much newer Talos releases should still cross-check the machine config reference for their version.
