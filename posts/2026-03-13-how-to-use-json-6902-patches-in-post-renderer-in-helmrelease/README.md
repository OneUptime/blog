# How to Use JSON 6902 Patches in Post-Renderer in HelmRelease

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, HelmRelease, Kubernetes, GitOps, Helm, Post-Renderer, JSON Patch, RFC 6902

Description: Learn how to use JSON 6902 patches in Flux HelmRelease post-renderers to precisely modify Helm chart output.

---

## Introduction

JSON Patch, defined in RFC 6902, provides a way to describe modifications to a JSON document using a sequence of operations. In the context of Flux HelmRelease post-renderers, JSON 6902 patches allow you to make precise, targeted changes to the Kubernetes resources produced by a Helm chart without modifying the chart itself.

Unlike strategic merge patches, which require you to specify the full path structure of the resource, JSON 6902 patches use explicit operations like add, remove, replace, move, copy, and test. This makes them ideal for modifying arrays, removing specific fields, or making changes that strategic merge patches cannot express.

This guide demonstrates how to configure JSON 6902 patches in Flux HelmRelease post-renderers.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster with Flux CD installed (v2.0 or later)
- A HelmRelease deployed through Flux
- kubectl access to the cluster
- Familiarity with JSON Patch operations (RFC 6902)

## Basic JSON 6902 Patch Structure

In a Flux HelmRelease, JSON 6902 patches are configured under `spec.postRenderers` using the `kustomize.patches` field with the `patch` specified in JSON patch format:

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
              - op: replace
                path: /spec/replicas
                value: 5
```

This patch replaces the replica count on the Deployment named `my-app` with the value 5.

## Supported JSON Patch Operations

JSON 6902 supports six operations. Here are examples of each within a HelmRelease post-renderer context.

### Add Operation

The add operation inserts a new value at the specified path:

```yaml
postRenderers:
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
```

Note that forward slashes in field names must be escaped as `~1` in JSON Patch paths. So `prometheus.io/scrape` becomes `prometheus.io~1scrape`.

### Replace Operation

The replace operation updates an existing value:

```yaml
postRenderers:
  - kustomize:
      patches:
        - target:
            kind: Deployment
            name: my-app
          patch: |
            - op: replace
              path: /spec/template/spec/containers/0/image
              value: myregistry.io/my-app:v2.0.0
```

This replaces the image of the first container (index 0) in the pod spec.

### Remove Operation

The remove operation deletes a field or array element:

```yaml
postRenderers:
  - kustomize:
      patches:
        - target:
            kind: Deployment
            name: my-app
          patch: |
            - op: remove
              path: /spec/template/spec/containers/0/resources/limits/cpu
```

This removes the CPU resource limit from the first container.

## Targeting Resources with Selectors

JSON 6902 patches in Flux post-renderers use target selectors to identify which resources to patch. You can target by kind, name, namespace, group, version, and label selectors:

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
              value: ClusterIP
        - target:
            kind: Deployment
            labelSelector: "app=my-app"
          patch: |
            - op: replace
              path: /spec/replicas
              value: 3
```

The `labelSelector` field allows you to match resources based on their labels rather than their exact name.

## Modifying Arrays

One of the key advantages of JSON 6902 patches is precise array manipulation. You can add elements at specific positions, replace elements by index, or append to arrays:

```yaml
postRenderers:
  - kustomize:
      patches:
        - target:
            kind: Deployment
            name: my-app
          patch: |
            - op: add
              path: /spec/template/spec/containers/0/env/-
              value:
                name: LOG_LEVEL
                value: "info"
            - op: add
              path: /spec/template/spec/containers/0/env/-
              value:
                name: ENVIRONMENT
                value: "production"
```

The `-` at the end of the path (`/env/-`) appends the new element to the end of the array.

## Adding Volume Mounts and Volumes

A common use case is adding volumes and volume mounts to containers produced by a Helm chart:

```yaml
postRenderers:
  - kustomize:
      patches:
        - target:
            kind: Deployment
            name: my-app
          patch: |
            - op: add
              path: /spec/template/spec/volumes/-
              value:
                name: custom-config
                configMap:
                  name: my-app-custom-config
            - op: add
              path: /spec/template/spec/containers/0/volumeMounts/-
              value:
                name: custom-config
                mountPath: /etc/custom-config
                readOnly: true
```

## Modifying Resource Requests and Limits

Override the resource configuration for containers:

```yaml
postRenderers:
  - kustomize:
      patches:
        - target:
            kind: Deployment
            name: my-app
          patch: |
            - op: replace
              path: /spec/template/spec/containers/0/resources
              value:
                requests:
                  cpu: 500m
                  memory: 512Mi
                limits:
                  cpu: "1"
                  memory: 1Gi
```

## Multiple Patches on Different Resources

You can apply different patches to different resources in the same HelmRelease:

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
              - op: replace
                path: /spec/replicas
                value: 3
              - op: add
                path: /spec/template/spec/containers/0/env/-
                value:
                  name: REGION
                  value: us-east-1
          - target:
              kind: Service
              name: my-app
            patch: |
              - op: add
                path: /metadata/annotations
                value:
                  service.beta.kubernetes.io/aws-load-balancer-type: nlb
          - target:
              kind: Ingress
              name: my-app
            patch: |
              - op: replace
                path: /spec/rules/0/host
                value: app.production.example.com
```

## Conditional Patching with Test Operation

The test operation verifies that a value matches before proceeding with subsequent operations. If the test fails, the entire patch is rejected:

```yaml
postRenderers:
  - kustomize:
      patches:
        - target:
            kind: Deployment
            name: my-app
          patch: |
            - op: test
              path: /spec/template/spec/containers/0/name
              value: app
            - op: replace
              path: /spec/template/spec/containers/0/image
              value: myregistry.io/my-app:v2.0.0
```

This ensures the patch only modifies the container if its name is "app", preventing accidental changes if the chart restructures its containers.

## Troubleshooting

If a JSON 6902 patch fails, Flux reports the error in the HelmRelease status. Common issues include referencing paths that do not exist (use add instead of replace for new fields), incorrect array indices, and missing escape sequences for special characters in paths.

Check the HelmRelease status for patch errors:

```bash
kubectl describe helmrelease my-app -n default
flux get helmreleases -n default
```

## Conclusion

JSON 6902 patches in Flux HelmRelease post-renderers provide precise control over Helm chart output. They excel at array manipulation, field removal, and conditional patching through the test operation. Use them when strategic merge patches cannot express the modifications you need, or when you need to target specific array elements by index. Combined with flexible target selectors, JSON 6902 patches allow you to customize any Helm chart without forking or modifying the upstream source.
