# Validation Summary: How to Handle DNS TTL Settings in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- CoreDNS
- Kubernetes DNS
- ServiceEntry
- EnvoyFilter
- Java DNS caching
- Go DNS resolution
- Python DNS resolution
- Node.js DNS APIs

## Sources Consulted
- Istio Understanding DNS documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns/
- Istio DNS Proxying documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio Envoy Statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Envoy service discovery documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/service_discovery
- Envoy Cluster API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto.html
- CoreDNS kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- CoreDNS cache plugin documentation: https://coredns.io/plugins/cache/
- Oracle Java networking properties documentation: https://docs.oracle.com/en/java/javase/15/docs/api/java.base/java/net/doc-files/net-properties.html
- Node.js DNS API documentation: https://nodejs.org/api/dns.html
- Go net package documentation: https://pkg.go.dev/net

## Issues Found
- The post said the container libc resolver may cache DNS results. This was changed to describe node-level resolver caches such as `nscd`, `systemd-resolved`, or `dnsmasq`, because libc itself is not generally the caching layer in Kubernetes containers.
- The CoreDNS `kubernetes` plugin TTL was described as defaulting to 30 seconds. CoreDNS documents a 5-second plugin default when `ttl` is not configured, so the text now distinguishes that default from the common `ttl 30` Kubernetes Corefile setting.
- The CoreDNS cache section said upstream TTLs are preserved. CoreDNS cache uses the record TTL as the cache lifetime and caps it by the configured maximum, so the wording now describes the cap instead of implying the original TTL is always returned unchanged.
- The Istio DNS proxy section claimed specific TTL/cache behavior for registry and forwarded DNS responses. Official Istio docs describe local service mappings and upstream forwarding, so the section was changed to avoid unsupported TTL assertions.
- The Envoy DNS section claimed Istio `resolution: DNS` ServiceEntries respect DNS TTL and can be tuned with EnvoyFilter `dns_refresh_rate` and `respect_dns_ttl`. Istio documents the proxy DNS refresh interval as fixed at 30 seconds and not configurable through supported Istio APIs, so the EnvoyFilter examples were replaced with supported ServiceEntry guidance.
- The low-TTL and high-TTL sections used EnvoyFilter examples that suggested changing Istio ServiceEntry DNS refresh behavior. These were replaced with ServiceEntry examples using `resolution: NONE` for application DNS handling and `exportTo` scoping for stable services.
- The migration-time formula included an Istio DNS proxy TTL and Envoy DNS refresh rate as if they were independently configurable. It now refers to the relevant application/system/CoreDNS cache layers and the Istio proxy DNS refresh interval when `resolution: DNS` is used.
- The monitoring command searched for `dns_resolve`, which is not the documented Envoy cluster DNS statistic naming. It now searches for DNS-related stats and Envoy cluster update counters such as `update_attempt`, `update_success`, and `update_failure`.
- The JVM section stated a fixed 30-second default. Oracle documents the default as implementation-specific without a security manager and cache-forever with one, so the wording was corrected.
- The Node.js section said DNS TTL was configurable with `dns.setDefaultResultOrder()`. Node.js documents that API as controlling address ordering, not TTL caching, so the text now explains that `dns.lookup()` delegates to the system resolver and `dns.resolve4()`/`dns.resolve6()` can return TTL values with the `ttl` option.

## Review Notes
Envoy's native STRICT_DNS and LOGICAL_DNS clusters do have `dns_refresh_rate` and `respect_dns_ttl` behavior, but Istio's documented ServiceEntry DNS behavior is more constrained. EnvoyFilter can patch generated Envoy resources, but Istio explicitly warns that EnvoyFilter configuration is advanced and version-sensitive, so it should not be presented as the normal way to manage DNS TTL behavior.
