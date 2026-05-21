# How to Debug DestinationRule Configuration Problems

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DestinationRule, Debugging, Troubleshooting, Kubernetes

Description: Practical debugging techniques for common Istio DestinationRule configuration problems including 503 errors, policy mismatches, and more.

---

DestinationRule misconfigurations are one of the most common sources of mysterious 503 errors and unexpected behavior in Istio. The tricky part is that Istio often does not tell you directly what went wrong - it just silently ignores the configuration or returns a generic error. Here is a systematic approach to finding and fixing DestinationRule problems.

## The Number One Tool: istioctl analyze

Before anything else, run:

```bash
istioctl analyze
```

This catches a surprising number of issues including:
- DestinationRules referencing services that do not exist
- VirtualServices referencing subsets not defined in any DestinationRule
- Conflicting DestinationRules for the same host
- TLS mode mismatches

```bash
istioctl analyze --namespace default
```

Always run this after applying any configuration changes. It takes seconds and catches the most common mistakes.

## Problem: 503 Errors After Creating DestinationRule

This is the most common issue. You create a DestinationRule and suddenly start getting 503 errors.

### Cause 1: VirtualService references an undefined subset

Your VirtualService routes to `subset: v2` but the DestinationRule does not define a v2 subset.

```bash
# Check what subsets are defined

kubectl get destinationrule my-service-dr -o yaml | grep -A5 subsets
```

Fix: Make sure every subset referenced in VirtualService routes exists in the DestinationRule.

### Cause 2: Subset labels do not match any pods

The subset is defined but its labels do not match any running pods:

```bash
# Check what labels the subset expects
kubectl get destinationrule my-service-dr -o yaml

# Check what labels your pods actually have
kubectl get pods -l app=my-service --show-labels
```

Fix: Ensure your pod labels match the subset label selectors exactly.

### Cause 3: Connection pool limits too tight

If `maxConnections` or `http1MaxPendingRequests` is set too low, normal traffic gets rejected:

```bash
# Check for upstream overflow events
kubectl exec <pod-name> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep overflow
```

If you see `upstream_cx_overflow` or `upstream_rq_pending_overflow` incrementing, your limits are too tight. Increase `maxConnections` and `http1MaxPendingRequests`.

## Problem: DestinationRule Seems to Be Ignored

You applied a DestinationRule but the traffic policy does not seem to take effect.

### Check 1: Verify the host name matches

The `host` field must match your Kubernetes service name. Common mismatches:

```yaml
# Wrong - using deployment name instead of service name
host: my-deployment

# Correct - using the service name
host: my-service

# Also correct - FQDN for cross-namespace
host: my-service.other-namespace.svc.cluster.local
```

### Check 2: Verify Envoy received the configuration

```bash
istioctl proxy-config cluster <pod-name> --fqdn my-service.default.svc.cluster.local -o json
```

This shows the actual Envoy configuration. Check if your load balancing policy, connection pool settings, and outlier detection are present.

If the cluster exists but your settings are not reflected, there might be a conflicting DestinationRule:

```bash
kubectl get destinationrule -A | grep my-service
```

Multiple DestinationRules for the same host are merged with restrictions. Duplicate subset names and duplicate top-level traffic policies are not merged; the first one processed is used and later duplicates are discarded.

### Check 3: Wrong namespace

DestinationRules are namespace-scoped, but Istio looks them up in this order: the client namespace, the service namespace, then the mesh root namespace (`istio-system` by default):

```bash
kubectl get destinationrule -n <your-namespace>
```

If the DestinationRule is in a namespace that is not on that lookup path, it will not apply to that client even if it is exported. For broad reuse, define the DestinationRule in the service namespace.

## Problem: TLS Configuration Mismatch

TLS issues typically manifest as connection resets or SSL handshake errors.

### Check the TLS status

```bash
istioctl experimental describe pod <pod-name>
```

This can show the DestinationRule TLS mode for traffic to the pod and warnings when PeerAuthentication and DestinationRule settings conflict.

Common mismatches:
- Client sends ISTIO_MUTUAL but server pod has no sidecar
- Client sends DISABLE but server requires mTLS (PeerAuthentication is STRICT)
- Client sends SIMPLE but server expects MUTUAL

### Fix: Align TLS settings

By default, Istio's auto mTLS sends mTLS to workloads with sidecars and plaintext to workloads without sidecars. If you explicitly configured a DestinationRule to use mTLS for a server that has no sidecar, remove that TLS override or set `mode: DISABLE`:

```yaml
trafficPolicy:
  tls:
    mode: DISABLE
```

If the server requires mTLS and auto mTLS is not handling it for you, set `mode: ISTIO_MUTUAL`:

```yaml
trafficPolicy:
  tls:
    mode: ISTIO_MUTUAL
```

## Problem: Outlier Detection Not Ejecting Unhealthy Pods

You configured outlier detection but unhealthy pods keep receiving traffic.

### Check 1: Verify the configuration is active

```bash
istioctl proxy-config cluster <pod-name> \
  --fqdn my-service.default.svc.cluster.local -o json | grep -A20 outlierDetection
```

### Check 2: Check ejection stats

```bash
kubectl exec <pod-name> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep outlier
```

If `ejections_total` is 0, either:
- The errors are not consecutive (mixed with successes)
- The interval has not elapsed yet
- The maxEjectionPercent has been reached

### Check 3: Verify error type

For HTTP traffic, `consecutive5xxErrors` counts 5xx status codes. For opaque TCP traffic, connection timeouts, connection failures, and request failures also qualify. Use `consecutiveGatewayErrors` when you specifically want to count gateway-type errors such as HTTP 502, 503, and 504, or TCP connection errors.

## Useful Debugging Commands

### View all DestinationRules

```bash
kubectl get destinationrule -A
```

### View a specific DestinationRule

```bash
kubectl get destinationrule <name> -o yaml
```

### Check Envoy proxy configuration

```bash
# All clusters
istioctl proxy-config cluster <pod-name>

# Specific service
istioctl proxy-config cluster <pod-name> --fqdn my-service.default.svc.cluster.local -o json

# Endpoints for a service
istioctl proxy-config endpoint <pod-name> --cluster "outbound|8080||my-service.default.svc.cluster.local"

# Listener configuration
istioctl proxy-config listener <pod-name>

# Route configuration
istioctl proxy-config route <pod-name>
```

### Check Envoy logs

```bash
kubectl logs <pod-name> -c istio-proxy --tail=50
```

For more verbose logging, set the debug level:

```bash
istioctl proxy-config log <pod-name> --level cluster:debug,upstream:debug
```

Remember to set it back to info when done:

```bash
istioctl proxy-config log <pod-name> --level cluster:info,upstream:info
```

### Check Envoy stats

```bash
# All stats for a specific upstream
kubectl exec <pod-name> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep my-service

# Connection stats
kubectl exec <pod-name> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep upstream_cx

# Request stats
kubectl exec <pod-name> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep upstream_rq
```

## Problem: Conflicting DestinationRules

Two DestinationRules for the same host can produce surprising results if they define the same subset names or top-level traffic policy:

```bash
kubectl get destinationrule -A -o custom-columns=NAME:.metadata.name,NAMESPACE:.metadata.namespace,HOST:.spec.host | sort -k3
```

If you see two rules with the same host, make sure they do not define the same subset names or more than one top-level `trafficPolicy`. If they are in different namespaces, Istio uses the first matching rule on the lookup path: client namespace, service namespace, then the mesh root namespace.

## Systematic Debugging Checklist

When something is not working:

1. Run `istioctl analyze` for obvious issues
2. Verify the DestinationRule host matches the service name
3. Verify subset labels match pod labels
4. Check Envoy received the config with `istioctl proxy-config cluster`
5. Check for conflicting DestinationRules
6. Check Envoy stats for overflow counters
7. Check Envoy logs for errors
8. Verify TLS settings match on both sides

Work through this list systematically and you will find the problem. Most DestinationRule issues come down to name mismatches, missing subsets, or TLS mode conflicts.
