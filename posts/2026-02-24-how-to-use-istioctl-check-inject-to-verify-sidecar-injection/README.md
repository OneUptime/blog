# How to Use istioctl check-inject to Verify Sidecar Injection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar Injection, istioctl, Kubernetes, Service Mesh

Description: A practical guide to using istioctl check-inject to troubleshoot and verify automatic sidecar injection for your Kubernetes workloads.

---

Sidecar injection is one of those Istio features that usually "just works" until it doesn't. You label a namespace, deploy a pod, and magically it gets an Envoy sidecar. But when a pod shows up without a sidecar and you're not sure why, `istioctl check-inject` helps you figure out what happened.

This command inspects the injection configuration and tells you exactly whether a given pod, deployment, or namespace will get sidecar injection and why.

## How Sidecar Injection Works

Before getting into the command, a quick refresher on how injection works. Istio uses a Kubernetes mutating admission webhook. When you create a pod, the Kubernetes API server calls the Istio webhook, which decides whether to inject the sidecar container.

The webhook checks several things in order:

1. Is the pod in a namespace with the `istio-injection=enabled` label (or `istio.io/rev=<revision>` for canary)?
2. Does the pod have the annotation `sidecar.istio.io/inject` set to `true` or `false`?
3. Does the pod match any `IstioOperator` configuration for injection?

Pod-level annotations override namespace-level labels. So you can enable injection for a namespace but opt out specific pods, or vice versa.

## Using check-inject

### Check a Namespace

```bash
istioctl check-inject -n default
```

Output:

```
NAMESPACE   INJECTED   REASON
default     true       Namespace label istio-injection=enabled
```

If injection isn't enabled:

```
NAMESPACE   INJECTED   REASON
kube-system false      Namespace label istio-injection not found
```

### Check a Specific Pod

```bash
istioctl check-inject pod/httpbin-74fb669cc6-abc12 -n default
```

Output:

```
POD                              NAMESPACE   INJECTED   REASON
httpbin-74fb669cc6-abc12         default     true       Namespace label istio-injection=enabled, no pod override
```

Or if the pod has opted out:

```
POD                              NAMESPACE   INJECTED   REASON
httpbin-74fb669cc6-abc12         default     false      Pod annotation sidecar.istio.io/inject=false
```

### Check a Deployment

You can also check at the deployment level to see what will happen when new pods are created:

```bash
istioctl check-inject deployment/httpbin -n default
```

This is more useful than checking a running pod because it tells you what future pods will look like.

## Common Scenarios and Fixes

### Namespace Label Missing

The most common reason pods don't get sidecars:

```bash
istioctl check-inject -n my-namespace
```

```
NAMESPACE      INJECTED   REASON
my-namespace   false      Namespace label istio-injection not found
```

Fix:

```bash
kubectl label namespace my-namespace istio-injection=enabled
```

After labeling, existing pods won't automatically get sidecars. You need to restart them:

```bash
kubectl rollout restart deployment -n my-namespace
```

### Pod Annotation Override

Sometimes a pod has an annotation that disables injection even though the namespace has it enabled:

```bash
istioctl check-inject pod/special-pod-abc12 -n default
```

```
POD                    NAMESPACE   INJECTED   REASON
special-pod-abc12      default     false      Pod annotation sidecar.istio.io/inject=false
```

Check the pod's annotations:

```bash
kubectl get pod special-pod-abc12 -n default -o jsonpath='{.metadata.annotations}'
```

If the annotation was set intentionally (maybe by a Helm chart), you can override it in your values:

```yaml
# Helm values example
podAnnotations:
  sidecar.istio.io/inject: "true"
```

### Revision Mismatch

If you're using revision-based canary upgrades, the namespace label changes from `istio-injection=enabled` to `istio.io/rev=<revision>`:

```bash
istioctl check-inject -n production
```

```
NAMESPACE    INJECTED   REASON
production   false      Neither istio-injection nor istio.io/rev label found
```

This happens when you switched to revision-based injection but used the old label. Fix it:

```bash
kubectl label namespace production istio-injection-
kubectl label namespace production istio.io/rev=stable
```

The first command removes the old label (note the trailing `-`), and the second sets the revision label.

### Webhook Not Configured

If the Istio mutating webhook isn't registered, no injection happens anywhere:

```bash
kubectl get mutatingwebhookconfiguration
```

You should see something like `istio-sidecar-injector` or `istio-revision-tag-default`. If it's missing, Istio wasn't properly installed or the webhook was deleted.

Check with:

```bash
istioctl check-inject -n default
```

If the output mentions the webhook isn't found, reinstall or repair the Istio installation:

```bash
istioctl install --set profile=default
```

### Host Network Pods

Pods running with `hostNetwork: true` can't use sidecar injection because Envoy can't intercept traffic properly. check-inject flags this:

```
POD              NAMESPACE   INJECTED   REASON
network-pod      default     false      Pod uses host networking
```

There's no fix for this - it's a fundamental limitation. These pods need to communicate with mesh services through other means (like connecting directly to the service's ClusterIP).

## Verifying Injection After the Fact

Sometimes you want to confirm that a running pod actually has the sidecar, not just that injection is configured. The quickest check:

```bash
kubectl get pod httpbin-abc12 -n default -o jsonpath='{.spec.containers[*].name}'
```

You should see `istio-proxy` in the list. If it's missing, the sidecar wasn't injected.

You can also check:

```bash
kubectl get pods -n default -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].name}{"\n"}{end}'
```

This lists all pods with their container names, making it easy to spot which ones have `istio-proxy` and which don't.

## Injection Configuration Details

To see the actual injection template and configuration:

```bash
kubectl get configmap istio-sidecar-injector -n istio-system -o yaml
```

This contains the injection template, which defines what containers and volumes get added to pods. If you've customized injection (maybe to add extra environment variables or change resource limits), the customizations live here.

For per-pod customization of the sidecar, use annotations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    sidecar.istio.io/inject: "true"
    sidecar.istio.io/proxyCPU: "100m"
    sidecar.istio.io/proxyMemory: "128Mi"
    sidecar.istio.io/proxyMemoryLimit: "256Mi"
    proxy.istio.io/config: |
      concurrency: 2
spec:
  containers:
  - name: app
    image: my-app:latest
```

These annotations are respected during injection and let you tune sidecar resources on a per-pod basis.

## Troubleshooting Injection Failures

If check-inject says injection should work but pods still don't get sidecars, check these:

1. **API server connectivity.** The API server needs to reach the Istio webhook. Check if the webhook service exists and has endpoints:

```bash
kubectl get svc istiod -n istio-system
kubectl get endpoints istiod -n istio-system
```

2. **Webhook certificate issues.** The webhook uses TLS. If the certificate expired or doesn't match, the API server silently skips the webhook (depending on failure policy):

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o yaml | grep failurePolicy
```

If `failurePolicy` is `Ignore`, webhook failures are silent. If it's `Fail`, pod creation fails entirely.

3. **Namespace exclusions.** Some namespaces are excluded from injection by default, including `kube-system`, `kube-public`, and `istio-system`. Check the webhook configuration for `namespaceSelector` rules.

## Summary

The `istioctl check-inject` command takes the guesswork out of sidecar injection. Instead of manually checking labels, annotations, and webhooks, you get a clear answer about whether injection will work and why. Make it part of your deployment verification process, especially when onboarding new namespaces or troubleshooting missing sidecars.
