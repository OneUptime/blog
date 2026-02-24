# How to Handle External DNS with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DNS, External Services, Kubernetes, ServiceEntry

Description: How to properly configure Istio to handle DNS resolution for external services including cloud APIs, third-party services, and legacy systems.

---

One of the first things teams run into when adopting Istio is "my service can't reach external APIs anymore." By default, Istio's outbound traffic policy allows all external traffic, but that changes if you've tightened things down. And even when external access works, there are good reasons to explicitly configure how your mesh handles external DNS. Proper configuration means better observability, security controls, and predictable behavior.

## Outbound Traffic Policy

First, check your mesh's outbound traffic policy. There are two modes:

```bash
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep outboundTrafficPolicy
```

- `ALLOW_ANY` (default) - sidecars pass through traffic to any external host
- `REGISTRY_ONLY` - sidecars only allow traffic to hosts in the Istio service registry

If you're running `REGISTRY_ONLY` (which is recommended for production), you need to explicitly register every external service your mesh needs to reach.

## Registering External Services

Use ServiceEntry to tell Istio about external services:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: google-apis
  namespace: default
spec:
  hosts:
  - "*.googleapis.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
```

This registers all Google API endpoints as known external services. The `location: MESH_EXTERNAL` flag tells Istio that these services are outside the mesh, so it won't try to apply mTLS or other mesh-internal policies.

## DNS Resolution Strategies for External Services

There are three resolution strategies, and picking the right one matters:

### resolution: DNS

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
  - api.stripe.com
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

With `DNS` resolution, the Envoy sidecar resolves the hostname when establishing a connection. It caches the result based on DNS TTL. This is what you want for most external APIs since they typically sit behind load balancers with changing IPs.

### resolution: NONE

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: wildcard-external
  namespace: default
spec:
  hosts:
  - "*.example.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
```

With `NONE`, the sidecar uses the original destination IP from the connection (as resolved by the application). This is the right choice for wildcard entries where you can't pre-resolve the hostname.

### resolution: STATIC

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: fixed-endpoint
  namespace: default
spec:
  hosts:
  - legacy-api.company.com
  ports:
  - number: 8443
    name: https
    protocol: TLS
  resolution: STATIC
  location: MESH_EXTERNAL
  endpoints:
  - address: 203.0.113.50
```

`STATIC` is for when you know the exact IP and it won't change. This avoids DNS lookups entirely.

## Handling Multiple External Endpoints

For external services with multiple endpoints, you can list them all:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: partner-api
  namespace: default
spec:
  hosts:
  - api.partner.com
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: STATIC
  location: MESH_EXTERNAL
  endpoints:
  - address: 198.51.100.10
  - address: 198.51.100.11
  - address: 198.51.100.12
```

Envoy will load balance across these endpoints using the configured policy (round-robin by default).

## TLS Origination for External Services

If your application speaks plain HTTP but the external service requires HTTPS, you can have Istio handle the TLS origination:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: httpbin
  namespace: default
spec:
  hosts:
  - httpbin.org
  ports:
  - number: 80
    name: http
    protocol: HTTP
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: httpbin-tls
  namespace: default
spec:
  host: httpbin.org
  trafficPolicy:
    portLevelSettings:
    - port:
        number: 443
      tls:
        mode: SIMPLE
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: httpbin-redirect
  namespace: default
spec:
  hosts:
  - httpbin.org
  http:
  - match:
    - port: 80
    route:
    - destination:
        host: httpbin.org
        port:
          number: 443
```

Now your app can make plain HTTP requests to `httpbin.org:80`, and the sidecar will upgrade them to HTTPS.

## Egress Gateway for External DNS

For production environments, you often want external traffic to go through an egress gateway. This gives you a central point for logging, security, and network policy enforcement:

```yaml
apiVersion: networking.istio.io/v1alpha3
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
    - api.external-service.com
    tls:
      mode: PASSTHROUGH
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: external-via-egress
  namespace: default
spec:
  hosts:
  - api.external-service.com
  gateways:
  - mesh
  - istio-system/egress-gateway
  tls:
  - match:
    - gateways:
      - mesh
      port: 443
      sniHosts:
      - api.external-service.com
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
      - api.external-service.com
    route:
    - destination:
        host: api.external-service.com
        port:
          number: 443
```

## Monitoring External DNS Traffic

With ServiceEntry in place, you get full observability for external traffic. Check Envoy stats:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET stats | grep api.external-service.com
```

You'll see metrics for connection counts, request rates, latency, and error rates for each external service.

## Debugging External DNS Issues

When external DNS isn't working, check these things in order:

1. **Is the outbound policy set to REGISTRY_ONLY?**
```bash
istioctl proxy-config cluster deploy/my-app | grep PassthroughCluster
```

2. **Is the ServiceEntry visible to the sidecar?**
```bash
istioctl proxy-config cluster deploy/my-app | grep external-service
```

3. **Can the sidecar resolve the hostname?**
```bash
kubectl exec -it deploy/my-app -c istio-proxy -- curl -v https://api.external-service.com
```

4. **Check the sidecar logs for connection errors:**
```bash
kubectl logs deploy/my-app -c istio-proxy | grep "api.external-service"
```

Getting external DNS right in Istio takes a bit of work upfront, especially if you're running with `REGISTRY_ONLY`. But the payoff is worth it: you get full visibility into your external dependencies, the ability to apply traffic policies, and a clear inventory of every external service your mesh talks to.
