# How to Configure Webhook Failure Policy in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Webhook, Service Mesh, Configuration

Description: Learn how to configure the webhook failure policy in Istio to control what happens when the sidecar injection webhook is unreachable or returns errors.

---

If you run Istio in production, you have probably hit a situation where pod creation gets blocked because the sidecar injection webhook is unavailable. Maybe istiod went down during an upgrade, or there was a network blip. Either way, your deployments stall and you start getting frantic Slack messages.

The webhook failure policy controls exactly what Kubernetes does when it cannot reach the Istio mutating webhook. Getting this setting right is critical for balancing reliability with security.

## What Is the Webhook Failure Policy?

Kubernetes mutating admission webhooks have a `failurePolicy` field that accepts two values:

- **Fail**: If the webhook is unreachable or returns an error, the API request is rejected. Pods will not be created.
- **Ignore**: If the webhook is unreachable or returns an error, the API request proceeds without mutation. Pods will be created without the sidecar.

By default, Istio sets the failure policy to `Fail` for the sidecar injection webhook. This is the safe choice because it prevents pods from accidentally running without the Envoy sidecar, which could bypass your security policies.

## Viewing the Current Failure Policy

You can check the current setting by inspecting the mutating webhook configuration:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o yaml
```

Look for the `failurePolicy` field in the output:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: istio-sidecar-injector
webhooks:
- name: rev.namespace.sidecar-injector.istio.io
  failurePolicy: Fail
  clientConfig:
    service:
      name: istiod
      namespace: istio-system
      path: /inject
  rules:
  - apiGroups: [""]
    apiVersions: ["v1"]
    operations: ["CREATE"]
    resources: ["pods"]
```

## Changing the Failure Policy

There are several ways to change this setting depending on how you manage your Istio installation.

### Using IstioOperator

Istio does not expose a `sidecarInjectorWebhook.failurePolicy` value in the current istiod chart. If you install Istio with the IstioOperator, use an overlay to patch the rendered mutating webhook configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        overlays:
        - apiVersion: admissionregistration.k8s.io/v1
          kind: MutatingWebhookConfiguration
          name: istio-sidecar-injector
          patches:
          - path: webhooks.[name:namespace.sidecar-injector.istio.io].failurePolicy
            value: Ignore
          - path: webhooks.[name:object.sidecar-injector.istio.io].failurePolicy
            value: Ignore
          - path: webhooks.[name:rev.namespace.sidecar-injector.istio.io].failurePolicy
            value: Ignore
          - path: webhooks.[name:rev.object.sidecar-injector.istio.io].failurePolicy
            value: Ignore
```

Apply this with:

```bash
istioctl install -f my-config.yaml
```

### Using Helm

If you use Helm to install Istio, there is no dedicated Helm value for this setting. Render the chart and post-process the `MutatingWebhookConfiguration`, or patch it after Helm installation:

```bash
helm install istiod istio/istiod \
  --namespace istio-system \
  --wait
```

### Direct kubectl Patch

For a quick change without reinstalling, you can patch the webhook directly:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o json \
  | jq '.webhooks |= map(.failurePolicy = "Ignore")' \
  | kubectl apply -f -
```

Be aware that this change will be overwritten the next time you upgrade or reconcile Istio. So this approach is mostly useful for emergency situations.

## When to Use Fail vs. Ignore

The right choice depends on your priorities.

### Use Fail (the default) when:

- You have strict security requirements and cannot allow pods to run without the sidecar
- Your mTLS policies are set to STRICT mode, meaning unsidecared pods may lose connectivity to workloads that enforce STRICT mTLS
- You have good istiod availability (multiple replicas, pod disruption budgets)

### Use Ignore when:

- Application availability is more important than mesh enforcement
- You run workloads that should keep deploying even if the mesh control plane is down
- You have monitoring in place to detect pods that were created without sidecars
- You are in a development or staging environment

## Detecting Pods Created Without Sidecars

If you switch to `Ignore`, you need a way to know when pods slip through without injection. Here is a quick command to find pods that are missing the sidecar in a given namespace:

```bash
kubectl get pods -n my-namespace -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].name}{"\n"}{end}' | grep -v istio-proxy
```

You can also set up monitoring based on pod metadata, such as the presence of the `istio-proxy` container or the `sidecar.istio.io/status` annotation. Pods missing those signals are candidates for investigation.

## Combining Failure Policy with Namespace Selectors

A common pattern is to keep the failure policy as `Fail` but narrow down which namespaces the webhook applies to. That way, namespaces that do not match the injector selectors are not affected by webhook failures.

The webhook configuration already has namespace selectors:

```yaml
webhooks:
- name: rev.namespace.sidecar-injector.istio.io
  failurePolicy: Fail
  namespaceSelector:
    matchExpressions:
    - key: istio-injection
      operator: In
      values:
      - enabled
```

With this selector, namespaces labeled with `istio-injection=enabled` are affected by that webhook entry. Istio may also create other webhook entries for revision labels or pod-level injection labels, so check the full `namespaceSelector` and `objectSelector` set in your cluster.

## Using reinvocationPolicy

Kubernetes also supports a `reinvocationPolicy` field on webhooks. This controls whether the webhook gets called again if a later webhook modifies the pod. Istio sets this to `Never` by default, which is fine for most setups. If you have other mutating webhooks that add containers or volumes that Istio needs to be aware of, you might consider setting it to `IfNeeded`:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o json \
  | jq '.webhooks |= map(.reinvocationPolicy = "IfNeeded")' \
  | kubectl apply -f -
```

## Handling Upgrades

During Istio upgrades, there is a window where the old istiod is shutting down and the new one is starting. If your failure policy is `Fail`, any pod creation during this window will be rejected.

To handle this gracefully:

1. Make sure you run multiple istiod replicas so at least one is always available during rolling updates.
2. Set a `PodDisruptionBudget` for istiod:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istiod
  namespace: istio-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: istiod
```

3. Consider temporarily switching to `Ignore` during upgrades if you cannot guarantee istiod availability.

## Timeout Configuration

The `timeoutSeconds` field on the webhook controls how long Kubernetes waits for a response before applying the failure policy. The default is 10 seconds. You can reduce this to make failures faster:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o json \
  | jq '.webhooks |= map(.timeoutSeconds = 5)' \
  | kubectl apply -f -
```

A shorter timeout means pod creation latency is lower when istiod is having issues, but it also increases the chance of false failures if istiod is just slow.

## Summary

The webhook failure policy is a straightforward setting with big implications. Stick with `Fail` if you need strict sidecar enforcement, and switch to `Ignore` if application availability takes priority. Either way, make sure you have monitoring to catch pods that end up without sidecars, and invest in istiod high availability to minimize the situations where the failure policy even matters.
