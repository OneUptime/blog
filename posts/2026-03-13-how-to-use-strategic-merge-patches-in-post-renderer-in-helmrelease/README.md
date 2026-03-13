# How to Use Strategic Merge Patches in Post-Renderer in HelmRelease

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, HelmRelease, Kubernetes, GitOps, Helm, Post-Renderer, Strategic Merge Patch, Kustomize

Description: Learn how to use strategic merge patches in Flux HelmRelease post-renderers to customize Helm chart resources without modifying the chart.

---

## Introduction

Strategic merge patches are a Kubernetes-native way to modify resources by specifying only the fields you want to change. Unlike JSON merge patches, strategic merge patches understand Kubernetes resource schemas and can intelligently merge arrays instead of replacing them entirely. This makes them ideal for adding items to lists like containers, volumes, or environment variables without overwriting existing entries.

In Flux HelmRelease post-renderers, strategic merge patches let you customize the output of a Helm chart after it has been rendered. This is useful when a chart does not expose every configuration option you need through its values, or when you need to add organization-specific metadata, security settings, or resource modifications.

This guide demonstrates how to configure and use strategic merge patches in Flux HelmRelease post-renderers.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster with Flux CD installed (v2.0 or later)
- A HelmRelease deployed through Flux
- kubectl access to the cluster
- Understanding of Kubernetes resource structure

## Basic Strategic Merge Patch

Strategic merge patches are configured under `spec.postRenderers` in a HelmRelease. Use the `kustomize.patchesStrategicMerge` field:

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
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system
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
                    - name: app
                      resources:
                        requests:
                          cpu: 500m
                          memory: 512Mi
                        limits:
                          cpu: "1"
                          memory: 1Gi
```

This patch modifies the resource requests and limits for the container named `app` in the Deployment `my-app`. The container name acts as the merge key, so only the matching container is modified.

## Using the patches Field

Flux also supports the `kustomize.patches` field, which provides a more flexible syntax with target selectors:

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
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-charts
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
                      - name: app
                        resources:
                          requests:
                            cpu: 500m
                            memory: 512Mi
```

## Adding Labels and Annotations

Add labels or annotations to resources produced by the Helm chart:

```yaml
postRenderers:
  - kustomize:
      patchesStrategicMerge:
        - apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: my-app
            labels:
              team: platform
              cost-center: engineering
            annotations:
              app.kubernetes.io/managed-by: flux
              monitoring.example.com/enabled: "true"
```

## Adding Environment Variables

Strategic merge patches merge arrays by the merge key. For containers, the merge key is `name`. This lets you add environment variables to an existing container without removing existing ones:

```yaml
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
                  - name: app
                    env:
                      - name: CUSTOM_CONFIG_PATH
                        value: /etc/custom/config.yaml
                      - name: METRICS_PORT
                        value: "9090"
```

This adds the two environment variables to the container named `app` while preserving any existing environment variables defined by the Helm chart.

## Adding Volumes and Volume Mounts

A common use case is adding volumes for custom configuration files or secrets:

```yaml
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
                  - name: app
                    volumeMounts:
                      - name: custom-tls
                        mountPath: /etc/tls
                        readOnly: true
                volumes:
                  - name: custom-tls
                    secret:
                      secretName: my-app-tls
```

## Adding Pod-Level Configuration

Modify pod-level settings like service accounts, node selectors, and tolerations:

```yaml
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
                serviceAccountName: my-app-sa
                nodeSelector:
                  node-type: compute-optimized
                tolerations:
                  - key: dedicated
                    operator: Equal
                    value: compute
                    effect: NoSchedule
```

## Patching Multiple Resources

Apply patches to different resource types in the same HelmRelease:

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
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system
  postRenderers:
    - kustomize:
        patchesStrategicMerge:
          - apiVersion: apps/v1
            kind: Deployment
            metadata:
              name: my-app
            spec:
              replicas: 5
              template:
                spec:
                  containers:
                    - name: app
                      resources:
                        requests:
                          cpu: 500m
                          memory: 512Mi
          - apiVersion: v1
            kind: Service
            metadata:
              name: my-app
              annotations:
                service.beta.kubernetes.io/aws-load-balancer-type: nlb
          - apiVersion: v1
            kind: ConfigMap
            metadata:
              name: my-app-config
            data:
              custom-key: custom-value
```

## Adding Sidecar Containers

Strategic merge patches can add sidecar containers to a pod spec. Because the merge key for containers is the `name` field, new containers with unique names are appended:

```yaml
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
                  - name: log-shipper
                    image: fluent/fluent-bit:latest
                    volumeMounts:
                      - name: shared-logs
                        mountPath: /var/log/app
                volumes:
                  - name: shared-logs
                    emptyDir: {}
```

This adds a `log-shipper` sidecar container alongside whatever containers the Helm chart already defines.

## Adding Init Containers

Similarly, you can add init containers:

```yaml
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
                initContainers:
                  - name: wait-for-db
                    image: busybox:1.36
                    command:
                      - sh
                      - -c
                      - "until nc -z postgres-svc 5432; do sleep 2; done"
```

## Troubleshooting

If your strategic merge patch is not being applied, check the HelmRelease status:

```bash
kubectl describe helmrelease my-app -n default
flux get helmreleases -n default
```

Common issues include mismatched resource names (the patch name must match the rendered resource name), incorrect apiVersion or kind, and trying to patch resources that the Helm chart does not create.

To see what resources the Helm chart produces, you can template it locally:

```bash
helm template my-app my-charts/my-app --version 1.0.0
```

## Conclusion

Strategic merge patches in Flux HelmRelease post-renderers provide a natural way to customize Helm chart output using Kubernetes-native merge semantics. Their ability to intelligently merge arrays by merge key makes them particularly useful for adding containers, environment variables, volumes, and other list-based configurations without overwriting existing entries. Use strategic merge patches when you need to layer additional configuration on top of a Helm chart while preserving the chart's default settings.
