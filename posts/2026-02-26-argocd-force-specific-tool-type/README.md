# How to Force a Specific Tool Type in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Tool Detection, Configuration

Description: Learn how to explicitly specify which tool ArgoCD should use for manifest generation when auto-detection picks the wrong one or you need precise control.

---

ArgoCD's auto-detection usually gets the tool type right, but sometimes you need to override it. Maybe your directory contains both `Chart.yaml` and `kustomization.yaml` and you want Kustomize, not Helm. Maybe you have `.jsonnet` files but want ArgoCD to treat the directory as plain YAML. Or maybe you want a specific CMP plugin to handle files that would otherwise match a built-in tool. This guide shows all the ways to force ArgoCD to use a specific tool type.

## Why Force a Tool Type?

There are several common reasons to override auto-detection:

- A directory contains marker files for multiple tools (e.g., both `Chart.yaml` and `kustomization.yaml`)
- You want to use a CMP plugin for files that would normally match a built-in tool
- You have `.jsonnet` files that are documentation, not manifests
- You are migrating from one tool to another and files from both exist temporarily
- You want to treat a Helm chart directory as plain YAML for debugging

## Using the CLI to Force Tool Type

When creating an application with the CLI, specify the tool type explicitly:

```bash
# Force Kustomize even if Chart.yaml exists
argocd app create my-app \
  --repo https://github.com/myorg/configs.git \
  --path apps/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app \
  --config-management-plugin ""  # Clear any plugin
  # Kustomize-specific parameters force Kustomize detection
  --kustomize-image nginx=nginx:1.25

# Force Helm
argocd app create my-app \
  --repo https://github.com/myorg/configs.git \
  --path apps/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app \
  --helm-set replicaCount=3

# Force a specific CMP plugin
argocd app create my-app \
  --repo https://github.com/myorg/configs.git \
  --path apps/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app \
  --config-management-plugin my-custom-plugin
```

## Declarative YAML - Forcing Tool Type

The most explicit way is to declare the tool configuration in the Application spec. When you include tool-specific configuration, ArgoCD uses that tool regardless of what auto-detection would find.

### Force Helm

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/configs.git
    targetRevision: main
    path: apps/my-app
    # Including a helm section forces Helm tool usage
    helm:
      releaseName: my-app
      values: |
        replicaCount: 3
      valueFiles:
        - values.yaml
        - values-production.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
```

### Force Kustomize

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/configs.git
    targetRevision: main
    path: apps/my-app
    # Including a kustomize section forces Kustomize tool usage
    kustomize:
      images:
        - nginx=nginx:1.25
      commonLabels:
        environment: production
      namePrefix: prod-
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
```

### Force Directory (Plain YAML)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/configs.git
    targetRevision: main
    path: apps/my-app
    # Including a directory section forces Directory tool usage
    directory:
      recurse: true
      include: "*.yaml"
      exclude: "test/**"
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
```

### Force a CMP Plugin

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/configs.git
    targetRevision: main
    path: apps/my-app
    # Including a plugin section forces CMP plugin usage
    plugin:
      name: sops-kustomize
      env:
        - name: ENVIRONMENT
          value: production
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
```

## Tool Type Priority with Explicit Configuration

When you explicitly specify a tool type in the Application spec, it completely overrides auto-detection. The rules are:

| Spec Contains | Tool Used | Auto-Detection |
|---------------|-----------|----------------|
| `source.helm` | Helm | Skipped |
| `source.kustomize` | Kustomize | Skipped |
| `source.directory` | Directory | Skipped |
| `source.plugin` | Named Plugin | Skipped |
| None of the above | Auto-detected | Used |

If you specify multiple tool types (which is technically possible but incorrect), ArgoCD's behavior is undefined and should be avoided.

## Common Scenarios

### Scenario: Chart.yaml with Kustomize

Your directory has both a Helm chart and Kustomize overlays, and you want Kustomize:

```text
my-app/
  Chart.yaml            # Helm marker - would normally trigger Helm
  kustomization.yaml    # You want this to win
  values.yaml
  templates/
  overlays/
```

Force Kustomize:

```yaml
spec:
  source:
    path: apps/my-app
    kustomize:
      images:
        - my-app=my-app:v2.0
```

### Scenario: Jsonnet Files as Non-Manifests

Your directory has Jsonnet configuration files but also plain YAML manifests. You want ArgoCD to use the YAML files directly:

```text
my-app/
  deployment.yaml
  service.yaml
  monitoring.jsonnet    # This is for local use, not for ArgoCD
  alerts.libsonnet
```

Force Directory:

```yaml
spec:
  source:
    path: apps/my-app
    directory:
      recurse: false
      include: "*.yaml"  # Only process YAML files
      exclude: "*.jsonnet"
```

### Scenario: Using a Custom Plugin Instead of Built-in Helm

You have a Helm chart but want your custom plugin to handle it (for example, to add SOPS decryption):

```yaml
spec:
  source:
    path: apps/my-app
    plugin:
      name: sops-helm  # Your custom plugin
      env:
        - name: HELM_RELEASE_NAME
          value: my-app
```

This completely bypasses Helm auto-detection and sends the source to your CMP plugin.

## Force Tool Type via the UI

In the ArgoCD UI, when creating or editing an application:

1. Navigate to the application's source configuration
2. Under "Source," look for the "Type" dropdown
3. Select the desired tool type: Helm, Kustomize, Directory, or Plugin
4. Configure tool-specific settings in the section that appears

The UI generates the same YAML configuration as the declarative approach.

## Verifying the Tool Type

After creating or modifying an application, verify which tool ArgoCD is using:

```bash
# Check the source type
argocd app get my-app -o json | jq '.status.sourceType'

# Check the full source configuration
argocd app get my-app -o json | jq '.spec.source'

# For multi-source apps, check each source
argocd app get my-app -o json | jq '.spec.sources[] | {path: .path, helm: .helm, kustomize: .kustomize, directory: .directory, plugin: .plugin}'
```

## Implications of Forcing Tool Types

When you force a tool type, ArgoCD does not validate that the source directory actually contains the right files for that tool. You might see errors like:

- Forcing Helm on a directory without `Chart.yaml`: Helm will fail with "Chart.yaml not found"
- Forcing Kustomize on a directory without `kustomization.yaml`: Kustomize will fail with "unable to find kustomization"
- Forcing Directory on a Helm chart: ArgoCD will try to apply the Helm templates as raw YAML, which will fail because template variables are not rendered

Make sure the directory actually supports the tool you are forcing.

## Multi-Source Application Tool Selection

With multi-source applications, you can use different tools for each source independently:

```yaml
spec:
  sources:
    # Source 1: Force Helm
    - repoURL: https://charts.bitnami.com/bitnami
      chart: nginx
      targetRevision: 15.4.4
      helm:
        releaseName: nginx
        values: |
          replicaCount: 3

    # Source 2: Force custom plugin
    - repoURL: https://github.com/myorg/configs.git
      targetRevision: main
      path: secrets/my-app
      plugin:
        name: sops-decrypt

    # Source 3: Force Kustomize
    - repoURL: https://github.com/myorg/overlays.git
      targetRevision: main
      path: overlays/production
      kustomize:
        namePrefix: prod-
```

## Summary

Forcing a tool type in ArgoCD is straightforward - include the tool-specific configuration section (`helm`, `kustomize`, `directory`, or `plugin`) in your Application spec's source. This completely bypasses auto-detection and gives you precise control over how manifests are generated. Use this when auto-detection picks the wrong tool, when you have mixed file types in a directory, or when you want a CMP plugin to handle files that would normally match a built-in tool. Always verify the forced tool type works correctly by checking the application status after creation.
