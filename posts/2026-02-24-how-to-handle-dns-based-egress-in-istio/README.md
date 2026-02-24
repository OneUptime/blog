# How to Handle DNS-Based Egress in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Egress, DNS, Kubernetes, Networking

Description: Understand how DNS resolution works for egress traffic in Istio and how to properly configure ServiceEntries for DNS-based external endpoints.

---

DNS resolution for egress traffic in Istio can be confusing. When a pod tries to reach an external hostname like `api.example.com`, several things happen: the application resolves the hostname through DNS, the sidecar proxy intercepts the outgoing connection, and Istio decides how to route it based on the configured ServiceEntries. Getting this right requires understanding how Istio handles DNS at the proxy level.

This guide explains the DNS resolution strategies for egress traffic and shows you how to configure them correctly for different scenarios.

## How Istio Handles DNS for Egress

When a pod makes an outbound connection to an external hostname, here is what happens:

1. The application performs a DNS lookup through the standard Kubernetes DNS (CoreDNS).
2. For external hostnames, CoreDNS forwards the query to an upstream DNS server.
3. The application gets back an IP address and initiates a TCP connection.
4. The sidecar proxy (Envoy) intercepts the connection.
5. Envoy matches the destination against its listener configuration, which is built from ServiceEntries.

The important thing to understand is that Istio needs to match the outbound connection to a ServiceEntry. How it does this depends on the protocol and the `resolution` setting.

## Resolution Strategies

ServiceEntries support three resolution strategies:

### DNS Resolution

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
  - api.example.com
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

With `resolution: DNS`, Istio's control plane resolves the hostname and programs the Envoy proxy with the resulting IP addresses. Envoy uses these IPs as upstream endpoints. The proxy refreshes the DNS resolution periodically (based on the DNS TTL).

This is the most common setting and works well for external services with stable DNS records.

### NONE Resolution

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: wildcard-external
  namespace: default
spec:
  hosts:
  - "*.example.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: NONE
```

With `resolution: NONE`, Istio does not resolve the hostname at all. It relies on the original destination IP from the application's own DNS resolution. This is required for wildcard hosts because you cannot resolve a wildcard DNS entry.

Use `NONE` when:
- You are using wildcard hosts
- The service resolves to many different IPs (like a CDN)
- You want the application to handle DNS resolution entirely

### STATIC Resolution

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: static-external
  namespace: default
spec:
  hosts:
  - legacy-partner-api.com
  addresses:
  - 203.0.113.50
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: STATIC
  endpoints:
  - address: 203.0.113.50
```

With `resolution: STATIC`, you provide the IP addresses directly. This is useful when the external service has a fixed IP address or when DNS is unreliable.

## DNS Proxy in Istio

Istio includes a DNS proxy feature in the sidecar that can intercept DNS queries from the application. This is useful for handling edge cases where the standard DNS resolution flow does not work well.

Enable the DNS proxy in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

With DNS capture enabled, the sidecar proxy intercepts DNS queries from the application. When `DNS_AUTO_ALLOCATE` is true, Istio automatically assigns virtual IPs to ServiceEntries that do not have addresses specified. This solves several problems:

- **TCP traffic to external services**: Without a virtual IP, Istio cannot distinguish between different external services on the same port for plain TCP traffic. Auto-allocation assigns unique virtual IPs so Envoy can route correctly.
- **Wildcard matching**: DNS capture allows Istio to see the actual hostname being resolved, improving matching for wildcard ServiceEntries.

## Handling Multiple Ports

External services sometimes use non-standard ports. Make sure your ServiceEntry matches the actual port:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api-custom-port
  namespace: default
spec:
  hosts:
  - api.partner.com
  ports:
  - number: 8443
    name: tls
    protocol: TLS
  - number: 443
    name: https
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

## DNS Refresh and TTL

When using `resolution: DNS`, Istio respects the TTL from the DNS response when deciding how often to re-resolve. But Envoy also has its own DNS refresh rate. If you are connecting to a service that changes IPs frequently (like a service behind a load balancer that scales), you might need to adjust the refresh rate.

You can configure this through a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api-dr
  namespace: default
spec:
  host: api.example.com
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 10s
```

For services with very short DNS TTLs, the DNS proxy mode (`ISTIO_META_DNS_CAPTURE`) is often more reliable because it refreshes at the sidecar level.

## Troubleshooting DNS Issues

### Check what the sidecar knows

You can inspect the Envoy configuration on a sidecar to see how it resolved a ServiceEntry:

```bash
istioctl proxy-config clusters deploy/my-app --fqdn api.example.com
```

This shows the cluster configuration including the resolved endpoints.

```bash
istioctl proxy-config endpoints deploy/my-app --cluster "outbound|443||api.example.com"
```

This shows the actual IP addresses that Envoy will use for the external service.

### DNS resolution failures

If the sidecar cannot resolve a hostname, the cluster will show no endpoints:

```bash
istioctl proxy-config endpoints deploy/my-app | grep example.com
```

If nothing appears, the ServiceEntry might not be propagated yet. Check if it is recognized:

```bash
istioctl proxy-config listeners deploy/my-app --port 443
```

### Stale DNS entries

If an external service changes its IP address and your connections are failing, the DNS cache in the proxy might be stale. You can force a refresh by restarting the sidecar:

```bash
kubectl rollout restart deploy/my-app
```

Or if you have DNS proxy enabled, it will pick up changes based on the DNS TTL.

## Working with Internal DNS Names

If your external service is reachable through a DNS name that your cluster DNS can resolve (like an on-premises service accessible through a VPN), use the same ServiceEntry pattern but with `resolution: DNS`:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: on-prem-service
  namespace: default
spec:
  hosts:
  - internal-api.corp.mycompany.com
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

Make sure CoreDNS in your cluster can resolve the hostname, either through a forward zone or by configuring an upstream DNS server that knows about the internal domain.

## Best Practices

**Use DNS resolution unless you have a reason not to**: `resolution: DNS` is the safest default. It lets Istio handle DNS and keeps things predictable.

**Enable DNS capture for complex setups**: If you have many external services, wildcard entries, or TCP-based protocols, the DNS proxy feature simplifies configuration significantly.

**Monitor DNS resolution failures**: DNS issues are a common source of egress problems. Check the `pilot_dns_requests_total` and `pilot_dns_failures_total` metrics in istiod to see if there are resolution problems.

**Be careful with wildcard entries**: Wildcards are convenient but they reduce your visibility. You do not know which specific subdomains are being accessed. Use them only when the set of subdomains is truly dynamic and cannot be enumerated.

DNS handling in Istio can feel complex, but once you understand the three resolution modes and when to use each one, configuring egress for DNS-based services becomes straightforward.
