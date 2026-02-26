# How to Use Helm Post-Renderers with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Kustomize

Description: Learn how to use Helm post-renderers in ArgoCD to transform rendered Helm output with Kustomize patches, labels, and other modifications.

---

Helm post-renderers let you modify the rendered Helm output before it gets applied to the cluster. This is incredibly useful when you need to add labels, annotations, patches, or other modifications to a chart's resources without forking the chart. ArgoCD does not support arbitrary post-renderer executables, but it does support Kustomize as a post-renderer, which covers the vast majority of use cases.

This guide explains how to use Kustomize as a Helm post-renderer in ArgoCD, with practical examples for common transformation scenarios.

## What is a Post-Renderer

In standard Helm usage, a post-renderer is an executable that receives rendered YAML on stdin and outputs modified YAML on stdout:

```bash
# Standard Helm post-renderer usage (outside ArgoCD)
helm install my-app ./chart --post-renderer ./my-transform.sh
```

ArgoCD does not support arbitrary post-renderer executables because it renders charts in its repo-server, which has security restrictions. Instead, ArgoCD provides built-in support for Kustomize as a post-renderer, which lets you apply patches, add labels, modify resources, and more.

## Enabling Kustomize Post-Rendering in ArgoCD

To use Kustomize as a post-renderer, you need to create a `kustomization.yaml` file alongside your Helm values and reference it in a multi-source application, or use the built-in Helm+Kustomize integration.

### Method 1: Using Multi-Source with Helm and Kustomize

The cleanest approach is to use a multi-source application that combines Helm output with Kustomize patches:

```
# Repository structure
my-app/
  helm/
    Chart.yaml
    templates/
    values.yaml
  kustomize/
    kustomization.yaml
    patches/
      add-labels.yaml
      add-sidecar.yaml
```

However, the most practical approach for post-rendering is to use ArgoCD's built-in Kustomize post-renderer support.

### Method 2: Kustomize with Helm Chart as a Base

Create a Kustomize overlay that uses the Helm chart as its base:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# Use Helm chart inflation as the base
helmCharts:
  - name: my-app
    repo: https://charts.myorg.com
    version: 1.5.0
    releaseName: my-app
    namespace: production
    valuesFile: values-production.yaml

# Apply Kustomize transformations on top
commonLabels:
  team: platform
  cost-center: engineering

patches:
  - target:
      kind: Deployment
    patch: |
      - op: add
        path: /spec/template/spec/containers/-
        value:
          name: log-shipper
          image: myorg/log-shipper:latest
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
```

ArgoCD Application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/my-config.git
    targetRevision: main
    path: my-app
    # ArgoCD detects the kustomization.yaml and processes accordingly
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

## Practical Post-Renderer Scenarios

### Adding Common Labels to All Resources

A very common need is adding organization-specific labels to all resources from a third-party chart:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

helmCharts:
  - name: nginx
    repo: https://charts.bitnami.com/bitnami
    version: 15.4.0
    releaseName: nginx-web
    namespace: web
    valuesFile: values.yaml

# These labels will be added to ALL resources
commonLabels:
  app.kubernetes.io/managed-by: argocd
  app.kubernetes.io/part-of: web-platform
  team: web-team
  environment: production

commonAnnotations:
  monitoring.myorg.com/enabled: "true"
  cost-center: "CC-12345"
```

### Injecting a Sidecar Container

Add a sidecar (like a log collector or service mesh proxy) to all Deployments:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

helmCharts:
  - name: my-app
    repo: https://charts.myorg.com
    version: 1.5.0
    releaseName: my-app
    valuesFile: values.yaml

patches:
  - target:
      kind: Deployment
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: unused  # Kustomize requires this but applies to all matched
      spec:
        template:
          spec:
            containers:
              - name: fluent-bit
                image: fluent/fluent-bit:latest
                volumeMounts:
                  - name: app-logs
                    mountPath: /var/log/app
                resources:
                  requests:
                    memory: "64Mi"
                    cpu: "50m"
                  limits:
                    memory: "128Mi"
                    cpu: "100m"
            volumes:
              - name: app-logs
                emptyDir: {}
```

### Adding Network Policies

Wrap chart resources with additional security resources:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

helmCharts:
  - name: my-app
    repo: https://charts.myorg.com
    version: 1.5.0
    releaseName: my-app
    valuesFile: values.yaml

# Add additional resources not in the chart
resources:
  - network-policy.yaml
  - pod-disruption-budget.yaml
```

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: my-app-network-policy
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: my-app
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: web
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: database
      ports:
        - protocol: TCP
          port: 5432
```

### Modifying Resource Limits

Override resource limits for all containers without modifying chart values:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

helmCharts:
  - name: my-app
    repo: https://charts.myorg.com
    version: 1.5.0
    releaseName: my-app

patches:
  - target:
      kind: Deployment
      name: my-app
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources/limits/memory
        value: "2Gi"
      - op: replace
        path: /spec/template/spec/containers/0/resources/limits/cpu
        value: "2000m"
```

### Adding Image Pull Secrets

If your cluster requires image pull secrets that the chart does not support:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

helmCharts:
  - name: my-app
    repo: https://charts.myorg.com
    version: 1.5.0
    releaseName: my-app

patches:
  - target:
      kind: Deployment
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: unused
      spec:
        template:
          spec:
            imagePullSecrets:
              - name: registry-credentials
```

## Using the Config Management Plugin Alternative

For more complex post-rendering that Kustomize cannot handle, you can use an ArgoCD Config Management Plugin (CMP):

```yaml
# configmap for CMP
apiVersion: v1
kind: ConfigMap
metadata:
  name: helm-post-render-plugin
  namespace: argocd
data:
  plugin.yaml: |
    apiVersion: argoproj.io/v1alpha1
    kind: ConfigManagementPlugin
    metadata:
      name: helm-post-render
    spec:
      generate:
        command: ["/bin/sh", "-c"]
        args:
          - |
            helm template $ARGOCD_APP_NAME . \
              --namespace $ARGOCD_APP_NAMESPACE \
              -f values.yaml | \
            yq eval '.metadata.labels.team = "platform"' -
```

Then reference it in your Application:

```yaml
spec:
  source:
    plugin:
      name: helm-post-render
```

## Testing Post-Rendered Output

Before deploying, verify the post-rendered output:

```bash
# Preview what ArgoCD will render
argocd app manifests my-app

# Or test locally with kustomize
kustomize build --enable-helm my-app/

# Diff against the live cluster
argocd app diff my-app
```

## Summary

Helm post-renderers in ArgoCD let you transform chart output without forking charts. Use Kustomize as a post-renderer to add labels, inject sidecars, apply patches, and add supplementary resources. Create a `kustomization.yaml` that uses `helmCharts` as a base and apply your transformations on top. For advanced transformations beyond Kustomize's capabilities, consider Config Management Plugins. This approach keeps your charts clean and reusable while allowing organization-specific customizations at the deployment layer.
