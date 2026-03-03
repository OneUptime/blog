# How to Debug Envoy Route Not Found Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Routing, Debugging, VirtualService

Description: Debug and fix Envoy 404 route not found errors in Istio, including VirtualService misconfigurations, port naming issues, and listener configuration problems.

---

The "route not found" error is one of the most common issues you will run into with Istio. It shows up as a 404 response from Envoy with the `NR` (No Route) response flag in the access logs. The request reached the Envoy proxy, but Envoy had no routing rule that matched it, so it returned a 404.

This is different from a 404 that your application returns. The Envoy 404 means the request never reached your app at all.

## How to Tell It Is an Envoy 404

Check the access logs:

```bash
kubectl logs my-app-xxxxx -c istio-proxy --tail=100
```

An Envoy route-not-found looks like:

```text
"GET /api/data HTTP/1.1" 404 NR route_not_found - "-" 0 0 0 - ...
```

The key indicators:
- Response code 404
- Response flag `NR`
- The `route_not_found` detail

Compare this with an application 404:

```text
"GET /api/data HTTP/1.1" 404 - via_upstream - "-" 0 45 12 11 ...
```

Notice the absence of `NR` flag and the `via_upstream` marker, meaning the request reached the app and the app returned 404.

## Common Causes and Fixes

### Cause 1: No VirtualService for the Host

If you are using the Istio ingress gateway and there is no VirtualService that matches the incoming Host header, Envoy returns 404.

Check the ingress gateway routes:

```bash
INGRESS_POD=$(kubectl get pod -n istio-system -l istio=ingressgateway -o jsonpath='{.items[0].metadata.name}')
istioctl proxy-config routes $INGRESS_POD.istio-system
```

Look for your hostname in the output. If it is not there, the VirtualService either does not exist or is not bound to the Gateway.

Fix: Create or fix the VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
spec:
  hosts:
    - "my-app.example.com"
  gateways:
    - my-gateway
  http:
    - route:
        - destination:
            host: my-app
            port:
              number: 8080
```

### Cause 2: Host Header Mismatch

The Host header in the request must match the hosts in both the Gateway and VirtualService. If you are testing with curl:

```bash
# This might not match because the Host header is the IP
curl http://34.120.1.100/api/data

# This sets the correct Host header
curl http://34.120.1.100/api/data -H "Host: my-app.example.com"
```

For HTTPS:

```bash
curl https://my-app.example.com/api/data --resolve "my-app.example.com:443:34.120.1.100"
```

### Cause 3: Wrong Port Configuration

If the destination port in the VirtualService does not match the Kubernetes Service port, Envoy will not find a route.

Check the Service:

```bash
kubectl get svc my-app -o yaml
```

```yaml
spec:
  ports:
    - name: http
      port: 80
      targetPort: 8080
```

The VirtualService destination port should match the Service port (80), not the targetPort (8080):

```yaml
  http:
    - route:
        - destination:
            host: my-app
            port:
              number: 80  # Must match the Service port
```

### Cause 4: Service Port Naming

Istio uses port names to determine the protocol. If the port is not named or uses an unrecognized name, Istio might handle it as TCP and not create HTTP routes.

```yaml
# Good - Istio recognizes this as HTTP
  ports:
    - name: http
      port: 8080

# Good - Istio recognizes the prefix
  ports:
    - name: http-web
      port: 8080

# Bad - Istio does not recognize this as HTTP
  ports:
    - name: web
      port: 8080

# Bad - No name at all (treated as TCP)
  ports:
    - port: 8080
```

Fix the port naming to use an Istio-recognized prefix: `http`, `http2`, `grpc`, `tcp`, `tls`, `https`, `mongo`, `redis`, `mysql`.

### Cause 5: Sidecar Resource Filtering

A Sidecar resource might be restricting which services are visible to the proxy:

```bash
kubectl get sidecar -n default -o yaml
```

If the Sidecar limits egress hosts, the proxy will not have routes for excluded services:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: default
spec:
  egress:
    - hosts:
        - "./*"
```

This only allows routes to services in the same namespace. Add the missing namespace:

```yaml
  egress:
    - hosts:
        - "./*"
        - "other-namespace/*"
```

### Cause 6: VirtualService Match Condition Too Restrictive

If your VirtualService has match conditions, the request might not match any of them:

```yaml
  http:
    - match:
        - uri:
            prefix: /api/v1
      route:
        - destination:
            host: my-app
    - match:
        - uri:
            prefix: /api/v2
      route:
        - destination:
            host: my-app-v2
```

A request to `/api/v3` would not match any route and get a 404. Add a catch-all route at the end:

```yaml
    - route:
        - destination:
            host: my-app
```

## Deep Dive: Inspecting Envoy Configuration

When the simple checks do not reveal the issue, look at the actual Envoy configuration:

### Check listeners

```bash
istioctl proxy-config listeners my-app-xxxxx.default
```

Each listener corresponds to a port that Envoy is accepting traffic on. If your service port is not listed, Envoy will not handle traffic for it.

### Check route details

```bash
istioctl proxy-config routes my-app-xxxxx.default --name 8080 -o json
```

This shows the full route configuration including match conditions, headers, and destinations.

### Check clusters

```bash
istioctl proxy-config clusters my-app-xxxxx.default --fqdn my-app.default.svc.cluster.local
```

If the cluster does not exist, Envoy has no knowledge of the destination service.

## Using istioctl analyze

Run the analyzer to catch common configuration problems:

```bash
istioctl analyze -n default
```

It catches issues like:
- VirtualService references a Gateway that does not exist
- VirtualService references a destination host that has no matching Service
- VirtualService has a host that is not in the Gateway's hosts list

## Debugging Checklist

1. Confirm the 404 is from Envoy (check for `NR` flag) not from the app
2. Check that a VirtualService exists and matches the host
3. Verify the Host header in the request matches the VirtualService hosts
4. Check that the destination port matches the Service port
5. Verify Service port naming follows Istio conventions
6. Check for Sidecar resources that limit visibility
7. Check VirtualService match conditions
8. Use `istioctl proxy-config routes` to see the actual Envoy routes
9. Run `istioctl analyze` for automated checks

Route not found errors are almost always a configuration issue rather than a bug. Once you understand how Envoy matches requests to routes (host header, port, URI), the debugging becomes straightforward. Most of the time, it is a host mismatch or a missing VirtualService binding.
