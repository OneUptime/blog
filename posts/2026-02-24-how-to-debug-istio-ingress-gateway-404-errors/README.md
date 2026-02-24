# How to Debug Istio Ingress Gateway 404 Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Debugging, Ingress Gateway, 404 Errors, Troubleshooting

Description: How to systematically diagnose and fix 404 Not Found errors at the Istio Ingress Gateway caused by routing misconfigurations and missing virtual services.

---

A 404 from the Istio ingress gateway usually means traffic reached the gateway but Envoy could not find a matching route for the request. Unlike 503 errors which often point to backend problems, 404 errors almost always trace back to a configuration issue in the Gateway or VirtualService resources.

This guide covers the most common causes and how to track them down quickly.

## How Envoy Routes Requests

Understanding how Envoy processes incoming requests helps narrow down the issue:

1. The request hits a **listener** on the gateway (based on port and protocol)
2. The listener matches the request to a **filter chain** (based on SNI for TLS)
3. The HTTP connection manager matches the **Host header** to a virtual host
4. Within the virtual host, Envoy matches the **URI path** to a route
5. The route sends traffic to an **upstream cluster** (your backend service)

A 404 can happen at step 3 (no matching virtual host) or step 4 (no matching route within the virtual host).

## Quick Diagnosis

Start by checking what the ingress gateway actually knows about:

```bash
# List all listeners
istioctl proxy-config listeners deploy/istio-ingressgateway -n istio-system

# List all routes
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system

# Get detailed route config
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system -o json
```

The routes output shows which hostnames and paths are configured. If your domain is not there, that is your problem.

## Cause 1: Missing VirtualService

The most straightforward cause. You created a Gateway but forgot the VirtualService, or the VirtualService is not referencing the right Gateway.

### Diagnosis

```bash
kubectl get virtualservice --all-namespaces
```

Check if a VirtualService exists for your hostname. Then check if it references the correct Gateway:

```bash
kubectl get virtualservice my-app -o yaml
```

### Fix

Create or fix the VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
  - "app.example.com"
  gateways:
  - istio-system/my-gateway
  http:
  - match:
    - uri:
        prefix: /
    route:
    - destination:
        host: my-app-service
        port:
          number: 80
```

Make sure `gateways` includes the correct namespace-qualified Gateway name.

## Cause 2: Host Mismatch Between Gateway and VirtualService

The Gateway server host and the VirtualService host must match. If one uses a wildcard and the other uses a specific domain, or if there is a typo, the route won't be created.

### Diagnosis

Compare the hosts in both resources:

```bash
# Gateway hosts
kubectl get gateway my-gateway -n istio-system -o jsonpath='{.spec.servers[*].hosts}'

# VirtualService hosts
kubectl get virtualservice my-app -o jsonpath='{.spec.hosts}'
```

### Fix

They need to be compatible. The VirtualService host must match or be a subset of the Gateway host:

```yaml
# Gateway with wildcard
hosts:
- "*.example.com"

# VirtualService with specific host - this works
hosts:
- "app.example.com"
```

```yaml
# Gateway with specific host
hosts:
- "app.example.com"

# VirtualService with different host - this does NOT work
hosts:
- "api.example.com"
```

## Cause 3: Path Not Matching Any Route

The hostname matched but the specific URI path has no matching route rule.

### Diagnosis

Check the routes for your virtual host:

```bash
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system \
  --name "https.443.https.my-gateway.istio-system" -o json
```

Look at the route entries and their match conditions. If your request path is `/api/v2/users` but the only route matches `/api/v1`, you get a 404.

### Fix

Add a catch-all route or make sure all needed paths are covered:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
spec:
  hosts:
  - "app.example.com"
  gateways:
  - istio-system/my-gateway
  http:
  - match:
    - uri:
        prefix: /api/v1
    route:
    - destination:
        host: api-v1
        port:
          number: 8080
  - match:
    - uri:
        prefix: /api/v2
    route:
    - destination:
        host: api-v2
        port:
          number: 8080
  - route:                      # Catch-all route
    - destination:
        host: default-service
        port:
          number: 80
```

Route matching is order-dependent. Istio evaluates routes from top to bottom and uses the first match.

## Cause 4: Wrong Port or Protocol in Gateway

If you are sending HTTPS traffic but the Gateway only has an HTTP server configured (or vice versa), the request will not match any listener.

### Diagnosis

```bash
istioctl proxy-config listeners deploy/istio-ingressgateway -n istio-system
```

Check what ports and protocols the gateway is listening on. Then compare with how you are making the request.

### Fix

Make sure the Gateway has the right protocol configured:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: my-tls
    hosts:
    - "app.example.com"
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "app.example.com"
```

## Cause 5: TLS Secret Missing or Invalid

If the Gateway references a TLS secret that does not exist, the HTTPS listener won't be configured. Requests on port 443 will get a 404 or connection refused.

### Diagnosis

Check if the TLS secret exists:

```bash
kubectl get secret my-tls -n istio-system
```

Check the ingress gateway logs for TLS-related errors:

```bash
kubectl logs -n istio-system deploy/istio-ingressgateway | grep -i "secret\|tls\|certificate"
```

### Fix

Create the missing secret:

```bash
kubectl create secret tls my-tls \
  --cert=fullchain.pem \
  --key=privkey.pem \
  -n istio-system
```

The secret must be in the same namespace as the ingress gateway pod (typically `istio-system`).

## Cause 6: Gateway Selector Not Matching

If the Gateway's `selector` does not match the labels on the ingress gateway pod, the configuration won't be applied to the gateway.

### Diagnosis

Check the Gateway selector:

```bash
kubectl get gateway my-gateway -n istio-system -o jsonpath='{.spec.selector}'
```

Check the ingress gateway pod labels:

```bash
kubectl get pod -n istio-system -l istio=ingressgateway --show-labels
```

### Fix

The selector should match. The default label is `istio: ingressgateway`:

```yaml
spec:
  selector:
    istio: ingressgateway
```

## Cause 7: Configuration Not Synced

Sometimes the configuration exists but has not propagated to the gateway proxy yet.

### Diagnosis

Check the sync status:

```bash
istioctl proxy-status
```

Look for the ingress gateway entry. If it shows `STALE`, the configuration has not been synced yet. If it shows `NOT SENT`, Istiod has not pushed the config.

### Fix

Usually this resolves itself within a few seconds. If it persists, check Istiod logs:

```bash
kubectl logs -n istio-system deploy/istiod | grep -i "error\|warn" | tail -20
```

You can also force a config push by restarting the ingress gateway:

```bash
kubectl rollout restart deploy/istio-ingressgateway -n istio-system
```

## Using curl for Debugging

When testing, curl with verbose output helps identify exactly what is happening:

```bash
# Test with explicit Host header
curl -v -H "Host: app.example.com" http://GATEWAY_IP/

# Test HTTPS with SNI
curl -v --resolve app.example.com:443:GATEWAY_IP https://app.example.com/

# Test specific path
curl -v --resolve app.example.com:443:GATEWAY_IP https://app.example.com/api/v1/health
```

The `-v` flag shows the TLS handshake, request headers, and response headers, which helps pinpoint where things go wrong.

## Running istioctl analyze

Istio's built-in analyzer catches many common misconfigurations:

```bash
istioctl analyze --all-namespaces
```

It will flag issues like:

- VirtualServices referencing non-existent Gateways
- Host mismatches between Gateways and VirtualServices
- Missing destination services
- Port conflicts

## Summary

404 errors at the Istio ingress gateway are almost always a routing configuration problem. The systematic approach is: check that the listener exists for your port and protocol, verify the hostname matches in both the Gateway and VirtualService, confirm the URI path matches a route rule, and make sure TLS secrets exist if using HTTPS. The `istioctl proxy-config routes` command is your best friend for seeing exactly what the gateway is configured to route.
