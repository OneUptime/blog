# How to Configure Traffic Routing Based on Source IP in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Routing, Source IP, Security, Service Mesh, Kubernetes

Description: Configure traffic routing based on source IP addresses in Istio to implement IP-based access control, partner-specific routing, and geographic targeting.

---

Routing traffic based on the source IP address is useful for several scenarios. You might want to route traffic from known partner IPs to a dedicated service tier, block suspicious IPs, send internal office traffic to a debug version, or provide different experiences based on the client network. Istio supports source IP matching through VirtualService and AuthorizationPolicy resources, though the approach depends on whether you are matching at the gateway level or within the mesh.

## Understanding Source IP in Istio

Source IP handling in Istio depends on your network topology. When traffic enters through an Istio ingress gateway, the original client IP might be in the `X-Forwarded-For` header (if behind a load balancer) or in the direct connection source address.

For the ingress gateway to see the real client IP, you typically need to configure your external load balancer to preserve it. On cloud providers, this usually means using a proxy protocol or setting `externalTrafficPolicy: Local` on the gateway Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  selector:
    istio: ingressgateway
  ports:
  - port: 80
    targetPort: 8080
  - port: 443
    targetPort: 8443
```

Setting `externalTrafficPolicy: Local` preserves the source IP but means traffic only goes to nodes that have gateway pods. Make sure you have enough gateway replicas distributed across nodes.

## Routing by Source IP at the Gateway

Use the `sourceLabels` and `sourceNamespace` fields in VirtualService for mesh-internal traffic, or match on the `X-Forwarded-For` header for external traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-routing
  namespace: production
spec:
  hosts:
  - api.example.com
  gateways:
  - api-gateway
  http:
  # Route partner traffic to dedicated backend
  - match:
    - headers:
        x-forwarded-for:
          regex: "203\\.0\\.113\\..*"
    route:
    - destination:
        host: api-service
        subset: partner
  # Route internal office traffic to debug version
  - match:
    - headers:
        x-forwarded-for:
          regex: "10\\.0\\.0\\..*"
    route:
    - destination:
        host: api-service
        subset: debug
  # Default route
  - route:
    - destination:
        host: api-service
        subset: production
```

The `X-Forwarded-For` header contains the client's original IP when traffic passes through proxies and load balancers. Matching on this header lets you route based on the client's address.

## IP-Based Access Control with AuthorizationPolicy

For blocking or allowing traffic from specific IPs, AuthorizationPolicy is the right tool:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-partner-ips
  namespace: production
spec:
  selector:
    matchLabels:
      app: admin-service
  action: ALLOW
  rules:
  - from:
    - source:
        ipBlocks:
        - "203.0.113.0/24"
        - "198.51.100.0/24"
```

This only allows traffic from the specified CIDR ranges to reach the admin-service. Everything else gets denied.

You can also deny specific IPs:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-suspicious-ips
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-service
  action: DENY
  rules:
  - from:
    - source:
        ipBlocks:
        - "192.0.2.0/24"
```

## Combining Allow and Deny Policies

When you have both ALLOW and DENY policies, Istio evaluates them in this order:

1. If any DENY policy matches, deny the request
2. If there are no ALLOW policies, allow the request
3. If any ALLOW policy matches, allow the request
4. Deny the request

So if you have both a DENY for a specific IP range and an ALLOW for a broader range, the DENY takes precedence.

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-corporate-network
  namespace: production
spec:
  selector:
    matchLabels:
      app: internal-dashboard
  action: ALLOW
  rules:
  - from:
    - source:
        ipBlocks:
        - "10.0.0.0/8"
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-guest-wifi
  namespace: production
spec:
  selector:
    matchLabels:
      app: internal-dashboard
  action: DENY
  rules:
  - from:
    - source:
        ipBlocks:
        - "10.99.0.0/16"
```

The corporate network (10.0.0.0/8) is allowed, but the guest WiFi subnet (10.99.0.0/16) within it is denied.

## Source IP with Remote IP Headers

When traffic goes through multiple proxies, the source IP seen by Istio might be the last proxy, not the original client. Configure Istio to use the `X-Forwarded-For` header for the remote IP. This is done through the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      gatewayTopology:
        numTrustedProxies: 1
```

The `numTrustedProxies` setting tells Envoy how many proxy hops to skip when reading `X-Forwarded-For`. If you have one load balancer in front of Istio, set it to 1. This makes Envoy use the second-to-last IP in the `X-Forwarded-For` chain as the client IP.

After configuring this, AuthorizationPolicy `remoteIpBlocks` will match on the real client IP:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-real-client-ip
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
  - from:
    - source:
        remoteIpBlocks:
        - "203.0.113.0/24"
```

The difference between `ipBlocks` and `remoteIpBlocks`:
- `ipBlocks` matches the direct peer address (the IP of the immediate connection)
- `remoteIpBlocks` matches the original client IP as determined by `X-Forwarded-For` and `numTrustedProxies`

## Routing Internal Mesh Traffic by Source Service

Within the mesh, you might want to route based on which service is calling. This is not IP-based, but it serves a similar purpose. Use `sourceLabels` in VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: data-service
  namespace: production
spec:
  hosts:
  - data-service
  http:
  - match:
    - sourceLabels:
        app: batch-processor
    route:
    - destination:
        host: data-service
        subset: batch
    timeout: 60s
  - match:
    - sourceLabels:
        app: web-frontend
    route:
    - destination:
        host: data-service
        subset: realtime
    timeout: 5s
  - route:
    - destination:
        host: data-service
        subset: default
```

The batch processor gets routed to a batch-optimized subset with a long timeout. The web frontend gets the realtime subset with a short timeout.

## IP Allowlisting for Webhooks

A practical use case is allowlisting IPs for webhook endpoints. Third-party services (payment processors, CI/CD, etc.) call your webhook from known IP ranges:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: stripe-webhook
  namespace: production
spec:
  selector:
    matchLabels:
      app: webhook-service
  action: ALLOW
  rules:
  - from:
    - source:
        remoteIpBlocks:
        - "3.18.12.63/32"
        - "3.130.192.231/32"
        - "13.235.14.237/32"
        - "13.235.122.149/32"
    to:
    - operation:
        paths:
        - "/webhooks/stripe"
        methods:
        - "POST"
```

This allows POST requests to `/webhooks/stripe` only from Stripe's documented webhook IPs.

## Monitoring IP-Based Routing

Track which IPs are hitting your services:

```bash
# Check access logs for source IPs
kubectl logs deploy/istio-ingressgateway -n istio-system | grep "x-forwarded-for"
```

Enable access logging in Istio to capture client IPs:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: access-logging
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: envoy
```

## Debugging Source IP Issues

If IP-based routing is not working, check:

1. Verify the source IP is preserved:

```bash
kubectl exec deploy/sleep -- curl -v http://api-service 2>&1 | grep -i forwarded
```

2. Check what IP the gateway sees:

```bash
kubectl logs deploy/istio-ingressgateway -n istio-system --tail=20
```

3. Verify `externalTrafficPolicy` is set:

```bash
kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.spec.externalTrafficPolicy}'
```

4. Check numTrustedProxies configuration:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep numTrustedProxies
```

## Summary

Source IP routing in Istio works through two mechanisms: VirtualService header matching on `X-Forwarded-For` for routing decisions, and AuthorizationPolicy with `ipBlocks` or `remoteIpBlocks` for access control. Preserve the real client IP by setting `externalTrafficPolicy: Local` on the gateway service and configuring `numTrustedProxies` in the mesh config. Use `remoteIpBlocks` for matching the original client IP through proxy chains, and `ipBlocks` for matching the direct peer address. For internal mesh traffic, use `sourceLabels` to route based on the calling service identity.
