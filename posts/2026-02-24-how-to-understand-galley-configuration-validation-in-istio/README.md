# How to Understand Galley (Configuration Validation) in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Galley, Configuration Validation, Kubernetes, Webhook

Description: Learn how Galley handles configuration validation in Istio, preventing invalid mesh configurations from being applied to your Kubernetes cluster.

---

Galley is the configuration validation component in Istio. Its job is to catch bad configuration before it reaches the mesh. If you have ever applied an Istio VirtualService with a typo and wondered why nothing happened, or if you have seen a helpful error message telling you exactly what was wrong, that was Galley at work.

## What Galley Does

In the original Istio architecture (pre-1.5), Galley was a separate microservice that handled configuration ingestion, validation, and distribution. Today, it lives inside istiod as a module, but its core purpose remains the same: validate Istio configuration.

Galley operates as a Kubernetes admission webhook. When you apply an Istio custom resource (VirtualService, DestinationRule, AuthorizationPolicy, etc.), the Kubernetes API server sends the resource to Galley for validation before storing it. If the validation fails, the resource is rejected and never makes it to etcd.

```bash
# See the webhook configuration
kubectl get validatingwebhookconfiguration -l app=istiod
```

Output:

```
NAME                           WEBHOOKS   AGE
istio-validator-istio-system   1          30d
```

## How Validation Works

The validation flow is:

1. You run `kubectl apply -f my-virtualservice.yaml`
2. The Kubernetes API server receives the request
3. Before persisting the resource, API server sends it to istiod's validation webhook
4. Istiod validates the resource against the Istio schema
5. If valid, istiod responds with "allowed" and the resource is saved
6. If invalid, istiod responds with "denied" and an error message

The validation endpoint is typically at:

```
https://istiod.istio-system.svc:443/validate
```

## What Gets Validated

Galley validates all Istio custom resources:

- VirtualService
- DestinationRule
- Gateway
- ServiceEntry
- Sidecar
- AuthorizationPolicy
- PeerAuthentication
- RequestAuthentication
- EnvoyFilter
- WorkloadEntry
- WorkloadGroup
- Telemetry

Each resource type has specific validation rules. Here are some common validations:

### VirtualService Validations

```yaml
# Invalid: weights do not sum to 100
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts:
  - reviews
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

Error: `total destination weight 90 != 100`

```yaml
# Invalid: duplicate match conditions
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts:
  - reviews
  http:
  - match:
    - uri:
        prefix: /api
    route:
    - destination:
        host: reviews
  - match:
    - uri:
        prefix: /api
    route:
    - destination:
        host: reviews-v2
```

This would generate a warning about conflicting match rules.

### DestinationRule Validations

```yaml
# Invalid: unknown load balancer type
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: reviews
spec:
  host: reviews
  trafficPolicy:
    loadBalancer:
      simple: FASTEST
```

Error: `invalid load balancer simple type`

### Gateway Validations

```yaml
# Invalid: port conflict
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: my-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https-1
      protocol: HTTPS
    hosts:
    - "*.example.com"
  - port:
      number: 443
      name: https-2
      protocol: HTTPS
    hosts:
    - "*.another.com"
```

Galley checks for conflicting port/protocol combinations.

## Using istioctl for Pre-Validation

You do not have to wait until apply time to catch errors. The `istioctl validate` command lets you check files locally:

```bash
# Validate a single file
istioctl validate -f my-virtualservice.yaml

# Validate all files in a directory
istioctl validate -f k8s/istio/

# Validate from stdin
cat my-virtualservice.yaml | istioctl validate -f -
```

This is useful in CI/CD pipelines where you want to catch errors before they hit the cluster.

## The analyze Command

Beyond basic schema validation, Istio provides `istioctl analyze` which performs deeper analysis:

```bash
# Analyze the entire mesh
istioctl analyze --all-namespaces

# Analyze a specific namespace
istioctl analyze -n production

# Analyze local files without a cluster
istioctl analyze -f k8s/istio/ --use-kube=false
```

The analyzer catches issues that schema validation alone misses:

```bash
istioctl analyze -n default
```

```
Warning [IST0101] (VirtualService default/reviews) Referenced host not found: "reviews-v3"
Warning [IST0104] (Gateway default/my-gateway) The gateway refers to a selector that does not match any deployment
Info [IST0102] (Namespace default) The namespace is not enabled for Istio injection
```

Common analyzer messages:

| Code | Description |
|------|------------|
| IST0101 | VirtualService references a host that does not exist |
| IST0102 | Namespace does not have sidecar injection enabled |
| IST0104 | Gateway selector does not match any deployment |
| IST0106 | Schema validation error |
| IST0108 | Unknown annotation on a resource |
| IST0127 | No matching subset found in DestinationRule |

## Webhook Failure Policy

The validation webhook has a failure policy that determines what happens if istiod is unavailable when you try to apply an Istio resource:

```bash
kubectl get validatingwebhookconfiguration istio-validator-istio-system -o yaml | \
    grep failurePolicy
```

```
failurePolicy: Fail
```

With `Fail`, if istiod is down, you cannot create or update any Istio resources. This is the safe default because it prevents unvalidated configuration from being applied.

If you change it to `Ignore`, resources will be accepted without validation when istiod is unreachable. This is risky because invalid configuration could be applied.

## Bypassing Validation

Sometimes during debugging, you might need to apply a resource that Galley rejects. You can bypass the webhook:

```bash
# Apply with dry-run to see what would happen
kubectl apply -f my-resource.yaml --dry-run=server

# Bypass the webhook (use with extreme caution)
kubectl apply -f my-resource.yaml --validate=false
```

Note that `--validate=false` only skips client-side Kubernetes validation, not the webhook. To truly bypass the webhook, you would need to delete the ValidatingWebhookConfiguration, which is strongly discouraged.

## Custom Validation with CI/CD

Build validation into your deployment pipeline:

```bash
#!/bin/bash
set -euo pipefail

echo "Validating Istio manifests..."
ERRORS=0

for file in k8s/istio/*.yaml; do
    echo "Checking $file..."
    if ! istioctl validate -f "$file" 2>&1; then
        ERRORS=$((ERRORS + 1))
    fi
done

echo "Running mesh analysis..."
if ! istioctl analyze -f k8s/istio/ --use-kube=false 2>&1; then
    ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -gt 0 ]; then
    echo "Validation failed with $ERRORS errors"
    exit 1
fi

echo "All validations passed"
```

## Monitoring Validation

Track webhook activity through metrics:

```bash
kubectl exec -n istio-system deploy/istiod -- \
    curl -s localhost:15014/metrics | grep galley
```

Key metrics:

```
# Validation requests
galley_validation_passed
galley_validation_failed

# Webhook errors
galley_validation_http_error
```

## Troubleshooting Validation Issues

### Webhook Not Working

If invalid configurations are being accepted without errors:

```bash
# Check if the webhook exists
kubectl get validatingwebhookconfiguration

# Check if istiod is healthy
kubectl get pods -n istio-system -l app=istiod

# Check istiod logs for webhook-related errors
kubectl logs -n istio-system deploy/istiod | grep -i "validation\|webhook"
```

### All Istio Resources Failing

If every Istio resource creation fails, even valid ones:

```bash
# Check if istiod's webhook endpoint is reachable
kubectl get endpoints istiod -n istio-system

# Check the webhook's CA bundle
kubectl get validatingwebhookconfiguration istio-validator-istio-system \
    -o jsonpath='{.webhooks[0].clientConfig.caBundle}' | base64 -d | openssl x509 -text -noout
```

The CA bundle might be stale if istiod's certificates were rotated.

Galley's configuration validation is your first line of defense against mesh misconfigurations. It catches obvious errors like invalid field values and weight mismatches, and through `istioctl analyze`, it catches more subtle issues like missing host references. Making validation part of your workflow - both in CI/CD and through the admission webhook - means fewer production incidents caused by configuration mistakes.
