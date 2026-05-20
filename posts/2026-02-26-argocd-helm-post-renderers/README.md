# How to Use Helm Post-Renderers with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Kustomize

Description: Learn how to use Helm post-renderers in ArgoCD to transform rendered Helm output with Kustomize patches, labels, and other modifications.

---

Helm post-renderers let you modify the rendered Helm output before it gets applied to the cluster. This is incredibly useful when you need to add labels, annotations, patches, or other modifications to a chart's resources without forking the chart. ArgoCD's native Helm source does not expose Helm's `--post-renderer` flag, but it can render Helm charts through Kustomize when Helm support is enabled for Kustomize, which covers many of the same use cases.

This guide explains how to use Kustomize to transform Helm-rendered resources in ArgoCD, with practical examples for common transformation scenarios.

## What is a Post-Renderer

In standard Helm usage, a post-renderer is an executable that receives rendered YAML on stdin and outputs modified YAML on stdout:

```bash
# Standard Helm post-renderer usage (outside ArgoCD)

helm install my-app ./chart --post-renderer ./my-transform.sh
```

ArgoCD does not expose Helm's arbitrary post-renderer executables through the native Helm application source. Instead, use a Kustomize application with Helm chart inflation enabled, which lets you apply patches, add labels, modify resources, and more.

## Enabling Kustomize Post-Rendering in ArgoCD

To use Kustomize for this workflow, create a `kustomization.yaml` file alongside your Helm values and configure ArgoCD to run `kustomize build --enable-helm`. ArgoCD's Kustomize options do not include `--enable-helm` per application, so enable it globally in `argocd-cm` or implement the build through a Config Management Plugin.

### Method 1: Enable Helm Support for Kustomize

Configure ArgoCD's repo server to pass the Helm flag to Kustomize:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  kustomize.buildOptions: --enable-helm
```

Then keep the Helm chart configuration and Kustomize patches in the same Kustomize application path:

```text
# Repository structure
my-app/
  kustomization.yaml
  values.yaml
  patches/
    add-labels.yaml
    add-sidecar.yaml
```

ArgoCD will detect the `kustomization.yaml` and render the application with Kustomize.

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
labels:
  - pairs:
      team: platform
      cost-center: engineering
    includeSelectors: false

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

# These labels will be added to resource metadata
labels:
  - pairs:
      app.kubernetes.io/managed-by: argocd
      app.kubernetes.io/part-of: web-platform
      team: web-team
      environment: production
    includeSelectors: false

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
        name: unused
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

Override resource limits for a specific container without modifying chart values:

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
      - op: add
        path: /spec/template/spec/imagePullSecrets
        value:
          - name: registry-credentials
```

## Using the Config Management Plugin Alternative

For more complex post-rendering that Kustomize cannot handle, you can use an ArgoCD Config Management Plugin (CMP). The plugin configuration is stored in a ConfigMap and mounted into a repo-server sidecar at `/home/argocd/cmp-server/config/plugin.yaml`:

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
            set -o pipefail
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

Kustomize with Helm chart inflation in ArgoCD lets you transform chart output without forking charts. Use Kustomize to add labels, inject sidecars, apply patches, and add supplementary resources. Create a `kustomization.yaml` that uses `helmCharts` as a base and apply your transformations on top. For advanced transformations beyond Kustomize's capabilities, consider Config Management Plugins. This approach keeps your charts clean and reusable while allowing organization-specific customizations at the deployment layer.
