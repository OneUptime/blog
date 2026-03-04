# How to Configure Webhook Namespace Selectors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Webhooks, Namespace Selectors, Service Mesh

Description: Learn how to configure namespace selectors on the Istio sidecar injection webhook to control which namespaces get automatic sidecar injection.

---

Namespace selectors are how you tell Kubernetes which namespaces the Istio sidecar injection webhook should apply to. Without proper namespace selectors, you might end up injecting sidecars into system namespaces where they do not belong, or missing namespaces that need injection.

Getting this right matters because a misconfigured namespace selector can break your kube-system pods, interfere with monitoring tools, or leave application pods without sidecars.

## How Namespace Selectors Work

The Istio sidecar injector is a MutatingAdmissionWebhook. Kubernetes checks the namespace selector on the webhook before forwarding pod creation requests. If a namespace does not match the selector, the webhook never even sees pods in that namespace.

Check your current selector:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o jsonpath='{.webhooks[0].namespaceSelector}' | jq .
```

The default output looks something like:

```json
{
  "matchExpressions": [
    {
      "key": "istio-injection",
      "operator": "In",
      "values": ["enabled"]
    }
  ]
}
```

This means only namespaces with the label `istio-injection=enabled` will have the webhook applied.

## The Opt-In Model (Default)

The default Istio setup uses an opt-in model. You explicitly label namespaces that should get sidecar injection:

```bash
kubectl label namespace my-app istio-injection=enabled
```

This is the safest approach because new namespaces are not affected until you deliberately label them. To check which namespaces are opted in:

```bash
kubectl get namespaces -l istio-injection=enabled
```

## The Opt-Out Model

Some teams prefer an opt-out model where injection is on by default and you explicitly exclude namespaces. This requires changing the namespace selector on the webhook.

First, label the namespaces you want to exclude:

```bash
kubectl label namespace kube-system istio-injection=disabled
kubectl label namespace istio-system istio-injection=disabled
kubectl label namespace kube-node-lease istio-injection=disabled
```

Then update the webhook selector to match all namespaces except those labeled disabled:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o json | \
  jq '.webhooks[].namespaceSelector = {"matchExpressions": [{"key": "istio-injection", "operator": "NotIn", "values": ["disabled"]}]}' | \
  kubectl apply -f -
```

With the IstioOperator, you can configure this during installation:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    sidecarInjectorWebhook:
      enableNamespacesByDefault: true
```

When `enableNamespacesByDefault` is true, Istio configures the webhook to inject into all namespaces unless they are explicitly excluded.

## Revision-Based Selectors

If you use Istio's revision system for canary upgrades, the namespace selector uses a different label:

```bash
kubectl label namespace my-app istio.io/rev=1-20
```

The webhook configuration for revision-based installs looks like:

```yaml
namespaceSelector:
  matchExpressions:
  - key: istio.io/rev
    operator: In
    values:
    - 1-20
```

Important: `istio-injection=enabled` and `istio.io/rev` are mutually exclusive. If both labels exist on a namespace, `istio-injection` takes precedence. So if you are migrating from default injection to revision-based injection, make sure to remove the old label:

```bash
kubectl label namespace my-app istio-injection-
kubectl label namespace my-app istio.io/rev=1-20
```

## Using Object Selectors

In addition to namespace selectors, Kubernetes webhooks support object selectors that match on the pod itself. Istio uses this to support pod-level control:

```yaml
webhooks:
- name: rev.namespace.sidecar-injector.istio.io
  namespaceSelector:
    matchExpressions:
    - key: istio-injection
      operator: In
      values:
      - enabled
  objectSelector:
    matchExpressions:
    - key: sidecar.istio.io/inject
      operator: NotIn
      values:
      - "false"
```

The object selector works alongside the namespace selector. Both must match for the webhook to be invoked. In the example above, even in an injection-enabled namespace, pods with the label `sidecar.istio.io/inject=false` will be skipped.

## Excluding Specific Namespaces

There are namespaces you should almost always exclude from injection:

- `kube-system` - core Kubernetes components
- `kube-public` - public cluster resources
- `kube-node-lease` - node heartbeats
- `istio-system` - Istio control plane itself

You can add additional exclusions using matchExpressions:

```yaml
namespaceSelector:
  matchExpressions:
  - key: istio-injection
    operator: In
    values:
    - enabled
  - key: kubernetes.io/metadata.name
    operator: NotIn
    values:
    - kube-system
    - kube-public
    - kube-node-lease
```

The `kubernetes.io/metadata.name` label is automatically set by Kubernetes 1.21+ to the namespace name, making it convenient for exclusion rules.

## Configuring via Helm

When installing Istio with Helm, you can customize the namespace selector:

```bash
helm install istiod istio/istiod \
  --namespace istio-system \
  --set sidecarInjectorWebhook.enableNamespacesByDefault=false
```

For more granular control, you can provide custom webhook YAML through Helm values. However, for most setups the label-based approach is sufficient.

## Testing Selector Changes

Before applying selector changes to production, verify which namespaces would be affected:

```bash
# For opt-in model
kubectl get namespaces -l istio-injection=enabled

# For opt-out model
kubectl get namespaces -l istio-injection!=disabled
```

You can also do a dry run by creating a test pod and checking if it gets injected:

```bash
kubectl run test-injection --image=nginx -n my-namespace --dry-run=server -o yaml | grep istio-proxy
```

The `--dry-run=server` flag sends the request through the admission webhook pipeline without actually creating the pod, so you can see if the sidecar would be added.

## Handling Multiple Istio Installations

In multi-mesh or multi-revision scenarios, you might have multiple webhook configurations. Each one has its own namespace selector, and they should not overlap:

```bash
kubectl get mutatingwebhookconfiguration | grep istio
```

If two webhook configurations match the same namespace, pods could be processed by both, leading to duplicate sidecars or conflicts. Use non-overlapping selectors:

```yaml
# Webhook for revision 1-19
namespaceSelector:
  matchExpressions:
  - key: istio.io/rev
    operator: In
    values:
    - 1-19

# Webhook for revision 1-20
namespaceSelector:
  matchExpressions:
  - key: istio.io/rev
    operator: In
    values:
    - 1-20
```

## Troubleshooting

If pods are not getting injected despite the namespace having the right label:

1. Verify the webhook configuration exists and has the expected selector
2. Check that the label key and value match exactly (labels are case-sensitive)
3. Look for conflicting labels that might cause the selector to not match
4. Run `istioctl analyze -n my-namespace` to detect configuration issues

If pods in unexpected namespaces are getting injected:

1. Check if the webhook uses an opt-out model
2. Verify the namespace does not have stale `istio-injection=enabled` labels
3. Look for revision labels that might trigger injection

Namespace selectors are the first line of control for sidecar injection scope. Getting them right keeps your mesh boundaries clean and prevents accidental injection into namespaces that should remain outside the mesh.
