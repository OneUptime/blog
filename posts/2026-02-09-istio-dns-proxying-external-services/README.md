# Configure Istio DNS Proxying to Resolve External Services from Within the Mesh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, DNS, Service Mesh, External Service, Networking

Description: Learn how to enable and configure Istio's DNS proxy feature to intercept DNS queries from applications and intelligently route traffic to both internal mesh services and external endpoints with.

---

Applications often make DNS lookups to discover services. When you move to a service mesh, you want to maintain this behavior while gaining mesh benefits like mTLS, retries, and circuit breaking. Istio's DNS proxy intercepts DNS queries from your application and returns the correct IP addresses, routing traffic through the mesh data plane.

This guide shows you how to enable DNS proxying and configure it for both internal services and external APIs.

## Understanding Istio DNS Proxying

Without DNS proxying, applications query CoreDNS before opening a connection. Kubernetes services resolve normally and the connection can still be captured by Envoy, but custom ServiceEntry hostnames are not known to CoreDNS unless you add separate DNS configuration. External services require ServiceEntry resources, and applications must use service names defined in those resources.

With DNS proxying enabled, Istio redirects application DNS queries to the sidecar, resolves known mesh and ServiceEntry names using mesh configuration, and forwards unknown names to the upstream resolver from `/etc/resolv.conf`. This enables transparent mesh integration without changing application code.

## Enabling DNS Proxying

Enable DNS capture globally during Istio installation:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-dns-proxy
  namespace: istio-system
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"

  values:
    pilot:
      env:
        PILOT_ENABLE_IP_AUTOALLOCATE: "true"
```

Apply the configuration:

```bash
istioctl install -f istio-dns-config.yaml
```

Enable per-workload using a pod template annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
      annotations:
        proxy.istio.io/config: |
          proxyMetadata:
            ISTIO_META_DNS_CAPTURE: "true"
    spec:
      containers:
      - name: api-gateway
        image: busybox:1.36
        command: ["sleep", "365d"]
```

## Configuring ServiceEntry for External Services

Define external services that the DNS proxy can resolve:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api-stripe
  namespace: production
spec:
  hosts:
  - api.stripe.com
  ports:
  - number: 443
    name: https
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

Now applications can use `api.stripe.com` directly:

```python
import requests

# Application code unchanged

response = requests.get('https://api.stripe.com/v1/charges')
```

The DNS proxy intercepts the lookup, returns an address the application can connect to, and traffic flows through Envoy where you can apply mesh traffic policy supported for that protocol.

## Auto-Allocating IPs for External Services

For ServiceEntries without explicit `addresses`, Istio can automatically allocate a unique virtual IP from `240.240.0.0/16`. This is especially useful for TCP services, where sidecars need a stable destination IP to distinguish services that share the same port:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: partner-database
  namespace: production
spec:
  hosts:
  - db.partner.example.com
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  location: MESH_EXTERNAL
  resolution: DNS
```

The DNS proxy returns the automatically allocated virtual IP for `db.partner.example.com`, while the sidecar resolves the real upstream address and forwards the TCP connection to the right ServiceEntry.

## Configuring DNS Proxy for Internal Services

The DNS proxy works for mesh services too. Define custom DNS names:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: database-alias
  namespace: production
spec:
  hosts:
  - db.internal.company.com
  addresses:
  - 10.96.0.50
  ports:
  - number: 5432
    name: postgres
    protocol: TCP
  location: MESH_INTERNAL
  resolution: STATIC
  endpoints:
  - address: postgres.data-layer.svc.cluster.local
    ports:
      postgres: 5432
```

Applications can use `db.internal.company.com` which resolves to the Kubernetes service.

## DNS Proxy with Traffic Management

Apply DestinationRule to external services accessed via DNS:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-payment-gateway
  namespace: payments
spec:
  hosts:
  - payment-gateway.partner.com
  ports:
  - number: 443
    name: https
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-gateway-circuit-breaker
  namespace: payments
spec:
  host: payment-gateway.partner.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
```

The DNS proxy ensures traffic routes through Envoy where the connection pool policy applies.

## Debugging DNS Resolution

Check if DNS capture is active:

```bash
istioctl proxy-config listeners api-gateway-xxxxx.production --port 15053
```

Test DNS resolution from within the pod:

```bash
kubectl exec -n production api-gateway-xxxxx -c api-gateway -- \
  nslookup api.stripe.com
```

Verify the query goes through Envoy:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  pilot-agent request GET stats | grep dns
```

Check iptables rules:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  iptables-save | grep 15053
```

## Handling DNS Refresh and Caching

Review DNS refresh behavior for external services:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: cdn-service
  namespace: production
spec:
  hosts:
  - cdn.cloudflare.com
  ports:
  - number: 443
    name: https
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
  # The sidecar periodically resolves DNS ServiceEntries independently of application DNS.
```

The sidecar periodically resolves `resolution: DNS` ServiceEntries on a fixed 30-second interval. DNS proxying affects DNS requests sent by applications; it does not change how the Istio proxy performs its own DNS resolution.

## Multi-Cluster DNS Configuration

Configure DNS for services across multiple clusters:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: remote-cluster-service
  namespace: production
spec:
  hosts:
  - api-service.remote-cluster.global
  addresses:
  - 240.240.1.10
  ports:
  - number: 8080
    name: http
    protocol: HTTP
  location: MESH_INTERNAL
  resolution: STATIC
  endpoints:
  - address: 35.184.0.0  # Remote cluster ingress
    ports:
      http: 15443
```

Applications use `api-service.remote-cluster.global` and traffic routes to the remote cluster through Istio gateways.

## DNS Proxy Performance Tuning

Limit the scope of DNS ServiceEntries to reduce unnecessary proxy DNS lookups:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: scoped-cdn-service
  namespace: production
spec:
  hosts:
  - cdn.cloudflare.com
  exportTo:
  - "."
  ports:
  - number: 443
    name: tls
    protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

The proxy DNS refresh interval for `resolution: DNS` ServiceEntries is fixed at 30 seconds, so reduce DNS query overhead by limiting ServiceEntry visibility with `exportTo` or a `Sidecar`, or by using `resolution: NONE` when that fits the traffic pattern.

## Excluding DNS Traffic

Bypass DNS capture for outbound DNS traffic with sidecar traffic annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
      annotations:
        traffic.sidecar.istio.io/excludeOutboundPorts: "53"
    spec:
      containers:
      - name: api-gateway
        image: busybox:1.36
        command: ["sleep", "365d"]
```

Excluded DNS traffic resolves through the pod's normal DNS configuration.

## Monitoring DNS Proxy Activity

Query DNS statistics:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  pilot-agent request GET stats | grep "dns_cache"

# Example metrics:
# dns_cache.cares.dns.freecount
# dns_cache.cares.dns.total_ares_errors
# dns_cache.cares.dns_cache.dns_query_attempt
# dns_cache.cares.dns_cache.dns_query_failure
```

Create monitoring dashboard:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dns-proxy-dashboard
  namespace: istio-system
data:
  dashboard.json: |
    {
      "panels": [
        {
          "title": "DNS Query Rate",
          "expr": "rate(envoy_dns_cache_dns_query_attempt[5m])"
        },
        {
          "title": "DNS Query Failures",
          "expr": "rate(envoy_dns_cache_dns_query_failure[5m])"
        }
      ]
    }
```

## Common Issues and Solutions

If DNS queries fail, check the listener:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  ss -tulpn | grep 15053
```

Verify iptables redirects DNS traffic:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  iptables -t nat -L -n -v | grep 15053
```

For applications that cache DNS aggressively, reduce application-level cache TTL or restart pods after updating ServiceEntry resources.

## Security Considerations

DNS proxying sees all DNS queries from your application, including potential data exfiltration attempts. Monitor for suspicious patterns:

```promql
# Unusual DNS query volume
rate(envoy_dns_cache_dns_query_attempt[5m]) > 1000

# High DNS failure rate
rate(envoy_dns_cache_dns_query_failure[5m]) /
rate(envoy_dns_cache_dns_query_attempt[5m]) > 0.1
```

Combine DNS proxy with egress gateways to centralize and audit external traffic.

Istio DNS proxying seamlessly integrates service mesh capabilities into DNS-based service discovery, enabling transparent migration to the mesh while maintaining application compatibility.
