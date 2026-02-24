# How to Handle Dual-Stack Networking in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Dual-Stack, IPv4, IPv6, Networking, Kubernetes

Description: Configure Istio for dual-stack Kubernetes clusters that support both IPv4 and IPv6 traffic simultaneously including services, gateways, and traffic management.

---

Dual-stack networking means your Kubernetes cluster supports both IPv4 and IPv6 simultaneously. Pods get both an IPv4 and an IPv6 address, and services can be reached over either protocol. This is increasingly common as organizations transition to IPv6 while still maintaining IPv4 compatibility. Istio has been adding dual-stack support, and getting it right requires configuration at multiple levels.

## Understanding Dual-Stack in Kubernetes

In a dual-stack cluster, pods have both IPv4 and IPv6 addresses:

```bash
kubectl get pod my-pod -o jsonpath='{.status.podIPs}'
```

Output:

```json
[{"ip":"10.244.1.5"},{"ip":"fd00::5"}]
```

Services can be configured with one or both IP families:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
  - IPv4
  - IPv6
  selector:
    app: my-service
  ports:
  - name: http-api
    port: 8080
```

The `ipFamilyPolicy` options are:
- `SingleStack` - Only one IP family (the first in `ipFamilies`)
- `PreferDualStack` - Dual-stack if available, falls back to single
- `RequireDualStack` - Must be dual-stack, fails if not supported

## Enabling Dual-Stack in Istio

Istio's dual-stack support is configured through the mesh configuration. Enable it with the `ISTIO_DUAL_STACK` environment variable:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_DUAL_STACK: "true"
  values:
    global:
      proxy:
        privileged: false
```

When dual-stack is enabled, Istio's init container sets up both iptables (for IPv4) and ip6tables (for IPv6) redirect rules. The Envoy proxy binds listeners on both `0.0.0.0` and `::`.

Verify the setup:

```bash
# Check IPv4 rules
kubectl exec my-pod -c istio-proxy -- iptables -t nat -L ISTIO_REDIRECT -n

# Check IPv6 rules
kubectl exec my-pod -c istio-proxy -- ip6tables -t nat -L ISTIO_REDIRECT -n
```

Both should show redirect rules pointing to the Envoy proxy ports.

## Service Configuration for Dual-Stack

Create services that work over both IP families:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-api
  namespace: my-app
spec:
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
  - IPv4
  - IPv6
  selector:
    app: my-api
  ports:
  - name: http-api
    port: 8080
    targetPort: 8080
```

Check the allocated cluster IPs:

```bash
kubectl get svc my-api -n my-app -o jsonpath='{.spec.clusterIPs}'
```

Output:

```json
["10.96.50.100","fd00::c832"]
```

The service has both an IPv4 and IPv6 cluster IP. Clients can reach it over either address.

## How Envoy Handles Dual-Stack

With dual-stack enabled, Envoy's listeners bind to both address families. The outbound listener handles connections to both IPv4 and IPv6 service IPs:

```bash
istioctl proxy-config listener deploy/my-client -n my-app -o json | \
  jq '.[].address.socketAddress.address'
```

You should see both `0.0.0.0` and `::` addresses.

Check the endpoints:

```bash
istioctl proxy-config endpoint deploy/my-client -n my-app | grep my-api
```

In a dual-stack setup, you might see both IPv4 and IPv6 endpoints for the same service. Envoy can route to either one.

## Ingress Gateway with Dual-Stack

The ingress gateway service needs dual-stack to accept both IPv4 and IPv6 external traffic:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  type: LoadBalancer
  ipFamilyPolicy: RequireDualStack
  ipFamilies:
  - IPv4
  - IPv6
  selector:
    istio: ingressgateway
  ports:
  - name: http2
    port: 80
    targetPort: 8080
  - name: https
    port: 443
    targetPort: 8443
```

The cloud load balancer needs to support dual-stack too. On AWS, use the NLB with dual-stack:

```yaml
metadata:
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-ip-address-type: "dualstack"
```

On GKE:

```yaml
metadata:
  annotations:
    networking.gke.io/load-balancer-ip-versions: "IPv4,IPv6"
```

## Authorization Policies for Dual-Stack

When writing IP-based authorization policies, you need to account for both address families:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: dual-stack-allow
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
  - from:
    - source:
        ipBlocks:
        - "10.0.0.0/8"
        - "172.16.0.0/12"
        - "192.168.0.0/16"
        - "fd00::/8"
        - "2001:db8::/32"
```

Include both IPv4 and IPv6 ranges. If you only specify IPv4 ranges, IPv6 traffic will not match and will be denied (assuming a deny-by-default posture).

## DNS Resolution in Dual-Stack

CoreDNS returns both A (IPv4) and AAAA (IPv6) records for dual-stack services:

```bash
kubectl exec deploy/my-client -- nslookup my-api.my-app.svc.cluster.local
```

The response includes both address types. Istio's DNS proxy also returns both:

```bash
kubectl exec deploy/my-client -c istio-proxy -- \
  pilot-agent request GET /dns_lookup?hostname=my-api.my-app.svc.cluster.local
```

The application (or more precisely, the system resolver) decides which address to use based on the Happy Eyeballs algorithm, which typically prefers IPv6.

## VirtualService and DestinationRule

VirtualService and DestinationRule configurations do not change for dual-stack. Istio handles the address family transparently:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-api-routes
spec:
  hosts:
  - my-api
  http:
  - route:
    - destination:
        host: my-api
        port:
          number: 8080
    timeout: 10s
    retries:
      attempts: 3
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-api-policy
spec:
  host: my-api
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

These policies apply to both IPv4 and IPv6 traffic.

## ServiceEntry for External Dual-Stack Services

When registering external services that are dual-stack:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
  - "api.example.com"
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
```

With `resolution: DNS`, Istio resolves both A and AAAA records for `api.example.com` and can connect over either address family.

For static endpoints with both address families:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-dual-stack
spec:
  hosts:
  - "backend.internal"
  ports:
  - number: 8080
    name: http-api
    protocol: HTTP
  resolution: STATIC
  endpoints:
  - address: "10.100.1.50"
  - address: "2001:db8::50"
```

## Monitoring Dual-Stack Traffic

Istio metrics include the source and destination addresses, which you can use to track IPv4 vs IPv6 traffic:

```promql
# Total requests (both IP families)
sum(rate(istio_requests_total{destination_service="my-api.my-app.svc.cluster.local"}[5m]))
```

To specifically track which address family is being used, check the Envoy stats:

```bash
istioctl proxy-config stats deploy/my-client -n my-app | grep "upstream_cx\|downstream_cx"
```

You can also check individual connection details through the Envoy admin interface:

```bash
kubectl exec deploy/my-client -c istio-proxy -- \
  curl -s localhost:15000/clusters | grep my-api
```

The cluster output shows individual endpoint addresses, including their IP family.

## Troubleshooting Dual-Stack Issues

**Traffic only works on one IP family:**

Check that both iptables and ip6tables rules are set up:

```bash
kubectl exec my-pod -c istio-proxy -- iptables -t nat -S | grep ISTIO
kubectl exec my-pod -c istio-proxy -- ip6tables -t nat -S | grep ISTIO
```

If ip6tables rules are missing, check the init container logs:

```bash
kubectl logs my-pod -c istio-init
```

**Envoy only listening on IPv4:**

Verify the `ISTIO_DUAL_STACK` metadata is set:

```bash
kubectl get pod my-pod -o jsonpath='{.metadata.annotations}' | grep -i dual
```

Check the listener addresses:

```bash
istioctl proxy-config listener deploy/my-app -n my-app -o json | jq '.[].address'
```

**Connection failures to IPv6 endpoints:**

Test connectivity directly:

```bash
kubectl exec my-pod -c istio-proxy -- curl -6 http://[fd00::5]:8080/health
```

Check if the node network supports IPv6:

```bash
kubectl exec my-pod -- ip -6 addr
kubectl exec my-pod -- ip -6 route
```

## Migration Strategy

If you are migrating from IPv4-only to dual-stack, follow this approach:

1. Enable dual-stack on the cluster (node and CNI level)
2. Update Istio configuration to enable `ISTIO_DUAL_STACK`
3. Update services to `PreferDualStack` (not `RequireDualStack`)
4. Verify that existing IPv4 traffic continues to work
5. Test IPv6 connectivity between services
6. Gradually move to `RequireDualStack` once verified

```bash
# Update existing services to prefer dual-stack
kubectl patch svc my-api -n my-app -p '{"spec":{"ipFamilyPolicy":"PreferDualStack"}}'
```

Using `PreferDualStack` is the safest choice because it falls back to single-stack if dual-stack is not available on a particular node or namespace.

## Summary

Dual-stack networking in Istio adds IPv6 support alongside IPv4, giving you flexibility as the internet continues its transition. Enable it through the `ISTIO_DUAL_STACK` mesh configuration, configure services with `PreferDualStack` or `RequireDualStack`, and make sure authorization policies include both IPv4 and IPv6 address ranges. The traffic management features (VirtualService, DestinationRule) work transparently across both address families. Verify your setup by checking both iptables and ip6tables rules and testing connectivity over both protocols.
