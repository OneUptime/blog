# How to Implement Ignore Differences for Autoscaled Replicas

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, IgnoreDifferences, Autoscaling

Description: Learn how to configure ArgoCD ignoreDifferences to prevent sync conflicts with autoscaled replica counts using JSON pointers and JQ expressions.

---

The `ignoreDifferences` feature in ArgoCD is the most direct solution for the autoscaler conflict problem. It tells ArgoCD to skip specific fields when comparing the desired state in Git against the live state in the cluster. This guide covers every way to configure ignoreDifferences for autoscaled replicas, from simple JSON pointers to advanced JQ expressions and global configurations.

## Basic ignoreDifferences for Replicas

The simplest configuration ignores the `replicas` field on all Deployments in an Application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/my-app-config
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
```

The `jsonPointers` syntax follows RFC 6901. Each pointer starts with `/` and navigates the resource structure. `/spec/replicas` points to `obj.spec.replicas` in the Deployment.

## Targeting Specific Deployments

If your Application manages multiple Deployments and only some are autoscaled, target specific resources by name:

```yaml
ignoreDifferences:
  # Only ignore replicas for autoscaled deployments
  - group: apps
    kind: Deployment
    name: backend-api        # Specific deployment name
    jsonPointers:
      - /spec/replicas
  - group: apps
    kind: Deployment
    name: worker
    jsonPointers:
      - /spec/replicas
  # frontend is NOT autoscaled, so replicas are tracked normally
```

## Ignoring Resource Requests for VPA

When VPA adjusts resource requests, you need to ignore nested fields in the container spec:

```yaml
ignoreDifferences:
  - group: apps
    kind: Deployment
    jsonPointers:
      - /spec/replicas
      # Ignore resources for the first container
      - /spec/template/spec/containers/0/resources/requests
```

The problem with jsonPointers is that container indices are fixed. If your container order changes, the pointer breaks. Use JQ expressions instead:

```yaml
ignoreDifferences:
  - group: apps
    kind: Deployment
    jqPathExpressions:
      - .spec.replicas
      # Ignore requests on ALL containers
      - .spec.template.spec.containers[].resources.requests
```

JQ expressions are more flexible because they use pattern matching instead of fixed paths.

## Ignoring Specific Container Resources

To ignore resources only for specific named containers:

```yaml
ignoreDifferences:
  - group: apps
    kind: Deployment
    jqPathExpressions:
      # Only ignore resources for the main app container
      - '.spec.template.spec.containers[] | select(.name == "api") | .resources.requests'
      # Leave sidecar container resources tracked
```

## Ignoring KEDA-Added Metadata

KEDA adds labels and annotations to Deployments it manages. Ignore these:

```yaml
ignoreDifferences:
  - group: apps
    kind: Deployment
    jsonPointers:
      - /spec/replicas
    jqPathExpressions:
      - .metadata.labels["scaledobject.keda.sh/name"]
      - .metadata.annotations["scaledobject.keda.sh/name"]
```

## Global ignoreDifferences

Instead of configuring ignoreDifferences per Application, set them globally in the argocd-cm ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Global ignore for all Deployments across all Applications
  resource.customizations.ignoreDifferences.apps_Deployment: |
    jqPathExpressions:
      - .spec.replicas

  # Global ignore for StatefulSets too
  resource.customizations.ignoreDifferences.apps_StatefulSet: |
    jqPathExpressions:
      - .spec.replicas

  # Global ignore for Argo Rollouts
  resource.customizations.ignoreDifferences.argoproj.io_Rollout: |
    jqPathExpressions:
      - .spec.replicas
```

The key format is `resource.customizations.ignoreDifferences.<group>_<kind>`.

Global settings apply to every Application in the cluster. This is convenient but means ArgoCD will never flag unexpected replica changes on any Deployment, even ones without autoscalers.

## Combining Global and Per-Application Settings

Global and per-Application ignoreDifferences are additive. You can use global settings for common patterns and per-Application settings for specific needs:

```yaml
# argocd-cm: Global - always ignore replicas
resource.customizations.ignoreDifferences.apps_Deployment: |
  jqPathExpressions:
    - .spec.replicas
```

```yaml
# Per-Application - also ignore resource requests (for VPA)
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: vpa-managed-app
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jqPathExpressions:
        - .spec.template.spec.containers[].resources.requests
```

## Server-Side Diff as an Alternative

ArgoCD 2.5+ supports server-side diff, which uses Kubernetes field ownership to decide what to compare:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  annotations:
    argocd.argoproj.io/compare-options: ServerSideDiff=true
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      managedFieldsManagers:
        - kube-controller-manager    # Manages replicas on behalf of HPA
        - vpa-admission-controller   # Manages resources on behalf of VPA
        - keda-operator              # Manages replicas on behalf of KEDA
```

With server-side diff, ArgoCD only compares fields that `argocd-application-controller` owns. Changes made by other field managers are automatically ignored without listing specific paths. This is the most maintainable approach because it adapts as autoscalers change different fields.

Enable server-side diff globally:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  controller.diff.server.side: "true"
```

## Verifying ignoreDifferences is Working

After configuring ignoreDifferences, verify it works:

```bash
# Check application sync status
argocd app get my-app

# Should show Synced even when replicas differ
# Status: Synced

# Check the diff explicitly
argocd app diff my-app

# The replicas field should NOT appear in the diff output
```

If the diff still shows replica differences, check:

1. **Typo in jsonPointer** - Pointers are case-sensitive and must start with `/`
2. **Wrong group/kind** - Deployments are in group `apps`, not empty string
3. **ConfigMap not loaded** - Restart argocd-application-controller after changing argocd-cm

```bash
# Restart the controller to pick up ConfigMap changes
kubectl rollout restart deployment argocd-application-controller -n argocd
```

## Handling the RespectIgnoreDifferences Sync Option

By default, ArgoCD applies the ignoreDifferences rules only during comparison (diff detection). During an actual sync, it still applies the Git values. This means a sync overrides the autoscaler temporarily.

To make syncs also respect ignoreDifferences, add:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
  syncPolicy:
    syncOptions:
      - RespectIgnoreDifferences=true
```

With `RespectIgnoreDifferences=true`, when ArgoCD syncs, it preserves the live value of ignored fields instead of overwriting them with the Git value. This prevents a sync from resetting replicas to the Git-defined count.

This is critical for autoscaled workloads. Without it, every manual or automated sync temporarily resets the replica count.

## Ignoring Differences on StatefulSets

StatefulSets with autoscaling need the same treatment:

```yaml
ignoreDifferences:
  - group: apps
    kind: StatefulSet
    jsonPointers:
      - /spec/replicas
    jqPathExpressions:
      - .spec.template.spec.containers[].resources.requests
```

## Ignoring Status Fields

Some controllers modify status subresources. While ArgoCD typically does not compare status fields, CRDs sometimes store status in spec:

```yaml
ignoreDifferences:
  # Ignore HPA status (usually not needed but included for completeness)
  - group: autoscaling
    kind: HorizontalPodAutoscaler
    jsonPointers:
      - /status

  # Ignore KEDA ScaledObject status
  - group: keda.sh
    kind: ScaledObject
    jsonPointers:
      - /status
```

## Debugging ignoreDifferences

When ignoreDifferences does not work as expected:

```bash
# See the full diff including ignored fields
argocd app diff my-app --local overlays/production/

# Check what ArgoCD thinks the desired state is
argocd app manifests my-app --source git

# Check what ArgoCD sees as the live state
argocd app manifests my-app --source live

# Compare them manually
diff <(argocd app manifests my-app --source git) <(argocd app manifests my-app --source live)
```

Common issues:

1. **jsonPointer starts without /** - Must be `/spec/replicas`, not `spec/replicas`
2. **Array index mismatch** - Use jqPathExpressions instead of jsonPointers for arrays
3. **Group name wrong** - Use `apps` for Deployments, `autoscaling` for HPA, `keda.sh` for KEDA
4. **CRD group format** - For `resource.customizations.ignoreDifferences`, replace dots with underscores only for the last segment: `keda.sh_ScaledObject`

## Complete Example

Here is a full Application with comprehensive ignoreDifferences for a service using HPA, VPA, and KEDA:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api-production
  namespace: argocd
spec:
  project: production
  source:
    repoURL: https://github.com/myorg/backend-api-config
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  ignoreDifferences:
    # HPA-managed replica count
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas

    # VPA-managed resource requests
    - group: apps
      kind: Deployment
      jqPathExpressions:
        - '.spec.template.spec.containers[] | select(.name == "api") | .resources.requests'

    # KEDA-added metadata
    - group: apps
      kind: Deployment
      jqPathExpressions:
        - .metadata.labels["scaledobject.keda.sh/name"]
        - .metadata.annotations["scaledobject.keda.sh/name"]

  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - RespectIgnoreDifferences=true
```

## Summary

The `ignoreDifferences` feature is essential for running autoscalers with ArgoCD. Use `jsonPointers` for simple field paths like `/spec/replicas`. Use `jqPathExpressions` for complex patterns like container resource requests. Enable `RespectIgnoreDifferences=true` in syncOptions to prevent syncs from overriding autoscaler values. For organizations with many autoscaled workloads, set global ignoreDifferences in argocd-cm. For the most maintainable approach, use server-side diff with `managedFieldsManagers` to automatically ignore fields managed by autoscaler controllers. The goal is clear: Git defines the autoscaling policy, autoscalers control the runtime values.
