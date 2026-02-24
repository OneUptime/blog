# How to Use istioctl analyze to Diagnose Configuration Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, istioctl, Configuration, Debugging, Kubernetes

Description: A practical walkthrough of using istioctl analyze to catch Istio misconfigurations before they cause production problems.

---

Istio configuration can be tricky. You write a VirtualService, apply it, and everything looks fine from kubectl's perspective. But Istio might silently ignore parts of it, or worse, it could break traffic in subtle ways. The `istioctl analyze` command is a linter for your Istio configuration. It checks for common mistakes, conflicting settings, and missing dependencies before they bite you in production.

## Running a Basic Analysis

The simplest form analyzes everything in the cluster:

```bash
istioctl analyze
```

To focus on a specific namespace:

```bash
istioctl analyze -n production
```

To analyze all namespaces:

```bash
istioctl analyze --all-namespaces
```

Output looks like:

```
Warning [IST0101] (VirtualService reviews-route.default) Referenced host not found: "reviews-v2"
Warning [IST0108] (DestinationRule reviews-dr.default) This destination rule is not used by any virtual service
Error [IST0145] (Gateway my-gateway.istio-system) Conflict with other gateway: gateway-2
Info [IST0102] (Namespace default) The namespace is not enabled for Istio injection
```

Each finding has a severity (Error, Warning, Info), a code (IST0101, IST0108, etc.), the affected resource, and a description.

## Analyzing Local Files

One of the most useful features is analyzing YAML files before you apply them. This catches issues before they hit the cluster:

```bash
istioctl analyze my-virtualservice.yaml
```

You can combine local files with cluster state:

```bash
istioctl analyze new-gateway.yaml new-virtualservice.yaml
```

The analyzer checks the local files against the existing cluster configuration. So if your new VirtualService references a Gateway that already exists in the cluster, it'll validate correctly.

To analyze purely against local files without any cluster connection:

```bash
istioctl analyze --use-kube=false my-virtualservice.yaml my-destinationrule.yaml
```

This is perfect for CI/CD pipelines where you might not have cluster access.

## Common Issues istioctl analyze Catches

### IST0101: Referenced Host Not Found

This is probably the most common warning:

```
Warning [IST0101] (VirtualService reviews-route.default) Referenced host not found: "reviews"
```

It means your VirtualService references a host that doesn't match any Kubernetes Service or ServiceEntry. Check the `hosts` field:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-route
  namespace: default
spec:
  hosts:
  - reviews  # This needs to match a Service name
  http:
  - route:
    - destination:
        host: reviews
        subset: v1
```

Common causes: typos in the service name, the service is in a different namespace (use the FQDN like `reviews.production.svc.cluster.local`), or the service simply doesn't exist yet.

### IST0108: Unused Destination Rule

```
Warning [IST0108] (DestinationRule reviews-dr.default) This destination rule is not used
```

A DestinationRule exists but no VirtualService or traffic policy references it. This isn't necessarily a problem (the DestinationRule still applies its traffic policies), but it might indicate a misconfiguration where you forgot to create the corresponding VirtualService.

### IST0102: Namespace Not Injected

```
Info [IST0102] (Namespace default) The namespace is not enabled for Istio injection
```

The namespace doesn't have the `istio-injection=enabled` label. Pods deployed here won't get sidecars automatically. Fix it with:

```bash
kubectl label namespace default istio-injection=enabled
```

### IST0106: Schema Validation Failure

```
Error [IST0106] (VirtualService bad-vs.default) Schema validation error: timeout must be > 0
```

Your YAML has an invalid value that doesn't match the Istio API schema. This is similar to what kubectl validation catches, but istioctl knows the Istio-specific schemas better.

### IST0145: Conflicting Gateways

```
Error [IST0145] (Gateway my-gateway.istio-system) Conflict with gateway-2: both select the same workload on port 443
```

Two Gateways are trying to bind to the same port on the same ingress gateway pods. You need to either merge them into one Gateway or use different selector labels.

### IST0128: Missing Destination Rule for Subset

```
Warning [IST0128] (VirtualService reviews-route.default) This host has no DestinationRule with subset "v3"
```

Your VirtualService routes to a subset that doesn't exist in any DestinationRule. Traffic to that subset will fail with 503 errors.

## Integrating analyze into CI/CD

You can use `istioctl analyze` in your deployment pipeline to catch issues before they reach the cluster. Here's an example for a GitHub Actions workflow:

```yaml
name: Validate Istio Config
on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Install istioctl
      run: |
        curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.20.0 sh -
        echo "$PWD/istio-1.20.0/bin" >> $GITHUB_PATH
    - name: Analyze Istio configuration
      run: |
        istioctl analyze --use-kube=false \
          -A kubernetes/istio/*.yaml \
          --failure-threshold Warning
```

The `--failure-threshold` flag controls what severity causes a non-zero exit code. Set it to `Warning` to fail the pipeline on warnings, or `Error` to only fail on errors.

## Suppressing False Positives

Sometimes analyze flags things that you've intentionally configured. You can suppress specific messages with annotations:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: external-service
  namespace: default
  annotations:
    galley.istio.io/analyze-suppress: "IST0101"
spec:
  hosts:
  - external-api.example.com
  http:
  - route:
    - destination:
        host: external-api.example.com
```

You can suppress multiple codes with a comma-separated list:

```yaml
annotations:
  galley.istio.io/analyze-suppress: "IST0101,IST0108"
```

## Output Formats

By default, analyze prints human-readable text. For programmatic use, request JSON or YAML:

```bash
istioctl analyze -n default -o json
```

```json
[
  {
    "code": "IST0101",
    "level": "Warning",
    "message": "Referenced host not found: \"reviews\"",
    "origin": "VirtualService reviews-route.default",
    "reference": "https://istio.io/docs/reference/config/analysis/ist0101/"
  }
]
```

This is handy for parsing in scripts or sending to monitoring systems.

## Analyzing Specific Resource Types

You can narrow the analysis to specific resource types if you're only interested in certain kinds of issues:

```bash
# Only check VirtualServices
istioctl analyze -n default --resource virtualservice

# Only check Gateways
istioctl analyze -n default --resource gateway
```

## Real-World Usage Tips

Run `istioctl analyze` after every Istio config change. Make it a habit like running `kubectl get events` after a deployment. It takes a second to run and catches a huge range of problems.

Some additional tips from experience:

The analyzer is conservative. If it flags something, it's almost always a real issue or at least worth investigating. Don't ignore warnings thinking they're false positives without checking first.

Cross-namespace references are a frequent source of IST0101 warnings. If your VirtualService in namespace `production` references a service in namespace `backend`, use the full FQDN:

```yaml
hosts:
- backend-api.backend.svc.cluster.local
```

After Istio upgrades, run analyze again. New versions add new analysis checks, so you might discover pre-existing issues that the older analyzer didn't catch.

When you have a complex mesh with hundreds of resources, run analyze per-namespace and fix one namespace at a time. Trying to tackle everything at once gets overwhelming.

The analyze command is one of the most underused features of istioctl. Get in the habit of running it regularly, and you'll catch problems long before they affect traffic.
