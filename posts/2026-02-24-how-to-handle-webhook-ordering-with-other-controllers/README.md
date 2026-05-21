# How to Handle Webhook Ordering with Other Controllers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Webhook, Admission Controller, Service Mesh

Description: Practical guidance on managing webhook ordering between Istio sidecar injection and other mutating admission webhooks in your Kubernetes cluster.

---

When you run Istio alongside other tools that use mutating admission webhooks, the way those webhooks interact matters. Kubernetes runs mutating webhooks sequentially, and a webhook sees the object as it exists at the point where that webhook is called. Kubernetes does not guarantee a stable invocation order for mutating webhooks, so designs that depend on one webhook always running before another can lead to broken pod specs, missing sidecars, or containers that conflict with each other.

This is a problem that shows up more often than you would expect, especially in clusters running tools like Vault Agent injector, Linkerd, OPA Gatekeeper, cert-manager, or custom operators.

## How Kubernetes Invokes Webhooks

Mutating webhooks are called before validating webhooks, and validating webhooks see the object after the mutation phase has completed. Do not rely on a specific order between different mutating webhooks. Kubernetes documentation recommends making mutating webhooks idempotent and using validation to check the final admitted object.

Check what webhooks are in your cluster:

```bash
kubectl get mutatingwebhookconfiguration --sort-by=.metadata.name
```

Example output:

```text
NAME                          WEBHOOKS   AGE
cert-manager-webhook          1          30d
istio-sidecar-injector        2          15d
vault-agent-injector-cfg      1          20d
```

This output is useful as an inventory, but it should not be treated as the execution order.

## Why Ordering Matters for Istio

The Istio sidecar injector adds the `istio-proxy` container, usually an `istio-init` init container unless Istio CNI is handling traffic redirection, and several volumes to the pod spec. If another webhook modifies the pod in ways that conflict with the sidecar, things break. Conversely, if another webhook adds containers after Istio has already seen the pod, Istio might not account for those extra containers properly.

Common ordering issues:

- **Vault Agent injector** adds an init container and sidecar. If Vault's init container starts after Istio traffic redirection has been configured but before Envoy is ready, it can hit connectivity issues during secret fetching.
- **OPA/Gatekeeper** validates pods after mutation. If it runs as a validating webhook (which it should), ordering with mutating webhooks does not matter. But if someone configures it as a mutating webhook, it could reject pods modified by Istio.
- **Custom operators** that modify pod resources, add tolerations, or inject containers can interact unpredictably with Istio injection.

## Avoiding Webhook Order Dependencies

Since Kubernetes does not guarantee a stable mutating webhook order, avoid trying to control ordering by renaming webhook configurations. Renaming Istio's webhook is also not practical because Istio manages it.

A more practical approach is to use the `reinvocationPolicy` field where appropriate. This tells Kubernetes that a webhook may be called again if another admission plugin modifies the pod after the webhook's first invocation:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: istio-sidecar-injector
webhooks:
- name: rev.namespace.sidecar-injector.istio.io
  reinvocationPolicy: IfNeeded
```

To set this on the Istio webhook:

```bash
kubectl patch mutatingwebhookconfiguration istio-sidecar-injector \
  --type='json' \
  -p='[{"op": "add", "path": "/webhooks/0/reinvocationPolicy", "value": "IfNeeded"}]'
```

Check the webhook list first and patch the correct index if your Istio installation has more than one webhook entry. Istio may also reconcile this object during upgrades or control-plane changes, so manage this setting through your installation tooling when possible.

With `IfNeeded`, if another admission plugin modifies the pod after Istio has seen it, Kubernetes may call the Istio webhook again so it can observe the updated pod spec. The number and order of reinvocations are not guaranteed, so the webhook must be idempotent.

## Working with Vault Agent Injector

This is one of the most common combinations. The Vault Agent injector adds a sidecar that fetches secrets. Here is how to make them work together.

The Vault injector webhook is typically named `vault-agent-injector-cfg`. Do not depend on that name to control when Vault adds its containers relative to Istio.

The main concern is that the Vault init container needs to communicate with the Vault server. If Istio's init container sets up iptables rules first, the Vault init container traffic gets redirected through the Envoy proxy, which might not be ready yet.

The fix is to exclude Vault traffic from Istio's iptables rules using annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "my-app"
        vault.hashicorp.com/agent-inject-secret-config: "secret/data/myapp"
        traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.0.0.50/32"  # Vault server IP
```

Alternatively, you can exclude the Vault port:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundPorts: "8200"
```

## Working with cert-manager

cert-manager's webhook (`cert-manager-webhook`) handles validation, defaulting, and conversion for cert-manager resources. It does not typically mutate pods, so there is usually no conflict with Istio sidecar injection.

However, if you use cert-manager to manage Istio's TLS certificates, make sure cert-manager itself is not in a namespace with injection enabled. The cert-manager pods should not have Istio sidecars, because cert-manager needs to start before Istio is fully operational:

```bash
kubectl label namespace cert-manager istio-injection=disabled --overwrite
```

## Working with OPA Gatekeeper

Gatekeeper primarily uses validating webhooks, which run after all mutating webhooks. This means Gatekeeper sees the final pod spec with the Istio sidecar already injected.

If your Gatekeeper constraints check things like container counts, resource limits, or security contexts, they need to account for the injected sidecar. For example, the Gatekeeper library's `K8sRequiredResources` template supports `exemptImages`, not container-name exemptions:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredResources
metadata:
  name: require-resource-limits
spec:
  match:
    kinds:
    - apiGroups: [""]
      kinds: ["Pod"]
  parameters:
    limits:
    - cpu
    - memory
    requests:
    - cpu
    - memory
    exemptImages:
    - "docker.io/istio/proxyv2:*"
    - "gcr.io/istio-release/proxyv2:*"
```

## Debugging Webhook Interactions

When you suspect webhook ordering is causing problems, here are some useful techniques.

Check what webhooks modify a pod by creating a test pod and examining the audit log:

```bash
kubectl run test --image=nginx -n my-namespace --dry-run=server -o yaml > /tmp/injected-pod.yaml
```

Compare the output with a pod created without webhooks (in a namespace without injection):

```bash
kubectl run test --image=nginx -n default --dry-run=server -o yaml > /tmp/plain-pod.yaml
diff /tmp/plain-pod.yaml /tmp/injected-pod.yaml
```

Check Kubernetes events for webhook-related errors:

```bash
kubectl get events --field-selector reason=FailedCreate -A
```

Look at istiod logs for injection errors:

```bash
kubectl logs -n istio-system -l app=istiod | grep -i "inject\|webhook\|error"
```

## Using matchPolicy and sideEffects

Two other webhook fields affect how they interact with other controllers:

**matchPolicy**: Controls how the webhook matches API requests. Setting it to `Equivalent` means the webhook will be called for equivalent API versions, reducing the chance of missing requests:

```yaml
matchPolicy: Equivalent
```

**sideEffects**: Declares whether the webhook has side effects outside the admission review. Istio sets this to `None`, which means Kubernetes can safely call it during dry-run requests:

```yaml
sideEffects: None
```

Both of these are set correctly by default in Istio. You should check that other webhooks in your cluster also set them properly to avoid unexpected interactions.

## Best Practices

1. Keep an inventory of all mutating webhooks in your cluster and understand their interactions
2. Set `reinvocationPolicy: IfNeeded` on the Istio webhook if you have other webhooks that add containers
3. Exclude system namespaces from all injection webhooks
4. Test webhook interactions in a staging environment before production
5. Use `traffic.sidecar.istio.io/excludeOutboundPorts` annotations to handle init container connectivity issues
6. Document your webhook interactions so team members understand the dependencies

Webhook ordering is one of those things that works fine until you add a new tool to the cluster. Having a clear picture of how all your webhooks interact saves you from chasing mysterious pod failures.
