# How to Debug Why a VirtualService Route is Not Matching

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, Debugging, Traffic Management, Kubernetes

Description: Systematic troubleshooting guide for when Istio VirtualService routes are not matching requests as expected.

---

You've created a VirtualService, applied it, and nothing happens. The traffic goes to the wrong backend, the headers match doesn't work, or the route simply gets ignored. VirtualService routing issues are one of the most common Istio debugging scenarios, and they usually come down to a few specific causes.

## Step 1: Verify the VirtualService is Applied

Start with the basics. Make sure the VirtualService actually exists and is in the right namespace:

```bash
kubectl get virtualservice -n my-namespace
```

Check the full YAML to make sure what you think you applied is what's actually there:

```bash
kubectl get virtualservice my-vs -n my-namespace -o yaml
```

Compare this carefully with what you intended. YAML indentation errors can silently change the meaning of your configuration.

## Step 2: Check for Configuration Errors

Run Istio's analysis tool to catch common mistakes:

```bash
istioctl analyze -n my-namespace
```

This will flag issues like:

- VirtualService referencing a host that doesn't exist
- VirtualService referencing a Gateway that doesn't exist
- Conflicting VirtualServices for the same host
- Port mismatches

## Step 3: Verify the Host Field

The `hosts` field in a VirtualService must match how the client addresses the service. This is the most common source of mismatches.

For mesh-internal traffic (sidecar to sidecar), the host needs to match the Kubernetes service name:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-vs
  namespace: production
spec:
  hosts:
    - my-service.production.svc.cluster.local
  http:
    - route:
        - destination:
            host: my-service.production.svc.cluster.local
```

If you use just `my-service` as the host, it might not match depending on where the VirtualService is created. The safest approach is to use the fully qualified domain name (FQDN).

For gateway traffic (external), the host must match the hostname in the Gateway resource:

```yaml
# Gateway
spec:
  servers:
    - hosts:
        - "api.example.com"

# VirtualService - must match
spec:
  hosts:
    - "api.example.com"
  gateways:
    - my-gateway
```

## Step 4: Check the Gateways Field

If your VirtualService is for external traffic, it needs a `gateways` field that references the Gateway resource. Without it, the VirtualService only applies to mesh-internal traffic:

```yaml
spec:
  hosts:
    - "api.example.com"
  gateways:
    - istio-system/my-gateway  # namespace/name format
  http:
    - route:
        - destination:
            host: my-service.production.svc.cluster.local
```

If you want the VirtualService to apply to both mesh traffic and gateway traffic, list both:

```yaml
gateways:
  - istio-system/my-gateway
  - mesh  # special keyword for mesh-internal traffic
```

## Step 5: Inspect the Proxy Configuration

The definitive check is to look at what the Envoy proxy actually received. Use `proxy-config` to see the routes:

```bash
# For sidecar proxies
istioctl proxy-config routes deploy/my-client -n production -o json
```

Search the output for your service hostname. You should see your VirtualService routes in the route configuration.

For gateway proxies:

```bash
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system -o json
```

If your routes don't appear in the proxy config, the VirtualService isn't reaching the proxy. Common reasons:

- The VirtualService is in the wrong namespace
- The proxy hasn't synced yet (check `istioctl proxy-status`)
- A Sidecar resource is limiting the configuration scope

## Step 6: Debug URI Matching

URI matching is case-sensitive and has specific rules for each match type:

```yaml
http:
  - match:
      - uri:
          exact: /api/v1/users     # Matches only /api/v1/users exactly
      - uri:
          prefix: /api/v1/         # Matches /api/v1/ and anything after it
      - uri:
          regex: "/api/v[0-9]+/.*" # Regex match
```

Common mistakes:

- Using `prefix: /api` when you mean `prefix: /api/` (the former also matches /apiv2)
- Forgetting that `exact` match requires the complete path including query parameters
- Not URL-encoding special characters

Test which route matches by checking the Envoy access log:

```bash
kubectl logs deploy/my-service -n production -c istio-proxy --tail=20
```

The access log shows the route name, which tells you which VirtualService rule matched.

## Step 7: Debug Header Matching

Header matching is case-insensitive for header names but case-sensitive for values:

```yaml
http:
  - match:
      - headers:
          x-version:
            exact: "v2"
    route:
      - destination:
          host: my-service-v2
  - route:
      - destination:
          host: my-service-v1
```

If header matching isn't working, verify the header is actually being sent:

```bash
# Send a request with headers and check the response
kubectl exec deploy/sleep -n production -c sleep -- \
  curl -v -H "x-version: v2" my-service.production:8080/
```

Check that the header isn't being stripped by an upstream proxy or load balancer. Headers starting with `x-envoy-` are stripped by Envoy by default.

## Step 8: Check Route Ordering

VirtualService routes are evaluated in order. The first matching route wins. If you have a catch-all route before a specific route, the specific route will never match:

```yaml
# WRONG - catch-all is first
http:
  - route:  # This matches everything
      - destination:
          host: my-service-v1
  - match:
      - headers:
          x-version:
            exact: "v2"
    route:  # This never matches
      - destination:
          host: my-service-v2
```

```yaml
# CORRECT - specific routes first
http:
  - match:
      - headers:
          x-version:
            exact: "v2"
    route:
      - destination:
          host: my-service-v2
  - route:  # Catch-all last
      - destination:
          host: my-service-v1
```

## Step 9: Check for Conflicting VirtualServices

If multiple VirtualServices target the same host, Istio merges them. But the merge behavior can be surprising:

```bash
# Find all VirtualServices for a host
kubectl get virtualservice --all-namespaces -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data['items']:
  hosts = item['spec'].get('hosts', [])
  if 'my-service.production.svc.cluster.local' in hosts or 'my-service' in hosts:
    print(f\"{item['metadata']['namespace']}/{item['metadata']['name']}: {hosts}\")
"
```

If you find multiple VirtualServices, consolidate them into one to avoid merge conflicts.

## Step 10: Check the Destination Service

Even if the route matches, it can fail if the destination is wrong:

```bash
# Verify the destination service exists
kubectl get svc my-service -n production

# Verify the port matches
kubectl get svc my-service -n production -o jsonpath='{.spec.ports[*].port}'
```

Make sure the port in your VirtualService destination matches the Service port (not the container port):

```yaml
route:
  - destination:
      host: my-service.production.svc.cluster.local
      port:
        number: 8080  # This must match the Service port
```

## Quick Debugging Checklist

Run through these checks systematically when a VirtualService isn't matching:

```bash
# 1. Does the VirtualService exist?
kubectl get vs -n production

# 2. Any analysis errors?
istioctl analyze -n production

# 3. Is the proxy synced?
istioctl proxy-status | grep my-client

# 4. Are the routes in the proxy config?
istioctl proxy-config routes deploy/my-client -n production | grep my-service

# 5. What does the access log show?
kubectl logs deploy/my-client -n production -c istio-proxy --tail=5

# 6. Test the request directly
kubectl exec deploy/my-client -n production -c sleep -- \
  curl -v my-service.production:8080/api/v1/test
```

VirtualService debugging is methodical. Start from "does the config exist" and work your way down to "what does the proxy actually see." Nine times out of ten, it's a host mismatch, a missing gateway reference, or a route ordering issue. The proxy-config command is your best tool because it shows you exactly what the proxy will do with a request.
