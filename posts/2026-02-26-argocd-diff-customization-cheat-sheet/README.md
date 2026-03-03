# ArgoCD Diff Customization Cheat Sheet

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Configuration, DevOps

Description: A practical cheat sheet for customizing ArgoCD diff behavior to handle dynamic fields, operator mutations, and noisy resource differences.

---

One of the most common frustrations with ArgoCD is seeing applications stuck in OutOfSync when nothing has actually changed. This happens because Kubernetes mutates resources after they are applied - controllers add default values, operators inject sidecars, and admission webhooks modify specs. This cheat sheet shows you how to tame the diff engine so your sync status reflects reality.

## Understanding the Problem

When ArgoCD compares your Git manifests (desired state) against what is running in the cluster (live state), Kubernetes has often added or modified fields that do not exist in your Git source. Common culprits include:

- Default values added by Kubernetes (like `imagePullPolicy: Always`)
- Annotations injected by admission webhooks (like Istio sidecar injection)
- Status fields and metadata managed by controllers
- Labels added by operators or policy engines

## Global Diff Configuration

### Ignore Resource Updates Globally

Configure in the `argocd-cm` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Ignore specific JSON paths globally for all resources
  resource.compareoptions: |
    ignoreAggregatedRoles: true
    ignoreResourceStatusField: all
```

The `ignoreResourceStatusField` options:

- `all` - Ignore status for all resources
- `crd` - Only ignore status for CRDs
- Leave empty to compare status

### Global Ignore Differences

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.ignoreDifferences.all: |
    managedFieldsManagers:
      - kube-controller-manager
      - kube-scheduler
    jsonPointers:
      - /metadata/managedFields
```

## Per-Resource Ignore Differences

### By Resource Group and Kind

These go in the `argocd-cm` ConfigMap:

```yaml
# Ignore specific fields for Deployments
resource.customizations.ignoreDifferences.apps_Deployment: |
  jsonPointers:
    - /spec/replicas
    - /spec/template/metadata/annotations/kubectl.kubernetes.io~1last-applied-configuration
  jqPathExpressions:
    - .spec.template.spec.containers[].resources

# Ignore fields for Services
resource.customizations.ignoreDifferences.Service: |
  jsonPointers:
    - /spec/clusterIP
    - /spec/clusterIPs

# Ignore fields for ServiceAccounts
resource.customizations.ignoreDifferences.ServiceAccount: |
  jsonPointers:
    - /secrets

# Ignore CRD conversion webhook CA bundles
resource.customizations.ignoreDifferences.apiextensions.k8s.io_CustomResourceDefinition: |
  jsonPointers:
    - /spec/conversion/webhook/clientConfig/caBundle
    - /status
```

### Common Ignore Patterns

Here is a collection of the most frequently needed ignore rules:

```yaml
# MutatingWebhookConfiguration - CA bundle injected by cert-manager
resource.customizations.ignoreDifferences.admissionregistration.k8s.io_MutatingWebhookConfiguration: |
  jqPathExpressions:
    - .webhooks[]?.clientConfig.caBundle

# ValidatingWebhookConfiguration - same issue
resource.customizations.ignoreDifferences.admissionregistration.k8s.io_ValidatingWebhookConfiguration: |
  jqPathExpressions:
    - .webhooks[]?.clientConfig.caBundle

# ConfigMaps with operator-injected data
resource.customizations.ignoreDifferences.ConfigMap: |
  jsonPointers:
    - /metadata/annotations/control-plane.alpha.kubernetes.io~1leader

# PersistentVolumeClaims - storage class and volume name
resource.customizations.ignoreDifferences.PersistentVolumeClaim: |
  jsonPointers:
    - /spec/volumeName
    - /spec/storageClassName

# Namespace - ignore labels added by controllers
resource.customizations.ignoreDifferences.Namespace: |
  jsonPointers:
    - /metadata/labels/kubernetes.io~1metadata.name
```

## Application-Level Ignore Differences

You can also set ignore rules directly on an ArgoCD Application resource:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  ignoreDifferences:
    # Ignore replicas managed by HPA
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas

    # Ignore specific named resources
    - group: apps
      kind: Deployment
      name: my-deployment
      namespace: production
      jsonPointers:
        - /spec/template/metadata/annotations

    # Using jq expressions for more complex matching
    - group: apps
      kind: Deployment
      jqPathExpressions:
        - .spec.template.spec.containers[]?.resources
        - .spec.template.spec.initContainers[]?.resources

    # Ignore all fields managed by a specific manager
    - group: "*"
      kind: "*"
      managedFieldsManagers:
        - cluster-autoscaler
```

## JSON Pointer Syntax Quick Reference

JSON Pointers follow RFC 6901. Here are the key rules:

```text
/spec/replicas                          -> spec.replicas
/metadata/annotations                   -> metadata.annotations
/spec/template/spec/containers/0/image  -> First container's image
/metadata/labels/app.kubernetes.io~1name -> Label with slash (~ encodes /)
/data/config~0value                     -> Key with tilde (~ encodes ~)
```

Special characters:
- `/` in a key is encoded as `~1`
- `~` in a key is encoded as `~0`

## JQ Path Expressions

JQ expressions give you more power than JSON Pointers. Here are common patterns:

```yaml
jqPathExpressions:
  # Match all containers' resource limits
  - .spec.template.spec.containers[].resources

  # Match a specific container by name
  - .spec.template.spec.containers[] | select(.name == "sidecar")

  # Match annotations with a specific prefix
  - .metadata.annotations | to_entries | map(select(.key | startswith("sidecar")))

  # Match specific array elements
  - .spec.template.spec.volumes[] | select(.name == "tmp")

  # Ignore all env vars in all containers
  - .spec.template.spec.containers[].env
```

## HPA and Replicas

One of the most common diff issues. When you use a Horizontal Pod Autoscaler, ArgoCD keeps showing OutOfSync because the HPA changes the replica count:

```yaml
# Option 1: Ignore at the Application level
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas

# Option 2: Remove replicas from your Git manifest entirely
# Just don't set spec.replicas in your Deployment YAML

# Option 3: Use server-side diff (ArgoCD v2.5+)
spec:
  syncPolicy:
    syncOptions:
      - ServerSideApply=true
      - RespectIgnoreDifferences=true
```

The `RespectIgnoreDifferences=true` sync option is key. It tells ArgoCD to not revert the ignored fields during sync.

## Managed Fields Managers

Instead of ignoring specific fields, you can tell ArgoCD to ignore all fields managed by a specific controller:

```yaml
resource.customizations.ignoreDifferences.apps_Deployment: |
  managedFieldsManagers:
    - kube-controller-manager
    - cluster-autoscaler
    - hpa-controller
```

This is cleaner than listing individual JSON pointers when a controller manages many fields.

## Server-Side Diff (ArgoCD 2.5+)

Server-side diff uses Kubernetes server-side apply to compare resources, which is more accurate:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  syncPolicy:
    syncOptions:
      - ServerSideApply=true
```

Or enable it globally:

```yaml
# argocd-cmd-params-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  controller.diff.server.side: "true"
```

## Debugging Diff Issues

```bash
# See the full diff for an application
argocd app diff my-app

# See the diff in detail with specific resource
argocd app diff my-app --resource apps:Deployment:my-deploy

# Get the live manifest
argocd app manifests my-app --source live

# Get the desired manifest (from Git)
argocd app manifests my-app --source git

# Compare them manually
diff <(argocd app manifests my-app --source git) <(argocd app manifests my-app --source live)
```

## Complete Example ConfigMap

Here is a comprehensive `argocd-cm` with common diff customizations:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.compareoptions: |
    ignoreAggregatedRoles: true
    ignoreResourceStatusField: crd

  resource.customizations.ignoreDifferences.all: |
    managedFieldsManagers:
      - kube-controller-manager
    jsonPointers:
      - /metadata/managedFields

  resource.customizations.ignoreDifferences.apps_Deployment: |
    jsonPointers:
      - /spec/replicas
    jqPathExpressions:
      - .spec.template.metadata.annotations."kubectl.kubernetes.io/last-applied-configuration"

  resource.customizations.ignoreDifferences.admissionregistration.k8s.io_MutatingWebhookConfiguration: |
    jqPathExpressions:
      - .webhooks[]?.clientConfig.caBundle

  resource.customizations.ignoreDifferences.admissionregistration.k8s.io_ValidatingWebhookConfiguration: |
    jqPathExpressions:
      - .webhooks[]?.clientConfig.caBundle

  resource.customizations.ignoreDifferences.Service: |
    jsonPointers:
      - /spec/clusterIP
      - /spec/clusterIPs

  resource.customizations.ignoreDifferences.ServiceAccount: |
    jsonPointers:
      - /secrets
```

For a deeper dive into diff customization strategies, check out our post on [customizing diffs in ArgoCD](https://oneuptime.com/blog/post/2026-01-25-customize-diffs-argocd/view) and [ArgoCD server-side apply](https://oneuptime.com/blog/post/2026-02-09-argocd-server-side-apply/view).
