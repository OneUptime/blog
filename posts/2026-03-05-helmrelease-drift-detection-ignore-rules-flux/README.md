# How to Configure HelmRelease Drift Detection Ignore Rules in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Drift Detection, Ignore Rules

Description: Learn how to configure ignore rules for HelmRelease drift detection in Flux CD to exclude specific fields from drift correction.

---

## Introduction

When you enable drift detection on a HelmRelease in Flux CD, the Helm controller compares the live state of managed resources against the desired state and corrects any differences. However, there are legitimate scenarios where certain fields should be allowed to differ from the desired state. For example, Horizontal Pod Autoscalers (HPAs) dynamically adjust replica counts, and some operators mutate resource annotations after deployment.

Flux provides the `spec.driftDetection.ignore` field to define rules that exclude specific JSON paths from drift detection. This prevents Flux from fighting with other controllers or operators that legitimately modify resource fields.

## Why Ignore Rules Are Needed

Several common Kubernetes patterns produce expected drift:

- **Horizontal Pod Autoscalers** modify `spec.replicas` on Deployments
- **Cert-Manager** adds annotations to Ingress resources
- **Istio sidecar injection** modifies pod templates
- **Admission webhooks** add default values to resource specs
- **Cluster autoscalers** modify node-related annotations

Without ignore rules, Flux would continuously revert these changes, creating a conflict loop between Flux and the other controller.

## Configuring Ignore Rules

Ignore rules use JSON Pointer syntax (RFC 6901) to specify which fields to exclude from drift comparison. Each rule targets a specific path within the resource's JSON structure.

The following example ignores replica count changes so HPAs can function alongside Flux-managed HelmReleases:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-application
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-application
      version: "1.2.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  driftDetection:
    mode: enabled
    # Ignore rules to prevent conflicts with HPA
    ignore:
      # Allow HPA to manage replica count without Flux reverting it
      - paths:
          - "/spec/replicas"
        target:
          kind: Deployment
  values:
    replicaCount: 3
    image:
      repository: myregistry/my-application
      tag: "v1.2.0"
```

## Targeting Specific Resources

Ignore rules can target specific resource types using the `target` field. This ensures that the ignore rule only applies to the intended resources, not all resources managed by the HelmRelease.

The following example shows how to target ignore rules to specific resource kinds and names:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-application
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-application
      version: "1.2.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  driftDetection:
    mode: enabled
    ignore:
      # Ignore replica changes only on Deployments
      - paths:
          - "/spec/replicas"
        target:
          kind: Deployment
      # Ignore annotation changes on a specific Ingress
      - paths:
          - "/metadata/annotations"
        target:
          kind: Ingress
          name: my-application-ingress
      # Ignore resource limits on all containers in a StatefulSet
      - paths:
          - "/spec/template/spec/containers/0/resources"
        target:
          kind: StatefulSet
  values:
    replicaCount: 3
```

## Ignoring Multiple Paths

You can specify multiple JSON paths in a single ignore rule. This is useful when a single controller modifies several fields on the same resource.

The following example ignores multiple fields that are commonly managed by external controllers:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-application
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-application
      version: "1.2.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  driftDetection:
    mode: enabled
    ignore:
      # Ignore fields commonly modified by external controllers
      - paths:
          - "/spec/replicas"
          - "/spec/template/metadata/annotations"
          - "/spec/template/spec/containers/0/resources"
        target:
          kind: Deployment
  values:
    replicaCount: 3
```

## Common Ignore Rule Patterns

Here are frequently used ignore rule configurations for popular Kubernetes patterns.

### HPA-Managed Deployments

When using Horizontal Pod Autoscalers, you need to ignore the replicas field:

```yaml
driftDetection:
  mode: enabled
  ignore:
    # HPA controls replicas -- do not let Flux revert scaling decisions
    - paths:
        - "/spec/replicas"
      target:
        kind: Deployment
```

### Cert-Manager Managed Ingresses

Cert-Manager adds annotations and TLS configurations to Ingress resources:

```yaml
driftDetection:
  mode: enabled
  ignore:
    # Cert-Manager modifies Ingress annotations and TLS settings
    - paths:
        - "/metadata/annotations"
      target:
        kind: Ingress
```

### VPA-Managed Resource Requests

Vertical Pod Autoscalers adjust container resource requests:

```yaml
driftDetection:
  mode: enabled
  ignore:
    # VPA adjusts resource requests on containers
    - paths:
        - "/spec/template/spec/containers/0/resources/requests"
      target:
        kind: Deployment
```

## Verifying Ignore Rules

After configuring ignore rules, verify they work by manually changing an ignored field and confirming Flux does not revert it.

Use the following commands to test ignore rules:

```bash
# Scale the deployment (this should be ignored by drift detection)
kubectl scale deployment my-application -n default --replicas=5

# Wait for the next reconciliation cycle
sleep 120

# Verify the replica count was NOT reverted to 3
kubectl get deployment my-application -n default -o jsonpath='{.spec.replicas}'
# Expected output: 5 (because /spec/replicas is ignored)
```

You can also check the HelmRelease events for any drift-related messages:

```bash
# Check events -- no drift event should appear for ignored fields
kubectl events --for helmrelease/my-application -n default
```

## Best Practices

1. **Be specific with targets** -- always use the `target` field to scope ignore rules to specific resource kinds or names, rather than ignoring paths globally.
2. **Use the most specific JSON path possible** -- ignoring `/metadata/annotations` is broad; prefer ignoring specific annotation keys if the JSON pointer syntax supports it.
3. **Document why each ignore rule exists** -- add comments in your YAML explaining which controller or process requires each ignore rule.
4. **Start with warn mode** -- before adding ignore rules, run drift detection in `warn` mode to understand what drift occurs naturally in your cluster.
5. **Review ignore rules periodically** -- as your cluster evolves, some ignore rules may no longer be necessary.

## Conclusion

Drift detection ignore rules let you maintain strict GitOps enforcement while accommodating legitimate out-of-band changes from controllers like HPAs, VPAs, and Cert-Manager. By carefully targeting ignore rules with JSON Pointer paths and resource selectors, you can prevent conflict loops while still catching unauthorized manual changes. Always start with `warn` mode to understand your drift landscape before configuring ignore rules.
