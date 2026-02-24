# How to Validate Istio Configurations Using Kiali

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kiali, Configuration Validation, Service Mesh, Kubernetes

Description: A comprehensive guide to using Kiali's validation features to catch Istio misconfigurations and keep your mesh healthy.

---

Istio's configuration model is flexible, which is a polite way of saying it's easy to mess up. VirtualServices reference subsets that don't exist. Gateways use selectors that match nothing. AuthorizationPolicies conflict with each other in subtle ways. These mistakes don't produce errors when you apply them - they just silently break things.

Kiali's validation engine catches these problems automatically. It runs a comprehensive set of checks against your live Istio configuration and tells you exactly what's wrong and where. This post walks through how to use it effectively.

## Accessing Validations

Open Kiali and click "Istio Config" in the left sidebar. You'll see a table listing every Istio resource in your selected namespaces. The key column to watch is the validation status icon:

- A green checkmark means the configuration passed all validation checks
- A yellow triangle means there's a warning (something that might cause issues)
- A red circle means there's a validation error (something that will likely cause issues)

At the top of the page, a summary bar shows the total count of each validation status.

## Filtering for Problems

You probably don't want to scroll through hundreds of valid resources. Use the filters to narrow things down:

1. Set the namespace filter to the namespace you care about
2. Use the "Config" dropdown to filter by resource type (VirtualService, DestinationRule, etc.)
3. Use the validation filter to show only "Not Valid" or "Warning" resources

This immediately surfaces the configurations that need attention.

## VirtualService Validations

VirtualServices are where most configuration errors happen because they reference other resources. Kiali checks for:

### No Host Found

If a VirtualService references a host that doesn't match any service in the mesh:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-routing
  namespace: bookinfo
spec:
  hosts:
    - reviews-svc  # no such service exists
  http:
    - route:
        - destination:
            host: reviews-svc
```

Kiali flags: "Host not found: reviews-svc."

### Subset Not Found

Routing to a subset that isn't defined in any DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-routing
  namespace: bookinfo
spec:
  hosts:
    - reviews
  http:
    - route:
        - destination:
            host: reviews
            subset: v3
```

If no DestinationRule defines subset `v3` for the `reviews` host, Kiali reports: "Subset not found."

### Weight Sum Errors

When route weights don't add up to 100:

```yaml
http:
  - route:
      - destination:
          host: reviews
          subset: v1
        weight: 60
      - destination:
          host: reviews
          subset: v2
        weight: 30
```

Kiali warns: "Route weights should add up to 100."

### Duplicate VirtualServices

Two VirtualServices targeting the same host in the same namespace:

```yaml
# vs-1.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-routing-1
spec:
  hosts: ["reviews"]
---
# vs-2.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-routing-2
spec:
  hosts: ["reviews"]
```

Kiali warns: "More than one VirtualService for same host."

## DestinationRule Validations

### No Matching Workloads for Subset

If a DestinationRule defines a subset with labels that don't match any running workloads:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews
  namespace: bookinfo
spec:
  host: reviews
  subsets:
    - name: v4
      labels:
        version: v4  # no pods have this label
```

Kiali flags: "No matching workloads found for subset v4."

### Missing mTLS Settings

If your mesh has PeerAuthentication set to STRICT mTLS but a DestinationRule uses plain HTTP:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews
  namespace: bookinfo
spec:
  host: reviews
  trafficPolicy:
    tls:
      mode: DISABLE
```

Kiali warns about the mTLS mismatch.

## Gateway Validations

### No Matching Workload for Selector

When a Gateway's selector doesn't match any pods:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
spec:
  selector:
    app: my-custom-gateway  # no pods with this label
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "example.com"
```

Kiali flags: "No matching workload found for gateway selector."

### Duplicate Gateways

Two Gateways binding to the same port/host combination on the same workload.

## AuthorizationPolicy Validations

### Namespace Not Found

When an AuthorizationPolicy references a namespace that doesn't exist:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: my-policy
  namespace: bookinfo
spec:
  rules:
    - from:
        - source:
            namespaces: ["nonexistent-ns"]
```

### Service Account Not Found

References to service accounts that don't exist in the cluster.

## Reading Validation Details

Click on any resource in the Istio Config list to open its detail view. The detail page shows:

1. The YAML definition of the resource
2. A list of all validation checks that ran
3. For each failed check, an explanation of what's wrong and often a hint about how to fix it

The validation messages are specific. Instead of "invalid configuration," you get something like "VirtualService reviews-routing has a reference to subset v3 in host reviews but no DestinationRule defining this subset was found."

## Validation in the Service Detail View

You can also see validation issues from the service perspective. Go to the Services page, click on a service, and look at the "Istio Config" tab. This shows all Istio resources that affect that service, along with their validation status.

This view is useful when you want to check if a specific service has any configuration problems, without having to scan through all Istio resources.

## Automating Validation Checks

For CI/CD integration, query the Kiali API to check for validation errors:

```bash
#!/bin/bash
NAMESPACE="bookinfo"
KIALI_URL="http://localhost:20001"

# Get all Istio configs with validation
RESPONSE=$(curl -s "${KIALI_URL}/kiali/api/namespaces/${NAMESPACE}/istio")

# Count errors
ERRORS=$(echo "$RESPONSE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
errors = 0
for resource_type in data:
    if isinstance(data[resource_type], list):
        for item in data[resource_type]:
            if 'validation' in item:
                if not item['validation'].get('valid', True):
                    errors += 1
                    name = item.get('name', 'unknown')
                    print(f'  ERROR in {resource_type}/{name}', file=sys.stderr)
print(errors)
")

if [ "$ERRORS" -gt 0 ]; then
    echo "Found $ERRORS validation errors. Blocking deployment."
    exit 1
fi

echo "All Istio configurations are valid."
```

## Complementing with istioctl analyze

Kiali validations and `istioctl analyze` have different strengths:

| Feature | Kiali | istioctl analyze |
|---------|-------|-----------------|
| Live cluster analysis | Yes | Yes |
| File-based analysis | No | Yes |
| Visual indicators | Yes | No |
| API access | Yes | No |
| Pre-deploy checks | No | Yes |

The best approach is to use `istioctl analyze` in your CI pipeline before deploying:

```bash
istioctl analyze -f my-istio-configs/ --namespace bookinfo
```

And use Kiali for ongoing monitoring of live configuration after deployment.

## Staying on Top of Configuration Health

Make Kiali validation part of your regular workflow:

1. Check the Istio Config page after every deployment that touches Istio resources
2. Set up a periodic check using the API to catch configuration drift
3. Use the graph view to correlate validation errors with traffic issues
4. Fix warnings proactively - they often turn into errors as your mesh evolves

Kiali validation is not a replacement for testing your routing rules and policies, but it catches a huge category of mistakes that would otherwise require painful debugging. Getting into the habit of checking it regularly will save you a lot of headaches.
