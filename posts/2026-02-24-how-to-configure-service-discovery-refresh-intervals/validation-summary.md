# Validation Summary: How to Configure Service Discovery Refresh Intervals

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy xDS
- ServiceEntry
- DestinationRule
- ProxyConfig
- CoreDNS
- Prometheus

## Sources Consulted
- Istio command and environment variable reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio DNS behavior documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns/
- Istio DNS proxying documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio ProxyConfig reference: https://preliminary.istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio performance and scalability documentation: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Kubernetes readiness probe documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- CoreDNS cache plugin documentation: https://coredns.io/plugins/cache/

## Issues Found
- The Istio debounce examples used numeric strings such as `"100"` and `"10000"` for duration-valued environment variables. Changed them to duration strings such as `"100ms"` and `"10s"` to match Istio's documented time duration format.
- The post stated that `resolution: DNS` ServiceEntries rely on DNS TTL and that Istio respects the DNS server TTL for refresh intervals. Changed this to Istio's documented behavior: the proxy resolves these hostnames periodically on a fixed 30-second interval, separate from application DNS lookups.
- The CoreDNS `cache 30` explanation implied an exact 30-second cache period and tied it to Istio proxy DNS refresh. Changed it to "up to 30 seconds" and clarified that it affects DNS load and application-side DNS freshness, not Istio proxy-side ServiceEntry DNS refresh.
- The `ProxyConfig` section implied that `environmentVariables` controls xDS reconnect behavior and used `networking.istio.io/v1`. Changed the API version to `networking.istio.io/v1beta1` and clarified that the example enables DNS capture metadata, not xDS reconnect timing.

## Review Notes
The Kubernetes readiness probe, EndpointSlice/event-driven discovery, DestinationRule outlier detection fields, Istio metrics names, and scaling guidance were consistent with the official documentation. The CoreDNS recommendations should be treated as application DNS tuning guidance rather than a way to tune Istio proxy DNS refresh for `resolution: DNS` ServiceEntries.
