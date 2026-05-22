# Validation Summary: How to Configure DNS Resolution in Istio

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Istio DNS proxying
- Istio ServiceEntry
- IstioOperator and Helm installation values
- Kubernetes Deployments and pod annotations
- istioctl proxy-config diagnostics
- Envoy DNS resolution behavior

## Sources Consulted
- Istio DNS proxying guide: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio DNS behavior guide: https://istio.io/latest/docs/ops/configuration/traffic-management/dns/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio 1.8 upgrade notes: https://istio.io/latest/news/releases/1.8.x/announcing-1.8/upgrade-notes/
- Istio 1.25 change notes: https://istio.io/latest/news/releases/1.25.x/announcing-1.25/change-notes/
- Istio wildcard DYNAMIC_DNS blog: https://istio.io/latest/blog/2026/egress-dynamic-dns/
- Istio istiod Helm chart values: https://github.com/istio/istio/blob/master/manifests/charts/istio-control/istio-discovery/values.yaml

## Issues Found
- The post used `ISTIO_META_DNS_AUTO_ALLOCATE`, which Istio 1.25 deprecates in favor of the newer IP auto-allocation controller. Replaced it with `PILOT_ENABLE_IP_AUTOALLOCATE` in the IstioOperator and Helm examples, using the current `env` Helm value for istiod, and removed the deprecated per-workload proxy metadata example.
- The Helm command had to remain syntactically valid after changing the settings. Updated the command so the final `--set` line no longer has a trailing continuation slash.
- The post implied CoreDNS cannot resolve an external ServiceEntry hostname in general. Updated the wording to distinguish public DNS names from custom hostnames known only to Istio.
- The `resolution: DNS` explanation said Istio refreshes DNS results based on TTL. Updated it to match Istio documentation: proxy DNS resolution is asynchronous and currently uses a fixed 30-second refresh interval.
- The `DNS_ROUND_ROBIN` explanation described regular round-robin behavior over DNS results. Updated it to match the ServiceEntry reference: it uses the first returned IP for new connections and retains existing connections across DNS changes.
- The wildcard ServiceEntry example used `resolution: NONE` as the general recommendation. Updated the TLS wildcard example to `DYNAMIC_DNS`, which is the current Istio feature for wildcard TLS/HTTP destinations, while noting that `NONE` remains appropriate for raw TCP passthrough cases.
- The performance section said the sidecar DNS cache respects TTLs. Reworded it to avoid overstating TTL behavior and to separate application DNS proxying from Envoy's own ServiceEntry DNS resolution.

## Review Notes
The debugging command that calls `pilot-agent request GET /dns_resolve?...` is not highlighted in the current public Istio task docs, but `pilot-agent request` and DNS proxy metrics are documented. The surrounding `istioctl proxy-config` commands and flags are current.
