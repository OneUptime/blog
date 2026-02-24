# How to Fix External Service Connection Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, External Services, Networking, Troubleshooting

Description: How to configure and troubleshoot connections to external services outside the mesh when using Istio service mesh.

---

Your service inside the Istio mesh needs to talk to an external API, a third-party SaaS, or a database hosted outside the cluster. And it's not working. External service connectivity in Istio depends on the outbound traffic policy, ServiceEntry configuration, and DNS resolution. Here's how to sort it all out.

## Outbound Traffic Policy

Istio has two modes for handling outbound traffic to unknown destinations:

- **ALLOW_ANY**: Traffic to destinations outside the mesh is allowed (default in most installations)
- **REGISTRY_ONLY**: Only traffic to services registered in Istio's service registry is allowed

Check which mode you're using:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep -A 2 outboundTrafficPolicy
```

If it shows:

```yaml
outboundTrafficPolicy:
  mode: REGISTRY_ONLY
```

Then you must create a ServiceEntry for every external service your pods need to reach. Without it, outbound connections to external services are blocked.

If it shows `ALLOW_ANY` or is not set, external connections should work without ServiceEntries. If they're still failing, the problem is elsewhere.

## Creating a ServiceEntry

A ServiceEntry tells Istio about an external service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: my-namespace
spec:
  hosts:
  - api.external-service.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
```

Key fields:
- `hosts`: The hostname your application connects to
- `ports`: The port and protocol
- `location`: `MESH_EXTERNAL` for services outside the mesh
- `resolution`: `DNS` for hostname-based resolution, `STATIC` for fixed IPs

## HTTPS to External Services

Most external APIs use HTTPS. The trickiest part is getting TLS right. Your application makes an HTTPS request, and the sidecar needs to handle it correctly.

For TLS origination at the application level (the app does its own TLS):

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-https
  namespace: my-namespace
spec:
  hosts:
  - api.example.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
```

The protocol `HTTPS` tells Envoy to treat this as TLS passthrough. The sidecar doesn't terminate TLS; it passes the encrypted traffic through.

For TLS origination at the sidecar level (your app sends HTTP, the sidecar encrypts):

```yaml
apiVersion: networking.istio.io/v1beta1
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
    protocol: HTTPS
  - number: 80
    name: http
    protocol: HTTP
  location: MESH_EXTERNAL
  resolution: DNS
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: external-api-tls
  namespace: my-namespace
spec:
  host: api.example.com
  trafficPolicy:
    tls:
      mode: SIMPLE
```

## DNS Resolution Failures

External services rely on DNS resolution. If the sidecar can't resolve the hostname, connections fail.

Test DNS from inside the pod:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- nslookup api.example.com
```

If DNS fails, check:
1. CoreDNS is running and healthy
2. The upstream DNS servers can resolve external hostnames
3. There's no NetworkPolicy blocking DNS traffic

Istio's DNS proxy can also cause issues. If enabled, it intercepts DNS queries:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep -A 5 "DNS"
```

## IP-Based External Services

If you need to connect to an external service by IP address (no hostname):

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-ip-service
  namespace: my-namespace
spec:
  hosts:
  - external-db.my-company.internal
  addresses:
  - 203.0.113.10/32
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  location: MESH_EXTERNAL
  resolution: STATIC
  endpoints:
  - address: 203.0.113.10
```

The `hosts` field is just a name for Istio's internal tracking. The actual routing uses the `addresses` and `endpoints`.

## Connection Timeouts to External Services

External service calls might time out if the connection takes longer than expected. Check the timeout configuration:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: external-api-vs
  namespace: my-namespace
spec:
  hosts:
  - api.example.com
  http:
  - timeout: 30s
    route:
    - destination:
        host: api.example.com
        port:
          number: 443
```

The default timeout is 15 seconds. If the external service is slow, increase it.

## Wildcard Hosts

Sometimes you need to allow access to multiple subdomains of an external service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-wildcard
  namespace: my-namespace
spec:
  hosts:
  - "*.example.com"
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: NONE
```

Note that `resolution: NONE` is used because DNS needs to resolve specific subdomains, not the wildcard. Each connection resolves the actual hostname it's connecting to.

## Egress Gateway for External Traffic

For more control over external traffic, route it through an egress gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
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
      name: https
      protocol: HTTPS
    hosts:
    - api.example.com
    tls:
      mode: PASSTHROUGH
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: external-api-via-egress
  namespace: my-namespace
spec:
  hosts:
  - api.example.com
  gateways:
  - istio-system/egress-gateway
  - mesh
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

This routes external traffic through the egress gateway, giving you a single exit point for external communications.

## ServiceEntry Namespace Scope

By default, ServiceEntries are visible to all namespaces. If you restrict with `exportTo`:

```yaml
spec:
  exportTo:
  - "."
```

Only pods in the same namespace can use this ServiceEntry. Make sure the scope matches your needs.

## Debugging External Connections

Check what the proxy knows about the external service:

```bash
istioctl proxy-config clusters <pod-name> -n my-namespace | grep example.com
```

Check endpoints:

```bash
istioctl proxy-config endpoints <pod-name> -n my-namespace | grep example.com
```

Look at the Envoy access logs:

```bash
kubectl logs <pod-name> -c istio-proxy -n my-namespace | grep "example.com"
```

Response flags:
- `NR`: No route configured (missing ServiceEntry or VirtualService)
- `UH`: No healthy upstream (DNS resolution failed or host unreachable)
- `UF`: Upstream connection failure

Use `istioctl analyze`:

```bash
istioctl analyze -n my-namespace
```

## Summary

External service connectivity in Istio depends on the outbound traffic policy. With `REGISTRY_ONLY`, you need ServiceEntries for every external service. Name the ports correctly, use the right resolution strategy (DNS or STATIC), and configure appropriate TLS settings. For HTTPS, use protocol `HTTPS` for TLS passthrough or set up TLS origination with a DestinationRule. Test DNS resolution from inside the pod and check Envoy access logs for specific failure reasons.
