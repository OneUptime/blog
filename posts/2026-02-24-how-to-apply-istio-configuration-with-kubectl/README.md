# How to Apply Istio Configuration with kubectl

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubectl, Kubernetes, Configuration, DevOps

Description: A practical guide to applying, updating, and managing Istio configuration resources using kubectl commands and best practices for production workflows.

---

Istio resources are standard Kubernetes custom resources, so you manage them with `kubectl` just like any other Kubernetes object. But there are some specific patterns and gotchas worth knowing when working with Istio configuration. This post walks through the common operations and best practices.

## Creating Istio Resources

The most basic operation is creating a resource from a YAML file:

```bash
kubectl apply -f virtual-service.yaml
```

The file might look like:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-route
  namespace: default
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

You can also apply multiple resources from a single file separated by `---`:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-route
  namespace: default
spec:
  hosts:
  - reviews
  http:
  - route:
    - destination:
        host: reviews
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews-dr
  namespace: default
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

## Applying from a Directory

If you organize your Istio configs in a directory:

```text
istio-config/
  gateway.yaml
  virtual-service.yaml
  destination-rule.yaml
  auth-policy.yaml
```

Apply them all at once:

```bash
kubectl apply -f istio-config/
```

Or recursively:

```bash
kubectl apply -f istio-config/ -R
```

## Apply vs Create

There's an important distinction between `kubectl apply` and `kubectl create`:

```bash
# apply - creates the resource if it doesn't exist, updates it if it does
kubectl apply -f virtual-service.yaml

# create - only creates, fails if the resource already exists
kubectl create -f virtual-service.yaml
```

For Istio configuration, `apply` is almost always what you want. It handles both initial creation and subsequent updates, and it tracks the applied configuration for three-way merges.

## Updating Resources

To update an existing resource, modify your YAML file and reapply:

```bash
# Edit the file
vim virtual-service.yaml

# Reapply
kubectl apply -f virtual-service.yaml
```

For quick changes, you can edit directly:

```bash
kubectl edit vs reviews-route -n default
```

This opens the resource in your editor. When you save and close, the changes are applied.

For scripted updates, use `kubectl patch`:

```bash
# Update traffic weights
kubectl patch vs reviews-route -n default --type merge -p '
spec:
  http:
  - route:
    - destination:
        host: reviews
        subset: v1
      weight: 50
    - destination:
        host: reviews
        subset: v2
      weight: 50
'
```

JSON patch for more precise changes:

```bash
kubectl patch vs reviews-route -n default --type json -p '[
  {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 90},
  {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 10}
]'
```

## Dry-Run and Validation

Before applying to production, validate your configuration:

```bash
# Client-side dry run (basic YAML validation)
kubectl apply -f virtual-service.yaml --dry-run=client

# Server-side dry run (full validation including webhooks)
kubectl apply -f virtual-service.yaml --dry-run=server
```

Server-side dry run is more thorough because it runs the Istio validation webhook. If your resource has invalid fields or references, you'll see the error without actually creating the resource.

Also use `istioctl analyze`:

```bash
# Analyze a file
istioctl analyze virtual-service.yaml

# Analyze against the current cluster state
istioctl analyze -n default
```

## Applying with Labels

Add labels when creating resources for better organization:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-route
  namespace: default
  labels:
    app: reviews
    team: backend
    environment: production
spec:
  hosts:
  - reviews
  http:
  - route:
    - destination:
        host: reviews
```

Then you can manage resources by label:

```bash
# List all resources for the backend team
kubectl get vs,dr,se -n default -l team=backend

# Delete all resources for a specific app
kubectl delete vs,dr -n default -l app=reviews
```

## Applying in the Right Order

Some Istio resources depend on others. While Kubernetes doesn't enforce ordering, applying them in the right sequence avoids temporary misconfigurations:

1. **Gateways** first (other resources reference them)
2. **ServiceEntries** (make external services known to the mesh)
3. **DestinationRules** (define subsets before they're referenced)
4. **VirtualServices** (reference gateways and destination subsets)
5. **PeerAuthentication** and **AuthorizationPolicy** (security rules)

```bash
kubectl apply -f gateway.yaml
kubectl apply -f service-entries.yaml
kubectl apply -f destination-rules.yaml
kubectl apply -f virtual-services.yaml
kubectl apply -f security-policies.yaml
```

## Deleting Resources

Remove a specific resource:

```bash
kubectl delete vs reviews-route -n default
```

Remove all resources from a file:

```bash
kubectl delete -f virtual-service.yaml
```

Remove all VirtualServices in a namespace:

```bash
kubectl delete vs --all -n default
```

Be cautious with broad deletes. Removing a VirtualService or DestinationRule can immediately affect live traffic.

## Using Kustomize with Istio

Kustomize works well with Istio configurations for environment-specific overlays:

```text
istio-config/
  base/
    kustomization.yaml
    virtual-service.yaml
    destination-rule.yaml
  overlays/
    staging/
      kustomization.yaml
      virtual-service-patch.yaml
    production/
      kustomization.yaml
      virtual-service-patch.yaml
```

Base `kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- virtual-service.yaml
- destination-rule.yaml
```

Staging overlay `kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../../base
patches:
- path: virtual-service-patch.yaml
```

Staging patch:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-route
spec:
  http:
  - route:
    - destination:
        host: reviews
        subset: v2
      weight: 100
```

Apply the overlay:

```bash
kubectl apply -k istio-config/overlays/staging/
```

## Watching Changes Propagate

After applying, verify the configuration took effect:

```bash
# Check the resource was created/updated
kubectl get vs reviews-route -n default -o yaml

# Check proxy received the update
istioctl proxy-status

# Check specific proxy config
istioctl proxy-config route <pod-name> --name 8080
```

If the proxy status shows "STALE" for a pod, it hasn't received the latest configuration yet. This usually resolves in a few seconds, but persistent staleness indicates connectivity issues between istiod and the proxy.

## Automating with Scripts

For repeatable deployments, wrap your kubectl commands in scripts:

```bash
#!/bin/bash
set -e

NAMESPACE="${1:-default}"

echo "Validating Istio configuration..."
istioctl analyze istio-config/ --use-kube=false

echo "Applying to namespace: $NAMESPACE"
kubectl apply -f istio-config/gateway.yaml -n $NAMESPACE
kubectl apply -f istio-config/destination-rules.yaml -n $NAMESPACE
kubectl apply -f istio-config/virtual-services.yaml -n $NAMESPACE
kubectl apply -f istio-config/auth-policies.yaml -n $NAMESPACE

echo "Verifying..."
kubectl get vs,dr,gw,pa -n $NAMESPACE

echo "Checking proxy sync..."
istioctl proxy-status | grep $NAMESPACE
```

Using `kubectl` effectively with Istio is about combining the standard Kubernetes workflow with Istio-specific validation tools. Validate before you apply, use server-side dry runs for safety, and always verify that proxies pick up the new configuration after changes.
