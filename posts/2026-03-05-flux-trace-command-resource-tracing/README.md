# How to Use flux trace Command for Resource Tracing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Monitoring, Debugging, CLI, Tracing

Description: Learn how to use the flux trace command to trace the full delivery chain of a Kubernetes resource from its Git source through Flux CD to its running state in the cluster.

---

The `flux trace` command is one of the most powerful debugging tools in the Flux CLI. It traces the complete delivery path of a Kubernetes resource -- from the Git repository source, through the Kustomization or HelmRelease that manages it, all the way to the live object in the cluster. This end-to-end view makes it straightforward to identify exactly where in the GitOps pipeline a problem originates.

## Basic Usage

Trace any Kubernetes resource to see its Flux delivery chain:

```bash
flux trace deployment my-app -n my-namespace
```

The output shows the complete chain:

```
Object:          Deployment/my-app
Namespace:       my-namespace
Status:          Managed by Flux
---
Kustomization:   apps
Namespace:       flux-system
Path:            ./clusters/production/apps
Ready:           True
Status:          Applied revision: main@sha1:abc1234
---
GitRepository:   flux-system
Namespace:       flux-system
URL:             https://github.com/myorg/fleet-infra
Ready:           True
Status:          Fetched revision: main@sha1:abc1234
```

This shows you that the Deployment `my-app` is managed by the Kustomization `apps`, which gets its manifests from the GitRepository `flux-system`.

## Trace Different Resource Types

You can trace any Kubernetes resource type:

```bash
flux trace service my-app -n my-namespace
```

Trace a ConfigMap:

```bash
flux trace configmap my-config -n my-namespace
```

Trace a Namespace:

```bash
flux trace namespace production
```

Trace a Custom Resource:

```bash
flux trace certificate my-cert -n my-namespace --api-version=cert-manager.io/v1 --kind=Certificate
```

## Trace Resources Managed by HelmRelease

For resources deployed via HelmRelease, the trace shows the Helm-specific chain:

```bash
flux trace deployment ingress-nginx-controller -n ingress-nginx
```

The output for a Helm-managed resource looks like:

```
Object:          Deployment/ingress-nginx-controller
Namespace:       ingress-nginx
Status:          Managed by Flux
---
HelmRelease:     ingress-nginx
Namespace:       ingress-nginx
Chart:           ingress-nginx
Version:         4.7.1
Ready:           True
Status:          Helm install succeeded
---
HelmRepository:  ingress-nginx
Namespace:       flux-system
URL:             https://kubernetes.github.io/ingress-nginx
Ready:           True
Status:          Fetched revision: sha256:def5678
```

## Identify Where Failures Originate

The real power of `flux trace` emerges when something is broken. When a resource is not updating, trace it to find the root cause:

```bash
flux trace deployment my-app -n production
```

If the source is failing:

```
Object:          Deployment/my-app
Namespace:       production
Status:          Managed by Flux
---
Kustomization:   production-apps
Namespace:       flux-system
Path:            ./clusters/production
Ready:           False
Status:          Source is not ready
---
GitRepository:   flux-system
Namespace:       flux-system
URL:             https://github.com/myorg/fleet-infra
Ready:           False
Status:          failed to checkout: authentication required
```

This immediately tells you the problem is at the source level -- the Git repository cannot be fetched due to an authentication issue.

## Debug Dependency Chain Issues

Kustomizations can depend on each other. When a downstream Kustomization is not reconciling, trace it to see if its dependency is the blocker:

```bash
flux trace deployment my-app -n production
```

If the trace shows a dependency issue, check the upstream Kustomization:

```bash
flux trace kustomization infrastructure -n flux-system
```

You can also use `flux get kustomizations` to see the dependency hierarchy:

```bash
flux get kustomizations -n flux-system
```

Check if a specific Kustomization's dependencies are ready:

```bash
kubectl get kustomization apps -n flux-system -o jsonpath='{.spec.dependsOn}' | jq .
```

## Use flux trace in Debugging Workflows

Combine `flux trace` with other Flux commands for a systematic debugging approach:

```bash
# 1. Start by tracing the problematic resource
flux trace deployment my-app -n production

# 2. Based on the trace output, check events for the failing component
flux events --for Kustomization/production-apps -n flux-system

# 3. Check logs for the relevant controller
flux logs --kind=Kustomization --name=production-apps --level=error --since=30m

# 4. After fixing the issue, force reconciliation
flux reconcile kustomization production-apps -n flux-system --with-source

# 5. Verify the fix by tracing again
flux trace deployment my-app -n production
```

## Trace Resources in Multi-Cluster Setups

In multi-cluster environments where you use Flux to manage remote clusters, tracing helps identify which cluster-level components are involved:

```bash
flux trace deployment my-app -n production --context=management-cluster
```

Trace a resource on a workload cluster:

```bash
flux trace deployment my-app -n production --context=workload-cluster-01
```

## Script Automated Trace Checks

Create a script that traces critical resources and reports any broken chains:

```bash
#!/bin/bash
RESOURCES=(
    "deployment/api-server/production"
    "deployment/web-frontend/production"
    "deployment/worker/production"
    "statefulset/database/production"
)

echo "Tracing critical Flux resources..."
echo "=================================="

FAILURES=0

for resource in "${RESOURCES[@]}"; do
    IFS='/' read -r kind name namespace <<< "$resource"

    echo ""
    echo "--- Tracing $kind/$name in $namespace ---"

    OUTPUT=$(flux trace "$kind" "$name" -n "$namespace" 2>&1)
    echo "$OUTPUT"

    if echo "$OUTPUT" | grep -q "Ready:.*False"; then
        echo "STATUS: FAILING"
        FAILURES=$((FAILURES + 1))
    else
        echo "STATUS: OK"
    fi
done

echo ""
echo "=================================="
echo "Total failures: $FAILURES"

exit $FAILURES
```

## When flux trace Cannot Find the Resource

If `flux trace` reports that a resource is not managed by Flux, there are a few possible reasons:

1. The resource was created manually, not through Flux.
2. The Kustomization or HelmRelease that manages it uses a different name in Git.
3. The resource was created by a Helm hook, which is not tracked the same way.
4. Server-side apply labels were modified.

Check the resource labels to verify Flux management:

```bash
kubectl get deployment my-app -n production -o jsonpath='{.metadata.labels}' | jq .
```

Look for these labels: `kustomize.toolkit.fluxcd.io/name` and `kustomize.toolkit.fluxcd.io/namespace` for Kustomization-managed resources, or `helm.toolkit.fluxcd.io/name` and `helm.toolkit.fluxcd.io/namespace` for Helm-managed resources.

## Summary

The `flux trace` command provides end-to-end visibility into the delivery chain of any Kubernetes resource managed by Flux CD. It shows you the source, the Kustomization or HelmRelease, and the live object status in a single output, making it easy to pinpoint where failures originate. Combine it with `flux events` and `flux logs` for a complete debugging workflow when diagnosing issues in your GitOps pipeline.
