# How to Chain Multiple Post-Renderers in HelmRelease

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, helm, helmrelease, post-renderers, gitops, kubernetes

Description: Learn how to chain multiple post-renderers in a Flux HelmRelease to apply sequential transformations to your Helm chart output before deployment.

---

## Introduction

When deploying Helm charts through Flux, you sometimes need to modify the rendered manifests before they are applied to your cluster. Post-renderers allow you to intercept the Helm template output and transform it. Chaining multiple post-renderers gives you the ability to apply several transformations in sequence, such as injecting labels, patching resources, or adding sidecar containers.

This guide walks you through configuring multiple post-renderers in a Flux HelmRelease resource using Kustomize patches. You will learn how each post-renderer processes the output of the previous one, giving you fine-grained control over your deployment manifests.

## Prerequisites

- A Kubernetes cluster with Flux installed (v2.x or later)
- The Helm Controller component running in your cluster
- Familiarity with HelmRelease custom resources
- Basic understanding of Kustomize patches and strategic merge patches

## Understanding Post-Renderers

Post-renderers in Flux HelmRelease work as a pipeline. The rendered Helm chart output passes through each post-renderer in order. The output of the first post-renderer becomes the input for the second, and so on. Flux supports Kustomize as a built-in post-renderer type, which makes it straightforward to apply patches, add labels, or overlay configurations.

## Configuring a Single Post-Renderer

Before chaining multiple post-renderers, here is how a single Kustomize post-renderer looks:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "1.2.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
  postRenderers:
    - kustomize:
        patches:
          - target:
              kind: Deployment
              name: my-app
            patch: |
              - op: add
                path: /metadata/labels/team
                value: platform
```

This configuration adds a `team: platform` label to the Deployment named `my-app` after Helm renders the chart.

## Chaining Multiple Post-Renderers

To chain multiple post-renderers, you add additional entries to the `postRenderers` array. Each entry processes the output from the previous stage:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "1.2.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
  postRenderers:
    - kustomize:
        patches:
          - target:
              kind: Deployment
              name: my-app
            patch: |
              - op: add
                path: /metadata/labels/team
                value: platform
    - kustomize:
        patches:
          - target:
              kind: Deployment
              name: my-app
            patch: |
              - op: add
                path: /spec/template/metadata/annotations/prometheus.io~1scrape
                value: "true"
              - op: add
                path: /spec/template/metadata/annotations/prometheus.io~1port
                value: "8080"
    - kustomize:
        patchesStrategicMerge:
          - apiVersion: apps/v1
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
                          memory: "512Mi"
                          cpu: "500m"
                        requests:
                          memory: "256Mi"
                          cpu: "250m"
```

In this example, three post-renderers run in sequence. The first adds a team label. The second adds Prometheus scraping annotations. The third sets resource limits and requests using a strategic merge patch.

## Using Post-Renderers with Images and Common Labels

A common use case is combining image overrides with common labels across all resources:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
  postRenderers:
    - kustomize:
        images:
          - name: my-app
            newName: registry.example.com/my-app
            newTag: v2.0.1
    - kustomize:
        patches:
          - target:
              kind: Deployment
            patch: |
              - op: add
                path: /metadata/labels/environment
                value: production
              - op: add
                path: /metadata/labels/managed-by
                value: flux
          - target:
              kind: Service
            patch: |
              - op: add
                path: /metadata/labels/environment
                value: production
              - op: add
                path: /metadata/labels/managed-by
                value: flux
```

The first post-renderer overrides the container image to point at a private registry with a specific tag. The second post-renderer adds environment and management labels to all Deployments and Services.

## Adding Sidecar Containers with Post-Renderers

You can use a strategic merge patch in a post-renderer to inject sidecar containers:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "1.5.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
  postRenderers:
    - kustomize:
        patchesStrategicMerge:
          - apiVersion: apps/v1
            kind: Deployment
            metadata:
              name: my-app
            spec:
              template:
                spec:
                  containers:
                    - name: log-forwarder
                      image: fluent/fluent-bit:latest
                      volumeMounts:
                        - name: shared-logs
                          mountPath: /var/log/app
                  volumes:
                    - name: shared-logs
                      emptyDir: {}
    - kustomize:
        patches:
          - target:
              kind: Deployment
              name: my-app
            patch: |
              - op: add
                path: /metadata/annotations/sidecar-injected
                value: "true"
```

## Troubleshooting

If your chained post-renderers are not producing the expected results, check the following. First, verify the order of your post-renderers. Each one receives the output from the previous stage, so ordering matters. Second, use `flux get helmrelease my-app` to check the status and see if any post-renderer is failing. Third, ensure that your JSON patch paths are correct and that the target resources exist in the Helm output. The tilde encoding `~1` is required for forward slashes in annotation keys.

You can also suspend the HelmRelease and manually render the chart to inspect what Helm produces before post-renderers run:

```bash
helm template my-app my-repo/my-app --version 1.2.0
```

## Conclusion

Chaining multiple post-renderers in a Flux HelmRelease gives you a powerful pipeline for transforming Helm chart output before it reaches your cluster. By combining JSON patches, strategic merge patches, image overrides, and label injection, you can customize third-party charts without forking them. Each post-renderer in the chain processes the output of the previous one, making the system composable and maintainable. Start with simple label additions and work your way up to more complex transformations like sidecar injection as your needs grow.
