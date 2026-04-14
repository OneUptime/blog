# How to Configure Dapr Traffic Routing with Service Mesh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Mesh, Traffic Routing, Istio, Kubernetes

Description: Learn how to configure traffic routing rules in a service mesh to complement Dapr's service invocation and pub/sub capabilities.

---

Dapr handles application-level service invocation and pub/sub messaging, while a service mesh like Istio manages network-level traffic routing. Understanding how these two layers interact lets you implement sophisticated routing strategies such as weighted traffic splitting, header-based routing, and fault injection.

## How Dapr and Service Mesh Routing Interact

Dapr uses its own name resolution to discover services and calls them via the sidecar. The service mesh intercepts this traffic at the network level. For traffic routing to work correctly, the mesh must be configured to understand how Dapr routes requests.

When Dapr invokes `order-service`, the call goes:

```text
app -> daprd (port 3500) -> Envoy sidecar -> network -> Envoy sidecar -> daprd -> target app
```

The service mesh applies routing rules at the Envoy layer between sidecars.

## Create an Istio VirtualService for Dapr Traffic

Route Dapr service invocation traffic between versions:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts:
  - order-service
  http:
  - match:
    - headers:
        x-version:
          exact: v2
    route:
    - destination:
        host: order-service
        subset: v2
  - route:
    - destination:
        host: order-service
        subset: v1
```

Apply the corresponding DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: order-service
spec:
  host: order-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## Pass Routing Headers Through Dapr

Dapr forwards HTTP headers from the original request, so you can pass routing headers through service invocation:

```bash
curl http://localhost:3500/v1.0/invoke/order-service/method/process \
  -H "x-version: v2" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "123"}'
```

Istio sees the `x-version` header and routes to the v2 subset.

## Configure Timeout and Retry Policies

Layer mesh-level retry policies on top of Dapr's application-level retries:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-service
spec:
  hosts:
  - payment-service
  http:
  - route:
    - destination:
        host: payment-service
    timeout: 10s
    retries:
      attempts: 3
      perTryTimeout: 3s
      retryOn: 5xx,connect-failure
```

Note: Configure timeouts to be longer than Dapr's resiliency timeouts to avoid conflicting retry storms.

## Apply Fault Injection for Testing

Use Istio fault injection to test how Dapr handles downstream failures:

```yaml
http:
- fault:
    delay:
      percentage:
        value: 20
      fixedDelay: 2s
    abort:
      percentage:
        value: 5
      httpStatus: 503
  route:
  - destination:
      host: inventory-service
```

## Monitor Routing with Kiali

Kiali provides a visual service graph showing how Dapr traffic flows through the mesh:

```bash
kubectl port-forward svc/kiali 20001:20001 -n istio-system
```

Open `http://localhost:20001` to see traffic routing visualization across Dapr services.

## Summary

Configuring service mesh traffic routing alongside Dapr provides network-level control that complements Dapr's application APIs. Use Istio VirtualService rules to route Dapr service invocation calls by headers or weights, and pass routing headers through Dapr's service invocation to influence mesh routing decisions. Align timeout configurations between Dapr resiliency policies and mesh-level retries to prevent cascading retries.
