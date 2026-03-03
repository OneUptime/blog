# How to Configure Istio Namespace Labels for Sidecar Injection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Namespace, Sidecar Injection, Kubernetes, Service Mesh

Description: Everything you need to know about Istio namespace labels for controlling sidecar injection including revision labels, exclusions, and migration strategies.

---

Sidecar injection in Istio is controlled primarily through namespace labels. Getting these labels right is essential because they determine which pods join the mesh and which Istio version they use. It sounds simple, but there are several label types, they interact in non-obvious ways, and getting them wrong can leave pods without sidecars or break deployments entirely.

## The Basic Label

The most common label enables automatic injection for an entire namespace:

```bash
kubectl label namespace my-app istio-injection=enabled
```

This tells the Istio sidecar injector webhook to add an Envoy sidecar to every pod created in the `my-app` namespace.

To disable injection:

```bash
kubectl label namespace my-app istio-injection=disabled
```

To remove the label entirely:

```bash
kubectl label namespace my-app istio-injection-
```

There is a difference between `disabled` and removing the label. With `disabled`, the webhook explicitly decides not to inject. Without any label, the behavior depends on your webhook configuration (it might default to inject or not).

## Revision Labels

When running multiple Istio versions (for canary upgrades), use the revision label instead:

```bash
kubectl label namespace my-app istio.io/rev=1-24
```

This ties the namespace to a specific Istio revision. The revision name matches what you set during installation:

```bash
istioctl install --set revision=1-24 -y
```

Important: `istio-injection` and `istio.io/rev` are mutually exclusive. If both are present, `istio-injection` takes precedence and `istio.io/rev` is ignored. Always remove one before setting the other:

```bash
# Switch from basic label to revision label
kubectl label namespace my-app istio-injection-
kubectl label namespace my-app istio.io/rev=1-24
```

## Revision Tags

Revision tags add a level of indirection. Instead of labeling namespaces with a specific revision, you label them with a tag that maps to a revision:

```bash
# Create a tag called "stable" pointing to revision "1-23"
istioctl tag set stable --revision 1-23

# Label namespace with the tag
kubectl label namespace my-app istio.io/rev=stable
```

When you want to upgrade:

```bash
# Point the "stable" tag to a new revision
istioctl tag set stable --revision 1-24 --overwrite

# Restart pods to pick up new sidecar
kubectl rollout restart deployment -n my-app
```

The namespace label does not change - only the tag mapping changes. This is cleaner for large-scale upgrades.

List all tags:

```bash
istioctl tag list
```

## Namespace Exclusions

Some namespaces should never have injection. Istio's default configuration excludes `kube-system` and `kube-public`. You can add more exclusions in the webhook configuration.

Check current exclusions:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o yaml | grep -A 20 namespaceSelector
```

The webhook uses a `namespaceSelector` that typically looks like:

```yaml
namespaceSelector:
  matchExpressions:
    - key: istio-injection
      operator: In
      values:
        - enabled
```

For system namespaces, you can explicitly opt out:

```bash
kubectl label namespace kube-system istio-injection=disabled
kubectl label namespace kube-node-lease istio-injection=disabled
kubectl label namespace cert-manager istio-injection=disabled
```

## Per-Pod Overrides

Even within a labeled namespace, individual pods can opt in or out:

```yaml
# Opt out of injection in an injected namespace
apiVersion: v1
kind: Pod
metadata:
  name: skip-sidecar
  namespace: my-app
  labels:
    sidecar.istio.io/inject: "false"
spec:
  containers:
    - name: app
      image: busybox
```

Or the annotation form:

```yaml
metadata:
  annotations:
    sidecar.istio.io/inject: "false"
```

Both the label and annotation work. The label is checked first.

To force injection in a namespace that does not have injection enabled:

```yaml
metadata:
  labels:
    sidecar.istio.io/inject: "true"
```

Note that this only works if the webhook's `objectSelector` is configured to look for this label, which is the default in recent Istio versions.

## Checking Label Status

See all namespace labels at once:

```bash
kubectl get namespaces -L istio-injection -L istio.io/rev
```

This shows:

```text
NAME              STATUS   AGE    ISTIO-INJECTION   REV
default           Active   30d
kube-system       Active   30d    disabled
my-app            Active   10d    enabled
staging           Active   5d                        1-24
production        Active   5d                        stable
```

## Common Label Patterns

### Pattern 1: Simple Injection

Best for single-version Istio installations:

```bash
kubectl label namespace app-1 istio-injection=enabled
kubectl label namespace app-2 istio-injection=enabled
kubectl label namespace monitoring istio-injection=disabled
```

### Pattern 2: Revision-Based with Tags

Best for production with controlled upgrades:

```bash
# Create tags
istioctl tag set prod --revision 1-23
istioctl tag set staging --revision 1-24

# Label namespaces with tags
kubectl label namespace production istio.io/rev=prod
kubectl label namespace staging istio.io/rev=staging
```

### Pattern 3: Selective Injection

Only inject specific pods, not the whole namespace:

```bash
# Do not label the namespace at all

# Label individual pods
metadata:
  labels:
    sidecar.istio.io/inject: "true"
```

This requires the webhook to be configured with an `objectSelector`:

```yaml
webhooks:
  - name: namespace.sidecar-injector.istio.io
    objectSelector:
      matchExpressions:
        - key: sidecar.istio.io/inject
          operator: NotIn
          values:
            - "false"
```

## Migration Strategies

### Migrating a Namespace to the Mesh

1. Start with injection disabled:

```bash
kubectl label namespace legacy-app istio-injection=disabled
```

2. Test with a single deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-deployment
  namespace: legacy-app
spec:
  template:
    metadata:
      labels:
        sidecar.istio.io/inject: "true"
```

3. Once validated, enable for the whole namespace:

```bash
kubectl label namespace legacy-app istio-injection=enabled --overwrite
kubectl rollout restart deployment -n legacy-app
```

### Removing a Namespace from the Mesh

```bash
# Remove the label
kubectl label namespace leaving-mesh istio-injection-

# Restart pods to remove sidecars
kubectl rollout restart deployment -n leaving-mesh

# Verify no sidecars remain
kubectl get pods -n leaving-mesh -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].name}{"\n"}{end}' | grep istio-proxy
```

## Troubleshooting Label Issues

**Pods not getting sidecars**: Check namespace labels and webhook configuration:

```bash
kubectl get namespace my-app --show-labels
kubectl get mutatingwebhookconfiguration -l app=sidecar-injector -o yaml | grep -A 10 namespaceSelector
```

**Both labels set**: Remove one:

```bash
kubectl get namespace -l 'istio-injection,istio.io/rev'
# If any show up, remove the old one
kubectl label namespace my-app istio-injection-
```

**Webhook not matching**: Use `istioctl analyze` to detect issues:

```bash
istioctl analyze -n my-app
```

**Checking effective injection config**:

```bash
istioctl experimental check-inject -n my-app deploy/my-deployment
```

This tells you exactly what the injector would do for a specific workload.

## Automation with GitOps

If you use GitOps (ArgoCD, Flux), define namespace labels in your manifests:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-app
  labels:
    istio.io/rev: stable
    team: backend
    environment: production
```

This way, the injection configuration is version-controlled and reproducible.

## Wrapping Up

Namespace labels are the primary mechanism for controlling what goes into the Istio mesh. Use `istio-injection=enabled` for simple setups, `istio.io/rev` for revision-based management, and revision tags for clean upgrade workflows. Always check for conflicting labels, and use per-pod overrides when you need exceptions. The `istioctl experimental check-inject` command is invaluable for debugging injection issues when things are not behaving as expected.
