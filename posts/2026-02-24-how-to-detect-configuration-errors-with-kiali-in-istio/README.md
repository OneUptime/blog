# How to Detect Configuration Errors with Kiali in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kiali, Configuration, Troubleshooting, Service Mesh

Description: How to use Kiali's built-in validation engine to find and fix Istio configuration errors before they cause production issues.

---

Istio configuration is powerful but tricky. A small typo in a VirtualService, a missing host in a DestinationRule, or a conflicting AuthorizationPolicy can silently break your traffic routing or security posture. The worst part is that `kubectl apply` happily accepts these broken configs without complaint.

Kiali has a built-in validation engine that catches these mistakes. It checks your Istio resources against a set of rules, cross-references them with each other, and flags anything that looks wrong. Think of it as a linter for your Istio configuration.

## What Kiali Validates

Kiali validates all the major Istio resource types:

- VirtualService
- DestinationRule
- Gateway
- ServiceEntry
- Sidecar
- AuthorizationPolicy
- PeerAuthentication
- RequestAuthentication
- WorkloadEntry
- WorkloadGroup
- EnvoyFilter

For each resource type, Kiali runs specific validation checks. For example, it verifies that VirtualService hosts actually match existing services, that DestinationRule subsets reference valid labels, and that Gateways don't conflict with each other.

## Accessing the Validation View

Open Kiali and navigate to the "Istio Config" section in the left sidebar. You'll see a list of all Istio resources across your selected namespaces. Each resource has a validation status icon:

- Green checkmark: Valid configuration
- Yellow warning: Possible issue that may or may not cause problems
- Red error: Definite configuration problem that will likely cause issues

Click on any resource to see the specific validation messages.

## Common Configuration Errors Kiali Catches

### Missing Destination Rules

One of the most frequent issues: you create a VirtualService that routes to subsets, but forget to create the matching DestinationRule.

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews
  namespace: bookinfo
spec:
  hosts:
    - reviews
  http:
    - route:
        - destination:
            host: reviews
            subset: v1
          weight: 80
        - destination:
            host: reviews
            subset: v2
          weight: 20
```

If you apply this without a DestinationRule that defines the `v1` and `v2` subsets, Kiali will flag it with an error: "Subset not found" for both subsets.

The fix is to create the matching DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews
  namespace: bookinfo
spec:
  host: reviews
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

### Conflicting VirtualServices

If two VirtualServices target the same host in the same namespace with conflicting rules, Kiali warns you about it. This is a common problem when multiple teams deploy to the same namespace:

```yaml
# Team A's VirtualService
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: frontend-routing-a
spec:
  hosts:
    - frontend
  http:
    - route:
        - destination:
            host: frontend
            subset: v1
---
# Team B's VirtualService
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: frontend-routing-b
spec:
  hosts:
    - frontend
  http:
    - route:
        - destination:
            host: frontend
            subset: v2
```

Kiali flags this as "More than one VirtualService for same host."

### Gateway Selector Mismatches

When your Gateway's selector doesn't match any running pods, traffic won't flow through it. This happens when the selector labels are wrong:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: bookinfo
spec:
  selector:
    istio: ingress-gateway  # typo - should be "ingressgateway"
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.example.com"
```

Kiali validates the selector and warns you if no workloads match.

### Unused DestinationRules

If you have a DestinationRule that no VirtualService references, Kiali flags it as a warning. While this isn't strictly an error (DestinationRules still apply default settings), it often indicates leftover configuration that should be cleaned up.

### Port Name Mismatches

Istio requires specific port naming conventions for protocol detection. If your Kubernetes service ports aren't named correctly, Kiali catches this:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
    - port: 8080
      name: server  # Should be "http-server" or "http"
```

Kiali warns that the port name doesn't follow Istio's naming convention (should start with http, grpc, tcp, etc.).

## Using the Validation Overview

The Istio Config page has a summary bar at the top showing the total count of valid, warning, and error configurations. This gives you a quick health check of your entire Istio setup.

You can filter the list by:

- **Namespace** - Focus on a specific namespace
- **Type** - Show only VirtualServices, DestinationRules, etc.
- **Validation** - Show only resources with errors or warnings

For a quick check of your cluster health, filter by validation status "Not Valid" to see everything that needs attention.

## Validation in the Graph View

Kiali also surfaces validation issues in the traffic graph. Nodes with configuration problems show a warning or error badge. This means you can spot misconfigured services while looking at the topology graph, without having to check each resource individually.

Click on a node with a validation badge to see the specific issues in the side panel.

## Running Validation Programmatically

If you want to integrate Kiali's validation into your CI/CD pipeline, you can use the Kiali API:

```bash
# Get all Istio configs with validation status
curl -s "http://localhost:20001/kiali/api/namespaces/bookinfo/istio" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for kind in data:
    for item in data[kind]:
        if 'validation' in item and item['validation']['valid'] == False:
            print(f\"ERROR: {kind}/{item['name']}: {item['validation']['checks']}\")
"
```

This lets you fail a deployment if any Istio configuration is invalid.

## Combining with istioctl analyze

Kiali's validation and `istioctl analyze` overlap in some areas but each catches things the other doesn't. For the most thorough validation, use both:

```bash
# Run istioctl's analyzer
istioctl analyze --namespace bookinfo

# Then check Kiali's validation view for additional issues
```

`istioctl analyze` is great for catching problems before deployment (it works on files), while Kiali's validation is better for ongoing monitoring of live configuration.

## Setting Up Validation Notifications

Kiali itself doesn't send notifications when it finds configuration errors, but you can set up a simple monitoring loop:

```bash
#!/bin/bash
while true; do
  ERRORS=$(curl -s "http://localhost:20001/kiali/api/namespaces/bookinfo/istio" | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
count = 0
for kind in data:
    for item in data[kind]:
        if 'validation' in item and not item['validation']['valid']:
            count += 1
print(count)
")
  if [ "$ERRORS" -gt 0 ]; then
    echo "Found $ERRORS Istio configuration errors"
    # Send alert via webhook, Slack, etc.
  fi
  sleep 300
done
```

## Best Practices

1. **Check Kiali after every deployment** that includes Istio configuration changes. Make it part of your deployment checklist.

2. **Fix warnings too, not just errors.** Warnings often point to configuration drift or cleanup that should have happened.

3. **Use the namespace filter** to focus validation on the namespace you just deployed to. Checking the entire cluster every time creates noise.

4. **Cross-reference with traffic data.** A configuration might be "valid" according to Kiali's rules but still cause traffic issues. Always check the graph view alongside the config view.

5. **Keep Istio and Kiali versions in sync.** Kiali's validation rules are tied to specific Istio versions. Running a mismatched version might give you false positives or miss real errors.

Kiali's configuration validation is one of its most underrated features. It catches mistakes that would otherwise show up as mysterious 503 errors or traffic black holes in production. Making it a regular part of your workflow saves hours of debugging time.
