# How to Debug VirtualService Configuration Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, Debugging, Troubleshooting, Kubernetes

Description: A comprehensive guide to debugging Istio VirtualService configuration issues with practical commands and common problem solutions.

---

VirtualService misconfigurations are one of the most common sources of frustration with Istio. Traffic goes to the wrong place, rules seem to be ignored, or you get unexpected 404s and 503s. The good news is that Istio provides solid debugging tools. The bad news is that most people do not know about them.

## Step 1: Check if the VirtualService Exists

Start with the basics:

```bash
# List all VirtualServices in the namespace
kubectl get virtualservices -n default

# Get the full YAML of your VirtualService
kubectl get virtualservice my-app -n default -o yaml
```

Check that:
- The VirtualService exists in the right namespace
- The hosts match what you expect
- The gateways are correct (or absent for mesh-internal traffic)
- The rules are in the right order

## Step 2: Run istioctl analyze

This is the single most useful debugging command:

```bash
# Analyze a specific namespace
istioctl analyze -n default

# Analyze all namespaces
istioctl analyze --all-namespaces

# Analyze a specific file before applying
istioctl analyze my-virtualservice.yaml
```

Common issues it catches:
- VirtualService references a DestinationRule subset that does not exist
- Gateway is referenced but not found
- Host conflicts between multiple VirtualServices
- Referenced services that do not exist

## Step 3: Check Envoy Proxy Configuration

The VirtualService is a high-level config that Istio translates into Envoy configuration. If the translation went wrong, checking the Envoy config tells you what is actually happening:

```bash
# Check routes on a specific pod
istioctl proxy-config routes deploy/my-app -n default

# Get detailed route JSON
istioctl proxy-config routes deploy/my-app -n default -o json

# Filter routes by name
istioctl proxy-config routes deploy/my-app -n default --name "80"
```

The output shows you the actual routing rules Envoy is using. Compare them against what you expected from your VirtualService.

## Step 4: Check Listeners and Clusters

Beyond routes, check listeners (what Envoy is listening on) and clusters (where Envoy can send traffic):

```bash
# Check listeners
istioctl proxy-config listeners deploy/my-app -n default

# Check clusters (destinations)
istioctl proxy-config clusters deploy/my-app -n default

# Check endpoints (actual pod IPs)
istioctl proxy-config endpoints deploy/my-app -n default
```

If a destination shows zero endpoints, the service might not have running pods, or the subset labels might not match any pods.

## Step 5: Check the Proxy Sync Status

Sometimes the proxy has not received the latest configuration:

```bash
# Check sync status for all proxies
istioctl proxy-status

# Check a specific pod
istioctl proxy-status deploy/my-app -n default
```

The output shows:
- `SYNCED` - The proxy has the latest configuration
- `NOT SENT` - Istio has not sent configuration to the proxy
- `STALE` - The proxy has old configuration

If a proxy is stale, try restarting the pod:

```bash
kubectl rollout restart deploy/my-app -n default
```

## Common Issues and Solutions

### Issue: VirtualService rules are ignored

**Symptom**: You applied a VirtualService but traffic does not follow the rules.

**Check**: Is the VirtualService bound to the right gateway?

```yaml
# This only affects traffic through my-gateway
gateways:
  - my-gateway

# This only affects mesh-internal traffic
# (no gateways field, or gateways: [mesh])

# This affects both
gateways:
  - my-gateway
  - mesh
```

### Issue: 503 errors after applying VirtualService

**Symptom**: Requests return 503 "no healthy upstream."

**Check**: The DestinationRule subset might reference labels that no pods have:

```bash
# Check which pods match the subset labels
kubectl get pods -l app=my-app,version=v2 -n default

# If this returns no pods, your subset labels are wrong
```

Also check that the DestinationRule exists:

```bash
kubectl get destinationrules -n default
```

A VirtualService that routes to a subset without a corresponding DestinationRule will fail.

### Issue: Wrong rule matches

**Symptom**: A different rule matches than the one you expected.

**Check**: Rule order. Remember, rules are evaluated top-to-bottom, first match wins.

```bash
# See the VirtualService rules in order
kubectl get vs my-app -o yaml | grep -A 5 "match:"
```

If a catch-all route (no match condition) appears before your specific rules, it swallows everything.

### Issue: Conflicting VirtualServices

**Symptom**: Routing is unpredictable or changes between requests.

**Check**: Are there multiple VirtualServices for the same host?

```bash
# Find all VirtualServices matching a host
kubectl get vs -A -o yaml | grep -B 5 "my-app"
```

Multiple VirtualServices for the same host get merged, and the merge order is not guaranteed. Consolidate them into a single VirtualService.

### Issue: VirtualService works for some pods but not others

**Symptom**: Some client pods follow the routing rules and others do not.

**Check**: Is sidecar injection working for all pods?

```bash
# Check if the sidecar is present
kubectl get pods -n default -o jsonpath='{.items[*].spec.containers[*].name}' | tr ' ' '\n' | sort | uniq

# Look for pods without istio-proxy container
kubectl get pods -n default -o json | jq '.items[] | select(.spec.containers | length == 1) | .metadata.name'
```

Pods without the Istio sidecar bypass VirtualService rules entirely.

### Issue: Headers not matching

**Symptom**: Header-based routing does not work.

**Check**: Header names in Istio are lowercase. If you are matching on `X-Custom-Header`, try `x-custom-header`:

```yaml
# Wrong (might not match)
headers:
  X-Custom-Header:
    exact: "value"

# Correct (lowercase)
headers:
  x-custom-header:
    exact: "value"
```

## Enable Debug Logging

For deeper investigation, enable debug logging on the Envoy proxy:

```bash
# Set debug level for routing
istioctl proxy-config log deploy/my-app -n default --level router:debug

# Watch the logs
kubectl logs deploy/my-app -c istio-proxy -n default -f

# Reset to default log level when done
istioctl proxy-config log deploy/my-app -n default --level router:warning
```

The debug logs show every routing decision Envoy makes, including why a particular route was chosen.

## Using Envoy Admin Interface

You can access Envoy's admin interface for detailed stats:

```bash
# Port-forward to the admin interface
kubectl port-forward deploy/my-app -n default 15000:15000

# Then open in browser: http://localhost:15000

# Or query stats directly
kubectl exec deploy/my-app -c istio-proxy -n default -- curl -s localhost:15000/stats | grep "virtual"
```

## Kiali for Visual Debugging

Kiali shows traffic flow visually, making it easy to spot misrouting:

```bash
istioctl dashboard kiali
```

In Kiali, look at:
- The graph view to see where traffic is actually flowing
- The VirtualService details page to see the parsed configuration
- Warning indicators for misconfigurations

## Debugging Checklist

When you hit a VirtualService issue, run through this checklist:

1. Does the VirtualService exist? (`kubectl get vs`)
2. Does `istioctl analyze` report any errors?
3. Is the VirtualService in the right namespace?
4. Are the hosts correct?
5. Is it bound to the right gateway (or mesh)?
6. Do the DestinationRule subsets exist?
7. Do pods with the right labels exist?
8. Are the rules in the correct order?
9. Is the sidecar injected into all relevant pods?
10. Is the proxy synced? (`istioctl proxy-status`)

Most VirtualService issues fall into one of these categories. Working through the checklist systematically will get you to the root cause faster than random debugging.
