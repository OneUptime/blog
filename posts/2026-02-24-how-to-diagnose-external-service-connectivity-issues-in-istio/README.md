# How to Diagnose External Service Connectivity Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, External Services, Egress, Troubleshooting

Description: How to troubleshoot and fix connectivity issues when Istio mesh services try to reach external APIs, databases, and third-party endpoints.

---

Your service needs to call an external API, connect to a managed database, or reach a third-party webhook. Inside the mesh, everything works fine. But the external call fails or times out. Istio controls egress traffic by default, and if you have not configured it correctly, external calls get blocked or misrouted.

## Understanding Istio Egress Behavior

By default, Istio allows all outbound traffic from the mesh. But this behavior depends on the `outboundTrafficPolicy` setting:

```bash
# Check the current outbound traffic policy
kubectl get configmap istio -n istio-system -o yaml | grep -A2 outboundTrafficPolicy
```

There are two modes:

- **ALLOW_ANY** (default) - Sidecars pass through traffic to unknown destinations. External calls work without explicit configuration.
- **REGISTRY_ONLY** - Sidecars only allow traffic to services registered in the mesh (Kubernetes services + ServiceEntries). Unknown destinations are blocked.

If you are in `REGISTRY_ONLY` mode, every external service needs a ServiceEntry.

## Quick Connectivity Test

From a pod inside the mesh, try reaching your external service:

```bash
# Test HTTP connectivity
kubectl exec deploy/my-app -c my-app -- curl -v https://api.example.com/health

# Test with timing
kubectl exec deploy/my-app -c my-app -- curl -s -o /dev/null -w "http_code: %{http_code}\ntime_total: %{time_total}\n" https://api.example.com/health
```

If you get a 502 or connection refused, the sidecar is blocking the traffic. If you get a timeout, it could be DNS, routing, or network-level blocking.

## Creating a ServiceEntry

If you are in REGISTRY_ONLY mode or want Istio to apply traffic management to external calls, create a ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: my-namespace
spec:
  hosts:
  - api.example.com
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

For HTTP services:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-http-api
  namespace: my-namespace
spec:
  hosts:
  - httpapi.example.com
  ports:
  - number: 80
    name: http
    protocol: HTTP
  - number: 443
    name: https
    protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
```

## Common ServiceEntry Mistakes

### Wrong Protocol

The protocol must match what the application actually sends. If your app connects to an HTTPS endpoint:

```yaml
# Wrong - protocol is HTTP but the service uses TLS
ports:
- number: 443
  name: https
  protocol: HTTP    # This tells Envoy to expect plaintext on port 443

# Correct - use TLS or HTTPS
ports:
- number: 443
  name: https
  protocol: TLS     # Envoy will pass through the TLS connection
```

Use `TLS` when you want Envoy to pass through the encrypted connection without terminating it. Use `HTTPS` when you want Envoy to originate TLS.

### DNS Resolution Issues

If the ServiceEntry uses `resolution: DNS`, Envoy resolves the hostname and connects to the resolved IP. If DNS resolution fails inside the cluster, the connection fails:

```bash
# Test DNS resolution from the proxy
kubectl exec deploy/my-app -c istio-proxy -- \
  curl -v https://api.example.com 2>&1 | head -20

# Check the proxy's cluster config for the external service
istioctl proxy-config cluster deploy/my-app -n my-namespace | grep api.example.com

# Check endpoints (should show resolved IPs)
istioctl proxy-config endpoint deploy/my-app -n my-namespace | grep api.example.com
```

If endpoints show `0.0.0.0`, DNS resolution failed. Check DNS settings:

```bash
# Test DNS from inside the pod
kubectl exec deploy/my-app -c istio-proxy -- nslookup api.example.com
```

### Missing Wildcard Configuration

For services that use multiple subdomains:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-wildcard
spec:
  hosts:
  - "*.example.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
```

Note: `resolution: NONE` is required for wildcard hosts because Envoy cannot resolve a wildcard hostname.

## Checking Envoy Access Logs

Access logs show exactly what happens to external requests:

```bash
kubectl logs deploy/my-app -c istio-proxy --tail=100 | grep "api.example.com"
```

Look for:

- **Response code 502** - Usually means Envoy could not connect to the upstream
- **Response code 503** - Upstream is unreachable or circuit breaker tripped
- **Flag NR** - No route matched (ServiceEntry missing or misconfigured)
- **Flag UF** - Upstream connection failure
- **Flag DC** - Downstream connection terminated

## Egress Gateway Issues

If you are routing external traffic through an egress gateway, there are additional failure points:

```bash
# Check egress gateway is running
kubectl get pods -n istio-system -l istio=egressgateway

# Check egress gateway logs
kubectl logs deploy/istio-egressgateway -n istio-system --tail=50
```

Verify the egress routing configuration:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: egress-gateway
  namespace: istio-system
spec:
  selector:
    istio: egressgateway
  servers:
  - port:
      number: 443
      name: tls
      protocol: TLS
    hosts:
    - api.example.com
    tls:
      mode: PASSTHROUGH
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: route-through-egress
spec:
  hosts:
  - api.example.com
  gateways:
  - mesh
  - istio-system/egress-gateway
  tls:
  - match:
    - gateways:
      - mesh
      port: 443
      sniHosts:
      - api.example.com
    route:
    - destination:
        host: istio-egressgateway.istio-system.svc.cluster.local
        port:
          number: 443
  - match:
    - gateways:
      - istio-system/egress-gateway
      port: 443
      sniHosts:
      - api.example.com
    route:
    - destination:
        host: api.example.com
        port:
          number: 443
```

## Applying Traffic Policies to External Services

Once you have a ServiceEntry, you can apply DestinationRules for timeouts, retries, and connection pooling:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api-policy
spec:
  host: api.example.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
      http:
        http1MaxPendingRequests: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
```

## Debugging IP-Based External Services

Some external services are accessed by IP rather than hostname (like managed databases on private networks):

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-db
spec:
  hosts:
  - external-db.local    # Arbitrary hostname for internal reference
  addresses:
  - 10.0.100.50/32       # Actual IP address
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  resolution: STATIC
  location: MESH_EXTERNAL
  endpoints:
  - address: 10.0.100.50
```

## Systematic Debugging

1. Check the outbound traffic policy mode (ALLOW_ANY vs REGISTRY_ONLY)
2. Test direct connectivity from the pod
3. Look at access logs for response flags
4. Verify ServiceEntry exists and has correct protocol/ports
5. Check DNS resolution for the external host
6. Verify endpoints are populated in proxy config
7. Check for egress gateway routing issues if applicable
8. Look for DestinationRule TLS mode mismatches
9. Check NetworkPolicies that might block egress traffic

External connectivity in Istio comes down to making sure the proxy knows about the destination and can reach it. ServiceEntries are the key mechanism for this, and getting the protocol and resolution settings right solves most problems.
