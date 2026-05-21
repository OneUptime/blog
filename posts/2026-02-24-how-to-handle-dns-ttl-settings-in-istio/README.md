# How to Handle DNS TTL Settings in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DNS, TTL, Envoy, Kubernetes, Networking

Description: Understanding and configuring DNS TTL behavior in Istio to balance resolution freshness with performance for both internal and external services.

---

DNS TTL (Time To Live) controls how long a DNS response is cached before the client queries again. In an Istio mesh, there are multiple caching layers, and each one has its own TTL behavior. Getting this wrong can lead to traffic going to stale IP addresses after a backend migration, or excessive DNS query volume that hurts performance. Understanding how TTL works at each layer helps you make better configuration choices.

## DNS Caching Layers in Istio

When a pod in an Istio mesh resolves a hostname, the DNS response passes through several caching layers:

1. **Application-level cache**: Many applications and language runtimes cache DNS results (like the JVM's InetAddress cache)
2. **System resolver cache**: Node-level caches such as `nscd`, `systemd-resolved`, or `dnsmasq` may cache results when they are in the lookup path
3. **Istio DNS proxy** (if enabled): The sidecar or ztunnel answers names it knows from Istio's registry and forwards other DNS requests upstream
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

The `ttl 30` means Kubernetes service DNS records are served with a 30-second TTL. CoreDNS's `kubernetes` plugin defaults to 5 seconds if `ttl` is not set, but many Kubernetes distributions configure `ttl 30` in the Corefile. This works well for most cases since Kubernetes service IPs don't change often.

The second is the cache plugin TTL:

```text
cache 30 {
    success 9984
    denial 9984
}
```

This caches all DNS responses for up to 30 seconds (or the original TTL, whichever is shorter). For external services, the TTL from the upstream DNS server is used as the cache TTL limit, capped by the CoreDNS cache configuration.

## Istio DNS Proxy TTL Behavior

When the Istio DNS proxy is enabled, it adds another DNS handling layer. DNS requests from the application are redirected to the sidecar or ztunnel proxy.

For services in the Istio service registry (Kubernetes services and ServiceEntries), the proxy can return responses directly from its local service mapping.

For forwarded queries (names not in the registry), the request is sent upstream using the pod's normal `/etc/resolv.conf` configuration.

You can see DNS proxy behavior in the stats:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET stats | grep dns
```

## Envoy DNS Resolution TTL

This is the layer most people forget about. When you have a ServiceEntry with `resolution: DNS`, the Istio proxy performs its own DNS resolution independent of the application's DNS. Istio resolves the configured hostnames periodically and uses those results for requests.

In current Istio, this proxy DNS refresh interval is fixed at 30 seconds and cannot be changed through Istio's supported traffic-management APIs. Envoy has lower-level DNS cluster settings, but relying on EnvoyFilter patches for this is fragile and can break across Istio or Envoy versions.

The practical controls are:

- Use `resolution: NONE` when it is acceptable for the proxy to use the application's resolved destination IP, avoiding proxy-side DNS polling.
- Keep `resolution: DNS` when you need Istio to periodically resolve and load balance across DNS results.
- Limit ServiceEntry visibility with `exportTo` or a `Sidecar` resource if only a small set of workloads need that external service.
- Tune the authoritative DNS TTL and CoreDNS cache for the application DNS path, knowing that the Istio proxy's ServiceEntry DNS refresh is still separate.

## Impact of TTL on Service Migrations

DNS TTL becomes critical during service migrations. If you're moving an external service to a new IP address, the old IP will continue receiving traffic until all caches expire. Consider this scenario:

1. External API at `api.example.com` resolves to `1.2.3.4`
2. The API provider migrates to `5.6.7.8`
3. DNS is updated with the new IP
4. But cached entries at various layers still point to `1.2.3.4`

The total time before all traffic shifts depends on the maximum TTL across all caching layers:

```text
Total migration time = max(app_cache_ttl, system_resolver_cache_ttl, coredns_cache_ttl, istio_proxy_dns_refresh_interval_if_resolution_dns_is_used)
```

## Configuring Low TTL for Frequently Changing Services

For external services that change IPs frequently, you want lower TTLs in the application DNS path:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: dynamic-service
  namespace: default
spec:
  hosts:
  - dynamic-service.example.com
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: NONE
```

Also reduce the CoreDNS cache for the specific domain:

```text
dynamic-service.example.com:53 {
    forward . /etc/resolv.conf
    cache 5
}
```

## Configuring High TTL for Stable Services

For services with stable IPs, higher TTLs reduce DNS query volume. If you control the authoritative DNS records, raise their TTL. If only a few workloads need a DNS ServiceEntry, scope it to those workloads so every proxy in the mesh does not poll the name.

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stable-service
  namespace: default
spec:
  hosts:
  - stable-service.internal.company.com
  exportTo:
  - "."
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: DNS
```

With `exportTo: ["."]`, the ServiceEntry is visible only in its own namespace. You can also use a `Sidecar` resource to restrict which hosts are configured for a workload.

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
Istio resolves the host periodically and caches the result in the proxy:
```yaml
spec:
  resolution: DNS
  hosts:
  - api.example.com
```

### NONE Resolution
TTL comes from the application's DNS query path. The proxy uses the original destination IP:
```yaml
spec:
  resolution: NONE
```

## Monitoring DNS TTL Behavior

To see how often DNS resolution is happening:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET stats | grep -E 'update_attempt|update_success|update_failure|dns'
```

Look for cluster update counters for DNS-backed clusters and DNS proxy metrics. If you see high resolution rates for services that should have stable IPs, your TTLs might be too low or too many proxies may be configured with the same DNS ServiceEntry.

## Application-Level TTL Considerations

Remember that the application's own DNS caching can override everything you configure at the infrastructure level:

- **JVM**: Controlled by the `networkaddress.cache.ttl` security property. The default is implementation-specific when no security manager is installed, and cache-forever when a security manager is installed
- **Go**: No caching by default, resolves every time
- **Python**: Depends on the HTTP library (requests uses system resolver)
- **Node.js**: The built-in `dns.lookup()` path delegates to the system resolver and does not expose DNS TTL caching controls; `dns.resolve4()` and `dns.resolve6()` can return TTL values with the `ttl` option, but caching must be implemented by the application or a library

For JVM applications, set the cache TTL as a security property:

```text
-Dnetworkaddress.cache.ttl=10
```

DNS TTL management in Istio is about finding the right balance between freshness and performance at each caching layer. For most internal services, the defaults work fine. For external services with changing IPs, you'll want to pay more attention to the TTL settings across all layers.
