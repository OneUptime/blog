# How to Use Kustomize Post-Renderer with HelmRelease in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, HelmRelease, Kustomize, Post-Renderers, Kubernetes, GitOps

Description: Learn how to use Kustomize as a post-renderer in Flux HelmRelease to customize Helm chart output without modifying the chart itself.

---

## Introduction

Helm charts provide a standard way to package and deploy Kubernetes applications, but they cannot always expose every configuration option you need. Kustomize post-rendering in Flux solves this problem by letting you apply Kustomize patches to the rendered Helm output before it is applied to the cluster. This means you can modify any aspect of the Helm chart's output without forking the chart or waiting for upstream changes.

In this post, you will learn how Flux's built-in Kustomize post-renderer works, how to configure it in a HelmRelease, and how to use patches to customize chart output for your environment.

## Prerequisites

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped on the cluster
- A Git repository connected to Flux
- kubectl configured to access the cluster
- Basic familiarity with both Helm and Kustomize

## How Post-Rendering Works in Flux

When Flux reconciles a HelmRelease, it goes through these steps:

1. Fetches the Helm chart from the source.
2. Renders the chart templates with the provided values.
3. Passes the rendered manifests through the post-renderer (if configured).
4. Applies the post-rendered manifests to the cluster.

Flux has built-in support for Kustomize as a post-renderer through the `spec.postRenderers` field. Unlike the standard Helm post-renderer which requires an external binary, Flux's implementation is declarative and configured directly in the HelmRelease manifest.

## Basic Post-Renderer Configuration

Here is a simple example that adds a label to all resources rendered by a Helm chart:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 30m
  chart:
    spec:
      chart: my-app
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  postRenderers:
    - kustomize:
        patches:
          - target:
              kind: Deployment
            patch: |
              - op: add
                path: /metadata/labels/environment
                value: production
```

The `postRenderers` field accepts a list of post-renderers, each with a `kustomize` configuration. The `patches` field supports both JSON 6902 patches (as shown above) and strategic merge patches.

## Using Strategic Merge Patches

Strategic merge patches are often easier to read and write than JSON 6902 patches. Here is an example that adds resource limits to all Deployments:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 30m
  chart:
    spec:
      chart: my-app
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  postRenderers:
    - kustomize:
        patches:
          - target:
              kind: Deployment
              name: my-app
            patch: |
              apiVersion: apps/v1
              kind: Deployment
              metadata:
                name: my-app
              spec:
                template:
                  spec:
                    containers:
                      - name: my-app
                        resources:
                          limits:
                            cpu: "1"
                            memory: 512Mi
                          requests:
                            cpu: 100m
                            memory: 128Mi
```

## Adding Common Labels and Annotations

One of the most common use cases for post-rendering is adding labels or annotations that the chart does not support as values:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx
  namespace: web
spec:
  interval: 30m
  chart:
    spec:
      chart: nginx
      version: "15.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  postRenderers:
    - kustomize:
        commonLabels:
          team: platform
          cost-center: engineering
        commonAnnotations:
          company.example.com/managed-by: flux
```

The `commonLabels` and `commonAnnotations` fields in the Kustomize post-renderer apply to every resource in the chart output, including Deployments, Services, ConfigMaps, and any other resources.

## Targeting Specific Resources

You can target patches to specific resources using the `target` field:

```yaml
postRenderers:
  - kustomize:
      patches:
        - target:
            kind: Service
            name: my-app
          patch: |
            - op: replace
              path: /spec/type
              value: LoadBalancer
        - target:
            kind: Deployment
            name: my-app
          patch: |
            - op: replace
              path: /spec/replicas
              value: 5
```

The `target` field supports filtering by:

- `kind`: The resource kind (Deployment, Service, ConfigMap, etc.)
- `name`: The resource name
- `namespace`: The resource namespace
- `group`: The API group
- `version`: The API version
- `annotationSelector`: Match by annotations
- `labelSelector`: Match by labels

## Using Images Override

The Kustomize post-renderer also supports the `images` field for changing container images:

```yaml
postRenderers:
  - kustomize:
      images:
        - name: nginx
          newName: registry.example.com/nginx
          newTag: "1.25-custom"
        - name: busybox
          newName: registry.example.com/busybox
          digest: sha256:abcdef1234567890
```

This is particularly useful when you need to pull images from a private registry instead of the public one specified in the chart.

## Combining Multiple Patch Types

You can combine different patch types in a single post-renderer:

```yaml
postRenderers:
  - kustomize:
      commonLabels:
        app.kubernetes.io/part-of: my-platform
      commonAnnotations:
        prometheus.io/scrape: "true"
      patches:
        - target:
            kind: Deployment
          patch: |
            - op: add
              path: /spec/template/spec/tolerations
              value:
                - key: dedicated
                  operator: Equal
                  value: app
                  effect: NoSchedule
      images:
        - name: my-app
          newName: registry.example.com/my-app
          newTag: v2.0.0
```

## Debugging Post-Renderer Output

To see what the post-renderer produces, you can use the Flux CLI:

```bash
flux reconcile helmrelease my-app -n default
```

Check the HelmRelease status for any errors from the post-rendering step:

```bash
kubectl get helmrelease my-app -n default -o jsonpath='{.status.conditions[?(@.type=="Ready")].message}'
```

If the post-renderer produces invalid manifests, the HelmRelease will report the error in its conditions.

## Conclusion

Kustomize post-rendering in Flux HelmRelease is a powerful tool for customizing Helm chart output without modifying the chart itself. It supports common labels and annotations, strategic merge patches, JSON 6902 patches, and image overrides. By applying transformations after Helm renders the templates, you can adapt any chart to your organization's requirements while keeping the chart itself unmodified. This approach is especially valuable when using third-party charts where you cannot control the available values, or when you need to enforce organization-wide standards across all deployments.
