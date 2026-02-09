# How to Configure Istio DNS Proxying to Resolve External Services from Within the Mesh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, DNS, Service Mesh, External Services, Networking

Description: Learn how to enable and configure Istio's DNS proxy feature to intercept DNS queries from applications and intelligently route traffic to both internal mesh services and external endpoints with proper mTLS and traffic management.

---

Applications often make DNS lookups to discover services. When you move to a service mesh, you want to maintain this behavior while gaining mesh benefits like mTLS, retries, and circuit breaking. Istio's DNS proxy intercepts DNS queries from your application and returns the correct IP addresses, routing traffic through the mesh data plane.

This guide shows you how to enable DNS proxying and configure it for both internal services and external APIs.

## Understanding Istio DNS Proxying

Without DNS proxying, applications query CoreDNS for service IPs and connect directly, bypassing the Envoy proxy for mesh services. External services require ServiceEntry resources but applications must use service names defined in those resources.

With DNS proxying enabled, Envoy intercepts DNS queries on port 53, resolves them using mesh configuration, and returns IPs that route through the sidecar. This enables transparent mesh integration without changing application code.

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
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"

  values:
    global:
      # Enable DNS proxying
      proxy:
        enableCoreDump: false
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
```

Apply the configuration:

```bash
istioctl install -f istio-dns-config.yaml
```

Enable per-namespace using annotation:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    istio-injection: enabled
  annotations:
    proxy.istio.io/config: '{"proxyMetadata":{"ISTIO_META_DNS_CAPTURE":"true"}}'
```

## Configuring ServiceEntry for External Services

Define external services that the DNS proxy can resolve:

```yaml
apiVersion: networking.istio.io/v1beta1
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
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
```

Now applications can use `api.stripe.com` directly:

```python
import requests

# Application code unchanged
response = requests.get('https://api.stripe.com/v1/charges')
```

The DNS proxy intercepts the lookup, returns a routable IP, and traffic flows through Envoy where you can apply retries, timeouts, and circuit breaking.

## Auto-Allocating IPs for External Services

Enable automatic IP allocation for wildcards:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: googleapis
  namespace: production
spec:
  hosts:
  - "*.googleapis.com"
  addresses:
  - 240.240.0.0/16  # Non-routable range for auto-allocation
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
```

The DNS proxy automatically assigns IPs from the 240.240.0.0/16 range, enabling wildcard matching while maintaining unique routing.

## Configuring DNS Proxy for Internal Services

The DNS proxy works for mesh services too. Define custom DNS names:

```yaml
apiVersion: networking.istio.io/v1beta1
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
apiVersion: networking.istio.io/v1beta1
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
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
---
apiVersion: networking.istio.io/v1beta1
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
      http:
        http1MaxPendingRequests: 50
        maxRetries: 3
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

The DNS proxy ensures traffic routes through Envoy where the circuit breaker applies.

## Debugging DNS Resolution

Check if DNS capture is active:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/config_dump | jq '.configs[] | select(."@type" | contains("Listeners")) | .dynamic_listeners[] | select(.active_state.listener.address.socket_address.port_value == 15053)'
```

Test DNS resolution from within the pod:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  nslookup api.stripe.com 127.0.0.1:15053
```

Verify the query goes through Envoy:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/stats | grep dns
```

Check iptables rules:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  iptables-save | grep 15053
```

## Handling DNS TTL and Caching

Configure DNS TTL for external services:

```yaml
apiVersion: networking.istio.io/v1beta1
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
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
  # Envoy will respect upstream TTL
```

The Envoy DNS proxy caches responses based on upstream TTL values. For services with short TTLs, Envoy re-resolves frequently.

## Multi-Cluster DNS Configuration

Configure DNS for services across multiple clusters:

```yaml
apiVersion: networking.istio.io/v1beta1
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

Configure DNS cache size:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio-sidecar-injector
  namespace: istio-system
data:
  values: |
    global:
      proxy:
        dnsRefreshRate: 30s
```

The default refresh rate is 5 seconds. Increase for services with stable IPs to reduce DNS query overhead.

## Excluding Specific Domains

Bypass DNS proxy for certain domains:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio
  namespace: istio-system
data:
  mesh: |
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        # Exclude internal domains
        ISTIO_META_DNS_CAPTURE_EXCLUDE: "local,localhost,cluster.local"
```

Excluded domains resolve through the pod's normal DNS (CoreDNS).

## Monitoring DNS Proxy Activity

Query DNS statistics:

```bash
kubectl exec -n production api-gateway-xxxxx -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "dns_cache"

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
