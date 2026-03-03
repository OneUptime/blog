# How to Quickly Debug VirtualService Routing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, Routing, Debugging, Kubernetes, Service Mesh

Description: Practical debugging techniques for Istio VirtualService routing issues including common pitfalls and diagnostic commands.

---

VirtualService is one of the most commonly used Istio resources, and also one of the most commonly misconfigured. When your traffic is not going where you expect it to go, debugging VirtualService routing can feel like searching in the dark if you do not know the right tools and techniques.

Here is a practical approach to debugging VirtualService routing issues quickly.

## Step 1: Verify the VirtualService Exists and Is Valid

Start with the basics. Make sure your VirtualService actually exists and has no syntax errors:

```bash
kubectl get virtualservice my-vs -n default -o yaml
```

Check for validation errors using istioctl:

```bash
istioctl analyze -n default
```

This catches common problems like:

- References to hosts that do not exist
- Conflicting routes
- Gateway references that do not match any Gateway resource

```text
Warning [IST0101] (VirtualService default/my-vs) Referenced host not found: "my-service.wrong-namespace"
Warning [IST0104] (VirtualService default/my-vs) Gateway not found: "missing-gateway"
```

## Step 2: Check if the VirtualService Is Applied to the Proxy

Just because the VirtualService exists in Kubernetes does not mean it is in the proxy configuration. The control plane might have rejected it or it might not apply to the workload you are testing from.

Check the routes in the source proxy:

```bash
istioctl proxy-config routes deploy/my-app -n default
```

Look for your VirtualService's hosts and routes in the output. If they are not there, the VirtualService either does not apply to this workload or has not synced yet.

For more detail on a specific route:

```bash
istioctl proxy-config routes deploy/my-app -n default --name 80 -o json
```

This dumps the JSON route configuration for port 80, where you can see exactly how routes are ordered and what match conditions are set.

## Step 3: Check Route Ordering

Istio evaluates VirtualService routes in order from top to bottom, and the first match wins. A common mistake is putting a broad match before a specific one:

```yaml
# BAD - the first route catches everything
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-vs
spec:
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: my-service-v1
    - match:
        - uri:
            prefix: /api
      route:
        - destination:
            host: my-service-v2
```

The `/api` route will never be reached because the first route has no match condition and catches all traffic. Fix it by putting specific matches first:

```yaml
# GOOD - specific match first
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-vs
spec:
  hosts:
    - my-service
  http:
    - match:
        - uri:
            prefix: /api
      route:
        - destination:
            host: my-service-v2
    - route:
        - destination:
            host: my-service-v1
```

## Step 4: Verify the Gateway Reference

If your VirtualService uses a gateway (for ingress traffic), make sure the gateway reference is correct:

```yaml
spec:
  gateways:
    - my-gateway  # Must match an actual Gateway resource
  hosts:
    - "app.example.com"
```

Check that the Gateway exists:

```bash
kubectl get gateway my-gateway -n default
```

If the Gateway is in a different namespace, you need to use the full reference:

```yaml
spec:
  gateways:
    - istio-system/my-gateway
```

A common gotcha: if you include both a gateway and the `mesh` gateway, the VirtualService applies to both ingress and mesh-internal traffic:

```yaml
spec:
  gateways:
    - my-gateway
    - mesh  # This makes it also apply to service-to-service calls
```

If you omit the `gateways` field entirely, it defaults to `mesh` only.

## Step 5: Check Host Resolution

The `hosts` field in a VirtualService must match how the service is addressed. If you use short names, Istio resolves them relative to the VirtualService's namespace:

```yaml
spec:
  hosts:
    - my-service  # Resolves to my-service.default.svc.cluster.local (if VS is in default namespace)
```

If the service is in another namespace, use the full FQDN:

```yaml
spec:
  hosts:
    - my-service.backend.svc.cluster.local
```

Check what host the caller is actually using:

```bash
kubectl exec deploy/my-app -n default -- curl -v http://my-service.backend:8080/ 2>&1 | head -20
```

## Step 6: Test with curl from Inside the Mesh

The most direct way to test routing is to curl from a pod inside the mesh:

```bash
kubectl exec deploy/my-app -n default -- \
  curl -s -H "Host: app.example.com" http://my-service:8080/api/data
```

Add the `-v` flag for verbose output to see exactly what is happening:

```bash
kubectl exec deploy/my-app -n default -- \
  curl -v http://my-service:8080/api/data 2>&1
```

Look at the response headers for the `x-envoy-upstream-service-time` header, which tells you the response came through the Envoy proxy. The `server: istio-envoy` header confirms the sidecar is handling the request.

## Step 7: Check for Conflicting VirtualServices

Multiple VirtualServices for the same host can cause unexpected behavior. Istio merges them, but the order of merging is not always obvious:

```bash
kubectl get virtualservices -A -o json | \
  python3 -c "
import sys, json
from collections import defaultdict
data = json.load(sys.stdin)
hosts = defaultdict(list)
for vs in data['items']:
    for host in vs.get('spec', {}).get('hosts', []):
        hosts[host].append(f\"{vs['metadata']['namespace']}/{vs['metadata']['name']}\")
for host, vss in hosts.items():
    if len(vss) > 1:
        print(f'Host \"{host}\" has multiple VirtualServices:')
        for vs in vss:
            print(f'  - {vs}')
"
```

If multiple VirtualServices target the same host, consider merging them into one.

## Step 8: Check DestinationRule Subsets

If your VirtualService routes to subsets, make sure those subsets are defined in a DestinationRule:

```yaml
# VirtualService references subset "v2"
- route:
    - destination:
        host: my-service
        subset: v2
```

```bash
# Check that the subset exists
kubectl get destinationrule my-service-dr -n default -o yaml
```

If the subset does not exist, the route will fail with a 503 error. The DestinationRule must define the subset with matching labels:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-dr
spec:
  host: my-service
  subsets:
    - name: v2
      labels:
        version: v2
```

And the pods must actually have those labels:

```bash
kubectl get pods -n default -l app=my-service -L version
```

## Step 9: Check Envoy Access Logs

Enable access logging and check what Envoy is doing with requests:

```bash
kubectl logs deploy/my-app -n default -c istio-proxy --tail=50
```

Each log line shows the response code, upstream cluster, route name, and other details that tell you exactly how the request was routed.

Look for response flags like:

- `NR`: No route configured
- `UF`: Upstream connection failure
- `UC`: Upstream connection termination
- `DC`: Downstream connection termination
- `URX`: Upstream retry limit exceeded

## Step 10: Use istioctl describe

The `describe` command gives you a summary of all Istio configuration affecting a specific pod:

```bash
istioctl x describe pod my-app-abc123.default
```

This shows which VirtualServices, DestinationRules, and policies are applied to the pod, making it easy to see the full picture at a glance.

## Summary

Debugging VirtualService routing is a methodical process: verify the resource exists and is valid, check that it is applied to the proxy, verify route ordering and host resolution, test with actual requests, and check for conflicts. The key tools are `istioctl analyze`, `istioctl proxy-config routes`, and good old curl from inside a mesh pod. Most routing issues come down to incorrect host names, wrong route ordering, missing subsets, or gateway mismatches.
