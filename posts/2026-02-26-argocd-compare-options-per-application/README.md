# How to Configure Compare Options per Application in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Configuration Management

Description: Learn how to configure compare options on a per-application basis in ArgoCD to control how resource diffs are calculated, ignore specific fields, and handle environment-specific comparison behavior.

---

ArgoCD continuously compares the desired state in your Git repository against the live state in your Kubernetes cluster. By default, it applies a standard comparison strategy across all applications. But in the real world, different applications have different needs. Some applications use operators that inject fields you do not control. Others rely on admission webhooks that modify resources after they are applied. Configuring compare options per application gives you fine-grained control over how ArgoCD evaluates drift for each workload.

## Why Per-Application Compare Options Matter

When you run a handful of applications, the default comparison behavior works fine. Once you scale to dozens or hundreds of applications, you will encounter situations where certain apps constantly show as "OutOfSync" even though nothing meaningful has changed. The root cause is usually server-side mutations - fields added by operators, webhooks, or controllers that are not part of your Git manifests.

Instead of applying a blanket ignore rule across your entire ArgoCD instance, per-application compare options let you tailor the diff behavior to each application's needs. This means your monitoring dashboard stays clean, and you only get alerted about real drift.

## Understanding the compareOptions Spec

ArgoCD exposes compare options through the `spec.ignoreDifferences` field in the Application resource. This field accepts a list of rules that tell ArgoCD which fields to skip during comparison.

Here is the basic structure:

```yaml
# Application with per-app compare options
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/my-org/my-repo.git
    targetRevision: main
    path: k8s/my-app
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
  ignoreDifferences:
    # Ignore specific JSON pointers on a resource kind
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
    # Ignore using JQ path expressions (more flexible)
    - group: apps
      kind: Deployment
      jqPathExpressions:
        - .spec.template.metadata.annotations["kubectl.kubernetes.io/restartedAt"]
    # Ignore fields on a specific named resource
    - group: ""
      kind: ConfigMap
      name: my-dynamic-config
      jsonPointers:
        - /data/last-updated
```

## JSON Pointers vs JQ Path Expressions

ArgoCD supports two syntaxes for specifying which fields to ignore.

**JSON Pointers** follow RFC 6901 and use a path-like syntax. They are straightforward for simple field paths:

```yaml
# JSON Pointer examples
ignoreDifferences:
  - group: apps
    kind: Deployment
    jsonPointers:
      - /spec/replicas                    # Top-level field
      - /metadata/annotations/some~1key  # Escaped slash in key name
      - /spec/template/spec/containers/0/resources  # Array index
```

**JQ Path Expressions** offer more power when you need pattern matching or conditional logic:

```yaml
# JQ path expression examples
ignoreDifferences:
  - group: apps
    kind: Deployment
    jqPathExpressions:
      # Ignore a specific annotation across all matching resources
      - .metadata.annotations["deployment.kubernetes.io/revision"]
      # Ignore all annotations matching a pattern
      - .spec.template.metadata.annotations | keys[] | select(startswith("sidecar.istio.io"))
```

JQ expressions are the recommended approach for most use cases because they handle edge cases like special characters in field names without awkward escaping.

## Common Scenarios and Solutions

### Ignoring HPA-Managed Replicas

If you use a Horizontal Pod Autoscaler, the replica count will differ from what is in Git:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web-frontend
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/my-org/apps.git
    targetRevision: main
    path: frontend
  destination:
    server: https://kubernetes.default.svc
    namespace: frontend
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
```

### Ignoring Webhook-Injected Sidecars

Service meshes like Istio inject sidecar containers via admission webhooks. The live state will always have more containers than your Git manifests:

```yaml
ignoreDifferences:
  - group: apps
    kind: Deployment
    jqPathExpressions:
      # Ignore the entire containers list length difference
      - .spec.template.spec.containers[] | select(.name == "istio-proxy")
      - .spec.template.spec.initContainers
      - .spec.template.metadata.annotations["sidecar.istio.io/status"]
      - .metadata.annotations["sidecar.istio.io/inject"]
```

### Ignoring Operator-Managed Status Fields

Some CRDs have fields that operators continuously update:

```yaml
ignoreDifferences:
  - group: networking.istio.io
    kind: VirtualService
    jqPathExpressions:
      - .metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"]
  - group: cert-manager.io
    kind: Certificate
    jsonPointers:
      - /status
```

## Scoping Compare Options to Specific Resources

You can narrow down your ignore rules to specific resource names within an application:

```yaml
ignoreDifferences:
  # Only ignore replicas on the worker deployment, not on other deployments
  - group: apps
    kind: Deployment
    name: worker
    jsonPointers:
      - /spec/replicas
  # Ignore a field on all ConfigMaps in this application
  - group: ""
    kind: ConfigMap
    jsonPointers:
      - /metadata/annotations/checksum
```

The `name` field is optional. When omitted, the rule applies to all resources matching the `group` and `kind` within that application. When specified, it targets only the named resource.

## Using managedFieldsManagers for Server-Side Apply

ArgoCD 2.5 and later supports ignoring fields owned by specific field managers. This is useful when another controller manages parts of a resource:

```yaml
ignoreDifferences:
  - group: apps
    kind: Deployment
    managedFieldsManagers:
      # Ignore fields managed by the HPA controller
      - kube-controller-manager
      # Ignore fields managed by a custom operator
      - my-custom-operator
```

This approach is cleaner than listing individual fields because it automatically covers whatever the named controller manages, even if those fields change over time.

## Combining with System-Level Defaults

Per-application compare options work alongside system-level defaults configured in the `argocd-cm` ConfigMap. The system-level defaults set a baseline, and per-application settings add additional ignore rules on top.

```yaml
# argocd-cm ConfigMap (system-level defaults)
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.compareoptions: |
    ignoreAggregatedRoles: true
  resource.customizations.ignoreDifferences.all: |
    jsonPointers:
      - /metadata/annotations/kubectl.kubernetes.io~1last-applied-configuration
```

The per-application `ignoreDifferences` entries are merged with these system-level rules. You do not need to repeat system-level ignores in each application.

## Verifying Your Compare Options

After configuring compare options, verify they work correctly:

```bash
# Check application sync status
argocd app get my-app

# View the diff that ArgoCD sees (after applying ignore rules)
argocd app diff my-app

# Force a hard refresh to recalculate comparison
argocd app get my-app --hard-refresh
```

If the application still shows as OutOfSync after adding ignore rules, double-check your JSON pointer syntax. A common mistake is using dots instead of slashes, or forgetting to escape special characters.

## Best Practices

1. **Start with JQ expressions** - they are more readable and handle edge cases better than JSON pointers.
2. **Document why** you are ignoring each field by adding comments in your Application YAML.
3. **Be specific** - ignore the narrowest field path possible rather than entire sections of the spec.
4. **Use managedFieldsManagers** when the ignored fields come from a specific controller.
5. **Test changes** with `argocd app diff` before assuming your rules are correct.
6. **Review periodically** - compare options can mask real drift if left unchecked.

Per-application compare options are essential for running ArgoCD at scale. They keep your sync status accurate and meaningful, letting you focus on the changes that actually matter. For more on ArgoCD diff customization, see our guide on [How to Customize Diffs in ArgoCD](https://oneuptime.com/blog/post/2026-01-25-customize-diffs-argocd/view).
