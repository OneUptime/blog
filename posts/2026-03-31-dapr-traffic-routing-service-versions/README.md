# How to Route Traffic Between Service Versions Using Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Traffic Routing, Canary Deployment, Blue-Green, Service Invocation

Description: Learn how to route traffic between different versions of a service using Dapr with Kubernetes ingress, service labels, and middleware for canary and blue-green deployments.

---

## Traffic Routing Options with Dapr

Dapr does not have built-in traffic splitting, but you can combine Dapr service invocation with Kubernetes-native or service mesh features to achieve canary and blue-green deployments.

## Approach 1: Multiple App IDs

Deploy two versions of a service with different app IDs:

```yaml
# v1 deployment
annotations:
  dapr.io/app-id: "order-service-v1"

# v2 deployment
annotations:
  dapr.io/app-id: "order-service-v2"
```

Your router service can implement the traffic split logic:

```javascript
async function invokeOrderService(req, body) {
  // 90% to v1, 10% to v2
  const target = Math.random() < 0.1 ? 'order-service-v2' : 'order-service-v1';

  return await axios.post(
    `http://localhost:3500/v1.0/invoke/${target}/method/orders`,
    body
  );
}
```

## Approach 2: Kubernetes Service with Label Selectors

This approach manages traffic at the Kubernetes Service level, which is useful for ingress traffic or non-Dapr callers. Note that Dapr service invocation uses its own name resolution and sidecar-to-sidecar gRPC, so it bypasses Kubernetes Service routing. Use this for traffic entering through an ingress controller or direct HTTP clients.

Create a stable service name and switch the selector to point to the active version:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector:
    app: order-service
    version: v2  # Switch between v1 and v2
  ports:
    - port: 80
      targetPort: 3000
```

```bash
# Switch traffic from v1 to v2
kubectl patch service order-service \
  -p '{"spec":{"selector":{"version":"v2"}}}'
```

## Approach 3: Istio Traffic Splitting

If using Istio as your service mesh:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts:
    - order-service
  http:
    - route:
        - destination:
            host: order-service
            subset: v1
          weight: 90
        - destination:
            host: order-service
            subset: v2
          weight: 10
---
apiVersion: networking.istio.io/v1beta1
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

Note that Dapr service invocation uses its own name resolution and sidecar-to-sidecar gRPC, so it bypasses Istio VirtualService rules. For Istio traffic splitting to take effect, route traffic through the Kubernetes Service (for example, via an ingress gateway) rather than through Dapr's invoke API.

## Approach 4: Header-Based Routing

Route specific users to the new version based on a header:

```javascript
async function routeToVersion(req) {
  const betaUser = req.headers['x-beta-user'] === 'true';
  const target = betaUser ? 'order-service-v2' : 'order-service-v1';

  return await axios.post(
    `http://localhost:3500/v1.0/invoke/${target}/method/orders`,
    req.body,
    { headers: { ...req.headers } }
  );
}
```

## Monitoring the Rollout

```bash
# Check error rates for each version
kubectl logs -l version=v2 -c daprd | grep error | wc -l
kubectl logs -l version=v1 -c daprd | grep error | wc -l
```

## Summary

Route traffic between service versions using Dapr by either deploying services with different app IDs and implementing split logic in a router, using Kubernetes service selector switching for blue-green deployments, or using Istio VirtualService for percentage-based canary rollouts. All approaches work with Dapr's service invocation without changes to calling services.
