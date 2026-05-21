# How to Handle Istio Finalizers in Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Finalizer, Resource Management, Troubleshooting

Description: How to understand, manage, and troubleshoot Kubernetes finalizers on Istio resources that can block resource deletion and namespace cleanup.

---

Finalizers in Kubernetes are a mechanism that prevents resources from being deleted until certain cleanup tasks are completed. Istio uses finalizers on some of its resources, and when things go wrong, they can block deletion of resources or even entire namespaces. Understanding how they work and how to deal with stuck finalizers is essential for operating an Istio mesh.

## What Are Finalizers?

A finalizer is a string in the `metadata.finalizers` array of a Kubernetes resource. When you delete a resource that has finalizers, Kubernetes marks it for deletion (sets `deletionTimestamp`) but doesn't actually remove it from etcd. The controller responsible for the finalizer is supposed to do its cleanup work and then remove the finalizer. Only when all finalizers are removed does Kubernetes actually delete the resource.

Check if a resource has finalizers:

```bash
kubectl get vs my-route -n default -o jsonpath='{.metadata.finalizers}'
```

Or in the full YAML output:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-route
  namespace: default
  finalizers:
  - istio.io/mesh-controller
```

## Where Istio Uses Finalizers

Istio doesn't heavily use finalizers on its networking CRDs (VirtualService, DestinationRule, etc.) in standard installations. However, finalizers can appear in several scenarios:

- **Istio ambient mode**: The waypoint proxy controller uses finalizers on Gateway resources.
- **Custom controllers**: If you run custom controllers or operators that manage Istio resources, they might add finalizers.
- **Namespace deletion**: When deleting a namespace with Istio resources, the namespace might get stuck in Terminating state due to finalizers on resources in that namespace.
- **Legacy Istio operator**: In older in-cluster operator installations, the IstioOperator resource has finalizers that the operator controller manages. The in-cluster Istio operator was deprecated in Istio 1.23 and removed from Istio core in Istio 1.24.

For legacy operator installations, check IstioOperator finalizers with:

```bash
kubectl get istiooperator -n istio-system -o jsonpath='{range .items[*]}{.metadata.name}: {.metadata.finalizers}{"\n"}{end}'
```

## Stuck Resource Deletion

The most visible symptom of a finalizer issue is a resource stuck with a deletion timestamp:

```bash
kubectl get vs -A -o jsonpath='{range .items[?(@.metadata.deletionTimestamp)]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}'
```

Or a namespace that won't delete:

```bash
kubectl get namespaces | grep Terminating
```

When you see this, the resource has been marked for deletion but a finalizer is preventing the actual removal.

Check what's blocking:

```bash
kubectl get vs my-route -n default -o jsonpath='{.metadata.deletionTimestamp} {.metadata.finalizers}'
```

If `deletionTimestamp` is set and `finalizers` is not empty, the resource is stuck.

## Resolving Stuck Finalizers on Istio Resources

The safe approach is to figure out which controller owns the finalizer and fix it. But if the controller is gone (e.g., you uninstalled Istio or the operator crashed), you might need to manually remove the finalizer.

Remove a finalizer using kubectl patch:

```bash
kubectl patch vs my-route -n default --type json -p '[{"op": "remove", "path": "/metadata/finalizers"}]'
```

Or set the finalizers array to empty:

```bash
kubectl patch vs my-route -n default -p '{"metadata":{"finalizers":[]}}' --type merge
```

For multiple stuck resources:

```bash
for vs in $(kubectl get vs -A -o jsonpath='{range .items[?(@.metadata.deletionTimestamp)]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}'); do
  ns=$(echo $vs | cut -d/ -f1)
  name=$(echo $vs | cut -d/ -f2)
  echo "Removing finalizers from $ns/$name"
  kubectl patch vs $name -n $ns --type json -p '[{"op": "remove", "path": "/metadata/finalizers"}]'
done
```

## Fixing Stuck Namespace Deletion

When a namespace with Istio resources gets stuck in Terminating, it's usually because:

1. Istio resources in the namespace have finalizers
2. The Istio control plane is gone or can't process the cleanup
3. API discovery or a controller needed for cleanup is unhealthy

First, check what's stuck:

```bash
kubectl get all -n stuck-namespace
kubectl get vs,dr,gw,se,pa,ap,sidecar,envoyfilter,telemetry -n stuck-namespace
```

Then check for finalizers on each resource type:

```bash
for resource in vs dr gw se sidecar pa ap ra envoyfilter telemetry; do
  kubectl get $resource -n stuck-namespace -o jsonpath='{range .items[*]}{.kind}/{.metadata.name}: {.metadata.finalizers}{"\n"}{end}' 2>/dev/null
done
```

Remove finalizers from all stuck resources:

```bash
for resource in vs dr gw se sidecar pa ap ra envoyfilter telemetry; do
  for item in $(kubectl get $resource -n stuck-namespace -o jsonpath='{range .items[?(@.metadata.deletionTimestamp)]}{.metadata.name}{"\n"}{end}' 2>/dev/null); do
    kubectl patch $resource $item -n stuck-namespace --type json -p '[{"op": "remove", "path": "/metadata/finalizers"}]' 2>/dev/null
  done
done
```

If the namespace is still stuck after clearing Istio resource finalizers, the issue might be with the namespace finalizer itself:

```bash
kubectl get namespace stuck-namespace -o json | python3 -c "
import json, sys
ns = json.load(sys.stdin)
ns['spec']['finalizers'] = []
json.dump(ns, sys.stdout)
" | kubectl replace --raw /api/v1/namespaces/stuck-namespace/finalize -f -
```

## Legacy IstioOperator Finalizer Issues

In legacy in-cluster operator installations, the IstioOperator resource has a finalizer managed by the Istio operator controller:

```yaml
metadata:
  finalizers:
  - istio-finalizer.install.istio.io
```

If you uninstall the Istio operator controller before removing the IstioOperator resource, the resource can get stuck. To fix:

```bash
kubectl patch istiooperator installed-state -n istio-system --type json -p '[{"op": "remove", "path": "/metadata/finalizers"}]'
```

For current `istioctl` installations, the proper uninstall order is:

```bash
# First, uninstall Istio
istioctl uninstall --purge

# Then remove the namespace
kubectl delete namespace istio-system
```

An `IstioOperator` YAML passed to `istioctl install -f` is installation input; it is not normally stored as an IstioOperator resource in the cluster.

## Preventing Finalizer Issues

A few practices help avoid stuck finalizer problems:

**Uninstall in the right order**: Always remove Istio workloads before removing the control plane. The control plane needs to process the cleanup of its managed resources.

```bash
# 1. Remove application workloads from the mesh
kubectl delete namespace my-app-namespace

# 2. Wait for namespaces to fully terminate
kubectl get namespaces --watch

# 3. Uninstall Istio
istioctl uninstall --purge

# 4. Delete the istio-system namespace
kubectl delete namespace istio-system
```

**Keep webhooks healthy**: Istio's validation webhook is configured for create and update operations on Istio resources, so a stale webhook can block cleanup changes even though it does not normally validate delete requests. If you're uninstalling Istio and kubectl operations fail with webhook errors, removing stale webhooks can help:

```bash
kubectl delete validatingwebhookconfiguration istio-validator-istio-system
kubectl delete mutatingwebhookconfiguration istio-sidecar-injector
```

**Monitor for stuck resources**: Add a monitoring check that alerts on resources in Terminating state for more than a few minutes:

```bash
# Check for stuck Istio resources
stuck=$(kubectl get vs,dr,gw,se,sidecar,pa,ap,ra,envoyfilter,telemetry -A -o jsonpath='{range .items[?(@.metadata.deletionTimestamp)]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}')
if [ -n "$stuck" ]; then
  echo "WARNING: Stuck Istio resources found:"
  echo "$stuck"
fi
```

## Understanding the Cleanup Flow

When things work correctly, the deletion flow for an Istio resource is:

1. You run `kubectl delete vs my-route`.
2. Kubernetes sets `deletionTimestamp` on the resource.
3. If there are finalizers, the responsible controller processes them.
4. The controller removes its finalizer.
5. With no finalizers remaining, Kubernetes deletes the resource from etcd.

When things break, step 3 or 4 fails, and the resource stays in Terminating state indefinitely. Knowing this flow helps you diagnose where the problem is.

Finalizers are a safety mechanism, and removing them manually means skipping the cleanup they were supposed to trigger. With Istio configuration resources this may be low-risk after the owning controller is gone, but always understand what the finalizer was protecting before you remove it.
