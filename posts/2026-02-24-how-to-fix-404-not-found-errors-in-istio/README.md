# How to Fix 404 Not Found Errors in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, 404 Error, Troubleshooting, Routing, VirtualService

Description: Diagnose and resolve 404 Not Found errors caused by Istio routing misconfigurations, missing VirtualServices, and gateway binding problems.

---

Getting a 404 error in an Istio mesh is confusing because you know the service is there. You can even curl it directly from inside the pod. But when the request goes through the Envoy sidecar or the ingress gateway, you get a 404. The service exists, the endpoint is healthy, but Envoy has no idea how to route the request.

This guide walks through every common cause of 404 errors in Istio and how to fix them.

## Where the 404 Comes From

First, figure out whether the 404 is coming from Envoy or from your application:

```bash
# Check the response headers
kubectl exec <client-pod> -n production -- curl -v http://orders-service:8080/api/orders 2>&1

# If you see "server: envoy" in the headers, the 404 is from Envoy
# If you see your application's server header, the 404 is from your app
```

If the response includes `server: istio-envoy`, the proxy is returning the 404 because it does not have a route for the request. If it is from your application, the issue is in your application code, not Istio.

## 404 from Ingress Gateway

The most common place to see 404s is at the ingress gateway. You have a Gateway resource, a VirtualService, but requests from outside the cluster get 404s.

**Check 1: Gateway and VirtualService binding**

Make sure the VirtualService references the correct Gateway:

```bash
# List gateways
kubectl get gateway -n istio-system

# Check the VirtualService
kubectl get virtualservice orders-routes -n production -o yaml
```

The VirtualService must reference the Gateway with the full namespace/name:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: orders-routes
  namespace: production
spec:
  hosts:
    - orders.example.com
  gateways:
    - istio-system/main-gateway    # Must match the gateway namespace/name
  http:
    - match:
        - uri:
            prefix: /api
      route:
        - destination:
            host: orders-service
            port:
              number: 8080
```

**Check 2: Host matching between Gateway and VirtualService**

The hosts in the Gateway server must match (or be a superset of) the hosts in the VirtualService:

```yaml
# Gateway allows *.example.com
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.example.com"
```

If the VirtualService host is `orders.example.com`, it matches `*.example.com`. But if the Gateway only lists `api.example.com` and the VirtualService claims `orders.example.com`, there is no match and you get a 404.

**Check 3: Port matching**

The Gateway port and protocol must be correct:

```bash
# Check what ports the ingress gateway is listening on
kubectl get svc istio-ingressgateway -n istio-system

# Check the gateway configuration
istioctl proxy-config listeners <ingress-gateway-pod> -n istio-system
```

If you are sending HTTPS traffic to a port configured for HTTP (or vice versa), you will get a 404 or connection error.

## 404 for Mesh-Internal Traffic

If you get 404s for service-to-service calls within the mesh:

**Check 1: Route configuration in the client sidecar**

```bash
# Check routes on the client pod
istioctl proxy-config routes <client-pod> -n production

# Look for the target service
istioctl proxy-config routes <client-pod> -n production | grep orders-service
```

If there are no routes for the target service, the sidecar does not know how to reach it.

**Check 2: VirtualService with gateway specified but no mesh**

A common mistake is specifying a gateway in the VirtualService without also including `mesh`:

```yaml
# Wrong: This only applies to ingress traffic, not mesh traffic
spec:
  gateways:
    - istio-system/main-gateway
  hosts:
    - orders-service

# Correct: Include "mesh" for internal traffic
spec:
  gateways:
    - istio-system/main-gateway
    - mesh
  hosts:
    - orders-service
```

If you do not specify any gateways, the VirtualService applies to mesh traffic by default. But once you add a gateway, you need to explicitly include `mesh` if you want the rules to also apply to internal traffic.

**Check 3: URI matching**

If your VirtualService has URI matching, make sure the match rules cover the request path:

```yaml
spec:
  http:
    - match:
        - uri:
            prefix: /api/v1
      route:
        - destination:
            host: orders-service
    # Requests to /api/v2 or /health would get a 404
    # because they do not match any rule
```

Add a catch-all route at the end:

```yaml
spec:
  http:
    - match:
        - uri:
            prefix: /api/v1
      route:
        - destination:
            host: orders-service
    - route:
        - destination:
            host: orders-service
```

## 404 After Adding a VirtualService

Sometimes adding a VirtualService causes 404s for paths that previously worked. This happens because Istio replaces the default routing with the VirtualService rules, and any path not covered by the VirtualService gets a 404.

Before the VirtualService, all traffic to `orders-service` gets routed there. After adding a VirtualService that only matches `/api/v1`, requests to `/health` or other paths get 404s.

Fix by adding a default route:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: orders-service
  namespace: production
spec:
  hosts:
    - orders-service
  http:
    - match:
        - uri:
            prefix: /api/v1
      route:
        - destination:
            host: orders-service
            subset: v1
    - match:
        - uri:
            prefix: /api/v2
      route:
        - destination:
            host: orders-service
            subset: v2
    - route:  # Default route catches everything else
        - destination:
            host: orders-service
            subset: v1
```

## 404 Due to exportTo Restrictions

If a VirtualService or Service has `exportTo` set to restrict visibility, services in other namespaces will not be able to see it:

```yaml
# This VirtualService is only visible within the "team-a" namespace
spec:
  exportTo:
    - "."
```

If a service in `team-b` tries to call a service governed by this VirtualService, it might get a 404. Remove or expand the exportTo:

```yaml
spec:
  exportTo:
    - "."
    - "team-b"
```

## Debugging with Envoy Config Dump

When nothing else works, dump the full Envoy configuration and search for your route:

```bash
# Dump all routes from the client proxy
istioctl proxy-config routes <client-pod> -n production -o json > routes.json

# Search for the target service
cat routes.json | jq '.[] | select(.virtualHosts[].domains[] | contains("orders"))'

# Check listeners
istioctl proxy-config listeners <pod-name> -n production -o json > listeners.json
```

For gateway 404s:

```bash
# Dump the gateway config
istioctl proxy-config routes <gateway-pod> -n istio-system -o json

# Check if the host is configured
istioctl proxy-config routes <gateway-pod> -n istio-system -o json | \
  jq '.[].virtualHosts[] | select(.domains[] | contains("orders.example.com"))'
```

If the domain does not appear in the gateway's route configuration, the Gateway or VirtualService is not correctly configured.

## Quick Fix Checklist

When you hit a 404 in Istio, work through this:

```bash
# 1. Is the 404 from Envoy or the application?
curl -v http://target-service:8080/path 2>&1 | grep "server:"

# 2. Does the route exist in the proxy?
istioctl proxy-config routes <pod> -n production | grep target-service

# 3. Is the VirtualService binding correct?
kubectl get vs -n production -o yaml | grep gateways -A 2

# 4. Do the hosts match?
kubectl get gateway -n istio-system -o yaml | grep hosts -A 2

# 5. Is there a URI match that is too restrictive?
kubectl get vs -n production -o yaml | grep -A 5 "match"

# 6. Run the analyzer
istioctl analyze -n production
```

Most 404s in Istio come from host mismatches between Gateways and VirtualServices, missing the `mesh` gateway for internal traffic, or URI match rules that do not cover all request paths. Once you know where to look, these are quick fixes.
