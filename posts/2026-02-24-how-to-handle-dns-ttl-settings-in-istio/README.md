# How to Handle DNS TTL Settings in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DNS, TTL, Envoy, Kubernetes, Networking

Description: Understanding and configuring DNS TTL behavior in Istio to balance resolution freshness with performance for both internal and external services.

---

DNS TTL (Time To Live) controls how long a DNS response is cached before the client queries again. In an Istio mesh, there are multiple caching layers, and each one has its own TTL behavior. Getting this wrong can lead to traffic going to stale IP addresses after a backend migration, or excessive DNS query volume that hurts performance. Understanding how TTL works at each layer helps you make better configuration choices.

## DNS Caching Layers in Istio

When a pod in an Istio mesh resolves a hostname, the DNS response passes through several caching layers:

1. **Application-level cache**: Many applications and language runtimes cache DNS results (like the JVM's InetAddress cache)
2. **System resolver cache**: The libc resolver in the container may cache results
3. **Istio DNS proxy cache** (if enabled): The sidecar caches DNS responses
4. **CoreDNS cache**: The cluster DNS server caches responses
5. **Envoy DNS cache**: For ServiceEntry with `resolution: DNS`, Envoy does its own DNS resolution and caching

Each layer can have different TTL settings, and they don't always agree with each other.

## CoreDNS TTL Settings

CoreDNS has two relevant TTL settings. The first is the TTL it assigns to Kubernetes service records:

```text
kubernetes cluster.local in-addr.arpa ip6.arpa {
   pods insecure
   fallthrough in-addr.arpa ip6.arpa
   ttl 30
}
```

The `ttl 30` means Kubernetes service DNS records are served with a 30-second TTL. This is the default and works well for most cases since Kubernetes service IPs don't change often.

The second is the cache plugin TTL:

```text
cache 30 {
    success 9984
    denial 9984
}
```

This caches all DNS responses for up to 30 seconds (or the original TTL, whichever is shorter). For external services, the TTL from the upstream DNS server is preserved.

## Istio DNS Proxy TTL Behavior

When the Istio DNS proxy is enabled, it adds another caching layer. The DNS proxy caches responses from both the Istio service registry and upstream DNS.

For services in the Istio service registry (Kubernetes services and ServiceEntries), the DNS proxy uses its own TTL, which defaults to the value from the service registry (typically 30 seconds for Kubernetes services).

For forwarded queries (names not in the registry), the proxy respects the upstream TTL.

You can see the DNS proxy cache behavior in the stats:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET stats | grep dns
```

## Envoy DNS Resolution TTL

This is the layer most people forget about. When you have a ServiceEntry with `resolution: DNS`, Envoy performs its own DNS resolution independent of the application's DNS. Envoy respects the TTL from the DNS response and re-resolves the name when the TTL expires.

You can configure Envoy's DNS resolution behavior through the cluster configuration. Using EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: dns-refresh-rate
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
  - applyTo: CLUSTER
    match:
      context: SIDECAR_OUTBOUND
      cluster:
        service: api.external-service.com
    patch:
      operation: MERGE
      value:
        dns_refresh_rate: 5s
        respect_dns_ttl: true
```

The key settings are:

- `dns_refresh_rate`: How often Envoy re-resolves the DNS name. This is a floor value. Even if the DNS TTL is shorter, Envoy won't resolve more often than this.
- `respect_dns_ttl`: When true, Envoy uses the DNS TTL for the refresh interval (but not less than `dns_refresh_rate`). When false, Envoy uses `dns_refresh_rate` regardless of TTL.

## Impact of TTL on Service Migrations

DNS TTL becomes critical during service migrations. If you're moving an external service to a new IP address, the old IP will continue receiving traffic until all caches expire. Consider this scenario:

1. External API at `api.example.com` resolves to `1.2.3.4`
2. The API provider migrates to `5.6.7.8`
3. DNS is updated with the new IP
4. But cached entries at various layers still point to `1.2.3.4`

The total time before all traffic shifts depends on the maximum TTL across all caching layers:

```text
Total migration time = max(app_cache_ttl, system_resolver_ttl, istio_dns_proxy_ttl, coredns_cache_ttl, envoy_dns_refresh_rate)
```

## Configuring Low TTL for Frequently Changing Services

For external services that change IPs frequently, you want lower TTLs:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: low-ttl-external
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
  - applyTo: CLUSTER
    match:
      context: SIDECAR_OUTBOUND
      cluster:
        service: dynamic-service.example.com
    patch:
      operation: MERGE
      value:
        dns_refresh_rate: 5s
        respect_dns_ttl: true
```

Also reduce the CoreDNS cache for the specific domain:

```text
dynamic-service.example.com:53 {
    forward . /etc/resolv.conf
    cache 5
}
```

## Configuring High TTL for Stable Services

For services with stable IPs, higher TTLs reduce DNS query volume:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: high-ttl-stable
  namespace: default
spec:
  configPatches:
  - applyTo: CLUSTER
    match:
      context: SIDECAR_OUTBOUND
      cluster:
        service: stable-service.internal.company.com
    patch:
      operation: MERGE
      value:
        dns_refresh_rate: 300s
        respect_dns_ttl: false
```

With `respect_dns_ttl: false` and `dns_refresh_rate: 300s`, Envoy will only re-resolve every 5 minutes regardless of the DNS TTL.

## Handling TTL with ServiceEntry

The resolution strategy in ServiceEntry affects how TTL is used:

### STATIC Resolution
No TTL involved. Endpoints are fixed:
```yaml
spec:
  resolution: STATIC
  endpoints:
  - address: 10.0.1.50
```

### DNS Resolution
TTL matters. Envoy resolves and caches based on TTL:
```yaml
spec:
  resolution: DNS
  hosts:
  - api.example.com
```

### NONE Resolution
TTL from the application's DNS query. Envoy uses the original destination:
```yaml
spec:
  resolution: NONE
```

## Monitoring DNS TTL Behavior

To see how often DNS resolution is happening:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET stats | grep dns_resolve
```

Look for metrics related to DNS resolution frequency and cache behavior. If you see high resolution rates for services that should have stable IPs, your TTLs might be too low.

## Application-Level TTL Considerations

Remember that the application's own DNS caching can override everything you configure at the infrastructure level:

- **JVM**: Default TTL is 30 seconds (set by `networkaddress.cache.ttl` in `java.security`)
- **Go**: No caching by default, resolves every time
- **Python**: Depends on the HTTP library (requests uses system resolver)
- **Node.js**: Default TTL of 0 (no caching), configurable via `dns.setDefaultResultOrder()`

For JVM applications, you might want to lower the cache TTL:

```text
-Dnetworkaddress.cache.ttl=10
```

DNS TTL management in Istio is about finding the right balance between freshness and performance at each caching layer. For most internal services, the defaults work fine. For external services with changing IPs, you'll want to pay more attention to the TTL settings across all layers.
