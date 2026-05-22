# Validation Summary: How to Configure Istio DNS Proxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio DNS proxy
- Istio sidecar mode
- Kubernetes Deployments
- Kubernetes DNS / CoreDNS
- Istio ServiceEntry
- Istio multicluster service discovery
- Prometheus metrics

## Sources Consulted
- Istio DNS Proxying documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio pilot-agent command and metrics reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio 1.25 change notes for DNS auto-allocation deprecation/defaults: https://istio.io/latest/news/releases/1.25.x/announcing-1.25/change-notes/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The post used the deprecated `ISTIO_META_DNS_AUTO_ALLOCATE` proxy metadata setting. Replaced it with `PILOT_ENABLE_IP_AUTOALLOCATE` at the control-plane level and noted that current Istio releases enable it by default.
- The per-workload annotation example attempted to set IP auto-allocation per pod. Removed that setting because IP auto-allocation is controlled by istiod, while per-pod DNS capture uses `ISTIO_META_DNS_CAPTURE`.
- The per-workload Deployment example was missing the required `spec.selector` and matching pod template labels for `apps/v1`. Added `selector.matchLabels` and `template.metadata.labels`.
- The DNS verification command used an unsupported-looking `pilot-agent request GET /dns_resolve?proxyID=...` path. Replaced it with an application-container `nslookup` check and kept the bootstrap inspection command.
- The ServiceEntry example used `networking.istio.io/v1beta1`. Updated it to the current stable `networking.istio.io/v1` API shown in Istio documentation.
- The DNS metrics listed non-matching names (`istio_agent_dns_*`). Updated them to the pilot-agent exported metric names `dns_requests_total`, `dns_upstream_requests_total`, and `dns_upstream_failures_total`.
- The troubleshooting DNS test queried `localhost` from the `istio-proxy` container, which does not reliably test captured application DNS traffic. Changed it to run `nslookup` from the application container.

## Review Notes
The post is now technically aligned with current Istio sidecar-mode DNS proxy documentation. Ambient mode DNS capture is enabled by default in recent Istio releases, but the post is focused on sidecar DNS proxy configuration, so no ambient-mode section was added.
