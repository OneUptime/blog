# How to Debug Service-to-Service Connectivity in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Debugging, Service Mesh, Connectivity, Envoy

Description: Step-by-step guide to diagnosing and fixing service-to-service connectivity issues in Istio, from sidecar injection to Envoy proxy configuration.

---

Your service A tries to call service B and gets an error. In a plain Kubernetes setup, you would check the Service, Endpoints, and DNS. With Istio in the picture, there are additional layers to investigate: sidecar injection, mTLS handshakes, VirtualService routing, DestinationRules, and AuthorizationPolicies. Each of these can silently break service-to-service communication.

Here is a systematic approach to debugging these issues.

## Start with the Basics

Before going deep into Istio internals, rule out the simple stuff.

### Check if Both Pods Have Sidecars

```bash
kubectl get pod -n default -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.name}{","}{end}{"\n"}{end}'
```

Look for `istio-proxy` in the container list. If one side does not have a sidecar, mTLS will fail unless PeerAuthentication is set to PERMISSIVE.

You can also check injection status:

```bash
istioctl x describe pod my-app-xxxxx -n default
```

### Check if the Destination Service Exists

```bash
kubectl get svc my-service -n default
kubectl get endpoints my-service -n default
```

If the Endpoints list is empty, the pods backing the service might not be ready, or the label selector is wrong.

### Test Basic Connectivity Without Istio

Exec into the source pod and try a direct connection:

```bash
kubectl exec -it my-app-xxxxx -c istio-proxy -- curl -v http://my-service.default.svc.cluster.local:8080
```

If this works from the istio-proxy container but not from the app container, the issue is in how the app is making the request.

## Check mTLS Configuration

mTLS mismatches are the number one cause of service-to-service failures in Istio. If one side expects mTLS and the other does not, connections fail immediately.

Check PeerAuthentication policies:

```bash
kubectl get peerauthentication --all-namespaces
```

Check what mTLS mode is active for a specific pod:

```bash
istioctl x describe pod my-app-xxxxx -n default
```

Look for output like:

```
Pod is STRICT, clients configured automatically
```

If the source pod is not in the mesh (no sidecar) and the destination has STRICT mTLS, the connection will be refused. Either inject the sidecar into the source pod or set the destination's PeerAuthentication to PERMISSIVE:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: allow-plaintext
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: PERMISSIVE
```

## Check AuthorizationPolicies

AuthorizationPolicies can silently block traffic. Check all policies in the destination namespace:

```bash
kubectl get authorizationpolicy -n default
```

Look at the policies to see if they allow traffic from your source:

```bash
kubectl get authorizationpolicy -n default -o yaml
```

A common mistake is creating an ALLOW policy that is too restrictive, effectively denying everything else:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/frontend/sa/frontend"]
```

This only allows traffic from the frontend service account. Everything else is denied. If your source service uses a different service account, it will get a 403 RBAC: access denied error.

Check the Envoy logs for RBAC denials:

```bash
kubectl logs my-service-xxxxx -c istio-proxy | grep "rbac_access_denied"
```

## Check VirtualService and DestinationRule

A VirtualService might be redirecting traffic somewhere unexpected:

```bash
istioctl proxy-config routes my-app-xxxxx.default --name 8080 -o json
```

This shows the route configuration for port 8080 on the source proxy. Look at the `route` entries to see where traffic is actually being sent.

Check DestinationRules that might affect the connection:

```bash
kubectl get destinationrule -n default
```

A DestinationRule with a subset that does not match any pod labels will result in no healthy upstream errors:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
  namespace: default
spec:
  host: my-service
  subsets:
    - name: v2
      labels:
        version: v2
```

If your pods do not have the `version: v2` label, traffic routed to this subset will fail.

## Check Envoy Upstream Health

Look at the cluster (upstream) configuration on the source proxy:

```bash
istioctl proxy-config clusters my-app-xxxxx.default --fqdn my-service.default.svc.cluster.local
```

Check the endpoints:

```bash
istioctl proxy-config endpoints my-app-xxxxx.default --cluster "outbound|8080||my-service.default.svc.cluster.local"
```

If the endpoints list is empty or all endpoints show as unhealthy, that is your problem. Possible causes:

- The destination pods are not ready
- Outlier detection ejected all endpoints
- A Sidecar resource is limiting visibility

## Check Sidecar Resources

A Sidecar resource might be limiting which services the source proxy knows about:

```bash
kubectl get sidecar -n default -o yaml
```

If the Sidecar egress config does not include the destination service's namespace, the proxy will not have routes for it:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: default
spec:
  egress:
    - hosts:
        - "./*"  # Only services in the same namespace
```

Add the destination namespace:

```yaml
  egress:
    - hosts:
        - "./*"
        - "other-namespace/*"
```

## Enable Access Logging

If you still cannot figure out what is happening, enable access logs to see the actual request flow:

```bash
istioctl install --set meshConfig.accessLogFile=/dev/stdout
```

Or apply a Telemetry resource:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
```

Then check the logs on both the source and destination proxies:

```bash
# Source proxy
kubectl logs my-app-xxxxx -c istio-proxy --tail=50

# Destination proxy
kubectl logs my-service-xxxxx -c istio-proxy --tail=50
```

The access log includes response codes, upstream hosts, and flags that tell you exactly where the request went and why it failed.

## Common Response Flags

Envoy access logs include response flags that explain the failure:

- `UH` - No healthy upstream (all endpoints down or ejected)
- `UF` - Upstream connection failure
- `URX` - Request was rejected because upstream retry limit was reached
- `NR` - No route configured
- `UAEX` - Unauthorized (external auth denied)
- `RBAC` - RBAC access denied

A log line with `response_flags: UH` means Envoy has no healthy endpoints to send traffic to. A `NR` flag means no route matches the request.

## The Full Debugging Checklist

1. Verify sidecar injection on both sides
2. Check Service and Endpoints exist
3. Check PeerAuthentication mTLS mode
4. Check AuthorizationPolicies for RBAC blocks
5. Check VirtualService routing
6. Check DestinationRule subsets and labels
7. Check Envoy upstream endpoints
8. Check Sidecar resource scope
9. Enable access logging and check response flags

Working through this list systematically will get you to the root cause of most service-to-service connectivity issues in Istio. The key is knowing which layer to look at and having the right commands ready.
