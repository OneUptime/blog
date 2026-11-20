# How to Persist Knative ConfigMap Changes When the Operator Keeps Reverting Them

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative, Kubernetes, Configuration

Description: Move Knative configuration into the Operator-managed custom resource so reconciliation preserves ConfigMap values and GitOps owns one durable source of truth.

You patch `config-autoscaler`, confirm the new value, and see it revert a few seconds later. If Knative was installed through its Operator, that is usually reconciliation doing its job. The Operator generates system ConfigMaps from the `KnativeServing` custom resource and restores the desired values.

Change the custom resource that owns the setting, then verify both the generated configuration and the behavior of a new Revision.

## Identify the configuration owner

First check whether the Operator resource exists in your installation namespace:

```bash
kubectl get knativeservings.operator.knative.dev -A
kubectl -n knative-serving get knativeserving knative-serving -o yaml
kubectl -n knative-serving get configmap config-autoscaler -o yaml
```

The namespace and resource name are examples. If the resource type is absent, investigate your YAML, Helm, or GitOps installation instead of assuming the Operator is responsible. Managed fields and controller logs can help identify which actor is rewriting a value.

The [Operator configuration documentation](https://knative.dev/docs/install/operator/configuring-with-operator/) explicitly describes the mapping from `spec.config` to generated ConfigMaps. A key called `autoscaler` configures `config-autoscaler`; use `deployment` for `config-deployment` and `features` for `config-features`.

## Put the value in the durable source

Merge this fragment into the existing `KnativeServing` manifest:

```yaml
apiVersion: operator.knative.dev/v1beta1
kind: KnativeServing
metadata:
  name: knative-serving
  namespace: knative-serving
spec:
  config:
    autoscaler:
      stable-window: "90s"
    deployment:
      progress-deadline: "12m"
```

These values illustrate the mapping; choose the timings for your workload. Preserve the existing version, ingress configuration, image overrides, and other settings. Do not replace the complete resource with a minimal example and accidentally remove installation configuration.

When GitOps manages this resource, commit the change there and let the existing controller apply it. An emergency live patch also needs to reach Git, or GitOps can reverse it at the next sync. A merge patch for an installation without a competing GitOps source looks like this:

```bash
kubectl -n knative-serving patch knativeserving knative-serving \
  --type=merge \
  -p '{"spec":{"config":{"autoscaler":{"stable-window":"90s"}}}}'
```

This updates one map key while retaining other map entries. Configuration data values are strings: quote numbers, booleans, and durations when the target ConfigMap expects text. A Kubernetes boolean such as `true` is not interchangeable with the string `"enabled"` used by many Knative feature flags.

## Check both reconciliation layers

After your normal apply or sync, inspect the owning resource and generated ConfigMap:

```bash
kubectl -n knative-serving get knativeserving knative-serving \
  -o jsonpath='{.spec.config.autoscaler.stable-window}{"\n"}'
kubectl -n knative-serving get configmap config-autoscaler \
  -o jsonpath='{.data.stable-window}{"\n"}'
```

Both should report the requested value. Review the custom resource's conditions and Operator logs if the ConfigMap stays unchanged. A successful API write proves only that Kubernetes accepted the object, not that every managed component applied it.

Avoid maintaining a second manifest that independently owns the generated ConfigMap. Two reconcilers writing different values can produce recurring drift and misleading rollouts. Keep the custom resource as the configuration source for Operator-managed keys.

## Separate configuration propagation from workload behavior

Different settings take effect at different points. Some are watched dynamically, while others influence resources generated for a new Revision. An existing Revision is generally immutable and may retain decisions made when it was created. Consult the setting's specific documentation and create a controlled new Revision where necessary.

For example, [deployment configuration](https://knative.dev/docs/serving/configuration/deployment/) includes the progress deadline and queue-proxy image. [Feature flags](https://knative.dev/docs/serving/configuration/feature-flags/) govern whether certain fields are accepted. Verify the generated resource or behavior relevant to the value you changed, not merely the ConfigMap text.

Keep a rollback change ready in the same source. Restore the previous value through the custom resource and repeat the reconciliation checks. Once ownership and activation are explicit, a reverted ConfigMap stops being a mysterious race: it becomes a clear sign that the change was made at the wrong layer.
