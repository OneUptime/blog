# How to Configure Sidecar Injection at Namespace Level

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar Injection, Namespace, Kubernetes, Service Mesh

Description: Complete guide to configuring Istio sidecar injection at the namespace level, including labels, revisions, and troubleshooting common injection issues.

---

Namespace-level sidecar injection is the most common way to get pods into the Istio mesh. You label a namespace, and every pod created in that namespace automatically gets an Envoy sidecar injected. It is simple, but there are several nuances that trip people up.

This guide covers all the ways to configure injection at the namespace level, including revision-based injection for canary upgrades and common pitfalls.

## Basic Namespace Injection

The simplest approach is to add the `istio-injection` label to a namespace:

```bash
kubectl label namespace production istio-injection=enabled
```

After this, every new pod created in the `production` namespace will get a sidecar. Existing pods are not affected. You need to restart them to get sidecars injected:

```bash
kubectl rollout restart deployment -n production
```

Verify that injection is working:

```bash
kubectl get pods -n production -o jsonpath='{range .items[*]}{.metadata.name}: {range .spec.containers[*]}{.name} {end}{"\n"}{end}'
```

You should see `istio-proxy` listed as a container in each pod.

## Disabling Injection for a Namespace

To remove injection from a namespace:

```bash
kubectl label namespace production istio-injection-
```

The trailing `-` removes the label. New pods will no longer get sidecars. Existing pods keep their sidecars until they are restarted.

To explicitly disable injection (not just remove the label):

```bash
kubectl label namespace production istio-injection=disabled
```

The difference matters when you have both namespace-level and pod-level injection annotations. With the label removed, the webhook may still process pods based on other criteria. With `disabled`, the namespace is explicitly opted out.

## Revision-Based Injection

When you run multiple versions of Istio (for canary upgrades), you use revision labels instead of the basic `istio-injection` label:

```bash
# Install Istio with a revision
istioctl install --set revision=1-20 -y

# Label namespace with the revision
kubectl label namespace production istio.io/rev=1-20
```

This tells the namespace to use the `1-20` revision of istiod. When you install a new version, you can switch namespaces one at a time:

```bash
# Install new revision
istioctl install --set revision=1-21 -y

# Switch a namespace to the new revision
kubectl label namespace staging istio.io/rev=1-21 --overwrite

# Restart pods to pick up the new sidecar
kubectl rollout restart deployment -n staging
```

Important: Do not mix `istio-injection=enabled` and `istio.io/rev` on the same namespace. Remove one before adding the other:

```bash
kubectl label namespace production istio-injection-
kubectl label namespace production istio.io/rev=1-20
```

## Using Revision Tags

Revision tags add a layer of indirection that makes upgrades smoother. Instead of labeling namespaces with a specific revision, you label them with a tag that points to a revision:

```bash
# Create a tag called "stable" that points to revision 1-20
istioctl tag set stable --revision 1-20

# Label namespaces with the tag
kubectl label namespace production istio.io/rev=stable
```

When you want to upgrade, update the tag instead of relabeling every namespace:

```bash
# Install new revision
istioctl install --set revision=1-21 -y

# Update the tag to point to the new revision
istioctl tag set stable --revision 1-21 --overwrite

# Restart pods to pick up the new sidecar
kubectl rollout restart deployment -n production
```

This way, you never need to change namespace labels during upgrades. You just update what the tag points to.

Verify which revision a tag points to:

```bash
istioctl tag list
```

## Checking Namespace Injection Status

See which namespaces have injection enabled:

```bash
kubectl get namespaces -L istio-injection,istio.io/rev
```

This shows all namespaces with their injection labels in a table format.

For more detail:

```bash
# Check if the mutating webhook matches a namespace
kubectl get mutatingwebhookconfiguration -o yaml | grep -A 10 namespaceSelector
```

The webhook's `namespaceSelector` determines which namespaces trigger injection. It usually matches on `istio-injection=enabled` or `istio.io/rev` labels.

## Namespace-Level Sidecar Configuration

You can set sidecar configuration defaults for an entire namespace. This affects all pods in the namespace without requiring per-pod annotations.

**Resource limits via MeshConfig:**

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

This sets defaults for all sidecars. Individual pods can override with annotations.

**Namespace-level proxy config via annotation:**

You can set proxy configuration defaults at the namespace level by using the Telemetry API or EnvoyFilter resources that target the namespace. But the primary way to configure all sidecars in a namespace is through the global MeshConfig plus per-pod annotation overrides.

## Scoping Sidecar Visibility per Namespace

Use the Sidecar resource to limit what services each namespace's sidecars can see:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: production
spec:
  egress:
  - hosts:
    - "./*"
    - "shared-services/*"
    - "istio-system/*"
```

This is a namespace-level configuration that applies to all pods in `production` that do not have their own Sidecar resource. It reduces memory usage and configuration push times.

## Handling Multiple Injection Webhooks

If you have multiple Istio revisions installed, you may have multiple mutating webhooks. Kubernetes processes them in order of their webhook configuration names.

List all injection webhooks:

```bash
kubectl get mutatingwebhookconfigurations | grep istio
```

Each revision creates its own webhook. The namespace label determines which webhook processes the injection. If a namespace has `istio.io/rev=1-20`, only the `1-20` webhook will inject into it.

## Troubleshooting Namespace Injection

**Problem: Pods are not getting sidecars**

Check the namespace label:

```bash
kubectl get namespace production --show-labels
```

Check if the webhook is configured and has the right namespace selector:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o json | \
  jq '.webhooks[0].namespaceSelector'
```

Check if istiod is running and the webhook service endpoint is healthy:

```bash
kubectl get pods -n istio-system -l app=istiod
kubectl get endpoints -n istio-system istiod
```

**Problem: Injection is happening but pods are crashing**

Check the init container logs:

```bash
kubectl logs your-pod -c istio-init
```

Check the sidecar logs:

```bash
kubectl logs your-pod -c istio-proxy
```

Common causes:
- The init container cannot set iptables rules (needs `NET_ADMIN` capability or CNI)
- The sidecar cannot reach istiod (network policy blocking it)
- Resource limits are too low and the sidecar is being OOM-killed

**Problem: Old sidecars after changing revisions**

After changing the revision label, you must restart pods:

```bash
kubectl rollout restart deployment -n production
```

Pods keep their current sidecar until restarted. The label change only affects newly created pods.

## Automated Namespace Onboarding

For large clusters with many namespaces, automate injection setup with a simple script:

```bash
#!/bin/bash
# Enable injection for all namespaces matching a pattern
for ns in $(kubectl get namespaces -o name | grep "team-"); do
  ns_name=$(echo $ns | cut -d/ -f2)
  echo "Enabling injection for ${ns_name}"
  kubectl label namespace "${ns_name}" istio-injection=enabled --overwrite
done
```

Or use a Kubernetes controller that watches for new namespaces and applies the label automatically based on annotations or naming conventions.

## Best Practices

1. **Use revision tags in production**: They make upgrades much smoother than direct revision labels
2. **Always restart pods after enabling injection**: Existing pods do not get sidecars until restarted
3. **Do not inject into system namespaces**: Keep `kube-system`, `kube-public`, and monitoring namespaces without injection unless you have a specific need
4. **Use `istio-injection=disabled` instead of removing the label** when you explicitly do not want injection: This is more intentional and prevents accidental injection
5. **Apply Sidecar resources to every injected namespace**: This reduces memory usage and is especially important in clusters with many services

## Summary

Namespace-level injection is straightforward once you understand the label mechanics and the webhook processing. Use basic `istio-injection=enabled` for simple setups, revision labels for multi-version deployments, and revision tags for production environments where upgrade safety matters. Always pair injection with Sidecar resources to control configuration scope, and remember that existing pods need a restart to pick up injection changes.
