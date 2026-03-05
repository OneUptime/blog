# How to Use HelmRelease with JSON 6902 Patches in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, JSON Patch, RFC 6902, Post Rendering, Kustomize

Description: Learn how to apply JSON 6902 (RFC 6902) patches to HelmRelease post-rendered manifests in Flux CD for precise, operation-based modifications.

---

When you need precise control over modifications to Helm chart output in Flux CD, JSON 6902 patches (defined in RFC 6902) offer operation-based patching. Unlike JSON Merge Patches, which describe the desired state, JSON 6902 patches define explicit operations such as add, remove, replace, move, copy, and test. Flux supports these through the `spec.postRenderers[].kustomize.patchesJson6902` field on a HelmRelease.

## JSON 6902 vs JSON Merge Patches

JSON 6902 patches use an array of operations, each specifying an `op`, a `path`, and optionally a `value`. This approach is more verbose but provides capabilities that merge patches cannot, such as:

- Adding elements to a specific index in an array
- Removing fields without setting them to `null`
- Testing that a value exists before modifying it
- Moving or copying values between paths

## Prerequisites

- Kubernetes cluster with Flux CD v2.x or later
- A HelmRepository source configured
- `kubectl` and `flux` CLI tools

## Understanding the patchesJson6902 Structure

In Flux HelmRelease v2, JSON 6902 patches are configured under the post-renderers section. Each entry targets a specific resource and provides an array of patch operations:

```yaml
# Structure of patchesJson6902 in a HelmRelease post-renderer
postRenderers:
  - kustomize:
      patchesJson6902:
        - target:
            group: apps          # API group of the target resource
            version: v1          # API version
            kind: Deployment     # Resource kind
            name: my-app         # Resource name
          patch:
            - op: replace        # Operation: add, remove, replace, move, copy, test
              path: /spec/replicas
              value: 3
```

## Basic Example: Replacing a Value

Here is a complete HelmRelease that uses a JSON 6902 patch to change the replica count of a Deployment:

```yaml
# HelmRelease with JSON 6902 patch to set replica count
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
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  postRenderers:
    - kustomize:
        patchesJson6902:
          - target:
              group: apps
              version: v1
              kind: Deployment
              name: my-app
            patch:
              - op: replace
                path: /spec/replicas
                value: 5
```

## Adding Labels and Annotations

The `add` operation inserts new values. When adding to a map that may not exist, you may need to add the parent path first:

```yaml
# Add labels and annotations to a Deployment using JSON 6902 patches
postRenderers:
  - kustomize:
      patchesJson6902:
        - target:
            group: apps
            version: v1
            kind: Deployment
            name: my-app
          patch:
            # Add a new label
            - op: add
              path: /metadata/labels/team
              value: platform
            # Add a new annotation
            - op: add
              path: /metadata/annotations/managed-by
              value: flux-cd
```

## Removing a Field

The `remove` operation deletes a field at the specified path:

```yaml
# Remove an annotation from a Service
postRenderers:
  - kustomize:
      patchesJson6902:
        - target:
            version: v1
            kind: Service
            name: my-app
          patch:
            - op: remove
              path: /metadata/annotations/deprecated-key
```

## Working with Arrays

JSON 6902 patches handle arrays by index, which is useful when you need to modify specific containers in a Pod spec:

```yaml
# Modify the first container's image and add an environment variable
postRenderers:
  - kustomize:
      patchesJson6902:
        - target:
            group: apps
            version: v1
            kind: Deployment
            name: my-app
          patch:
            # Replace the image of the first container (index 0)
            - op: replace
              path: /spec/template/spec/containers/0/image
              value: my-registry/my-app:v2.0.0
            # Add a new environment variable to the first container
            - op: add
              path: /spec/template/spec/containers/0/env/-
              value:
                name: LOG_LEVEL
                value: "debug"
```

The `/-` syntax appends to the end of an array, while `/0` targets the first element.

## Using the Test Operation

The `test` operation verifies that a value exists before applying subsequent operations. If the test fails, the entire patch is rejected:

```yaml
# Test that a field exists before replacing it
postRenderers:
  - kustomize:
      patchesJson6902:
        - target:
            group: apps
            version: v1
            kind: Deployment
            name: my-app
          patch:
            # Verify the current image before replacing
            - op: test
              path: /spec/template/spec/containers/0/image
              value: my-registry/my-app:v1.0.0
            # Only runs if the test above passes
            - op: replace
              path: /spec/template/spec/containers/0/image
              value: my-registry/my-app:v2.0.0
```

## Patching Multiple Resources

You can target different resources within the same post-renderer:

```yaml
# Patch both a Deployment and a ConfigMap
postRenderers:
  - kustomize:
      patchesJson6902:
        - target:
            group: apps
            version: v1
            kind: Deployment
            name: my-app
          patch:
            - op: replace
              path: /spec/replicas
              value: 3
        - target:
            version: v1
            kind: ConfigMap
            name: my-app-config
          patch:
            - op: add
              path: /data/FEATURE_FLAG
              value: "enabled"
```

## Combining JSON 6902 with Merge Patches

You can use both `patches` (merge patches) and `patchesJson6902` in the same post-renderer:

```yaml
# Use both patch types together
postRenderers:
  - kustomize:
      # JSON Merge Patches for simple additions
      patches:
        - target:
            kind: Deployment
            name: my-app
          patch: |
            apiVersion: apps/v1
            kind: Deployment
            metadata:
              name: my-app
              labels:
                environment: staging
      # JSON 6902 for precise operations
      patchesJson6902:
        - target:
            group: apps
            version: v1
            kind: Deployment
            name: my-app
          patch:
            - op: add
              path: /spec/template/spec/containers/0/env/-
              value:
                name: REGION
                value: "us-east-1"
```

## Verifying Patches

After applying your HelmRelease, confirm the patches took effect:

```bash
# Check the HelmRelease status for any errors
flux get helmrelease my-app

# Inspect the patched resource
kubectl get deployment my-app -o jsonpath='{.spec.replicas}'

# View detailed conditions on the HelmRelease
kubectl describe helmrelease my-app -n default
```

## Troubleshooting Common Errors

If your JSON 6902 patch fails, check these common issues:

1. **Invalid path**: The JSON Pointer path must exactly match the resource structure. Use `kubectl get <resource> -o json` to verify field paths.
2. **Missing parent path**: You cannot add `/metadata/annotations/key` if `/metadata/annotations` does not exist. Add the parent map first.
3. **Wrong array index**: Container indices start at 0. Verify the correct index with `kubectl get deployment -o json`.
4. **Test operation failure**: If a `test` operation fails, the entire patch set is rejected. Verify the expected value matches the rendered output.

## Best Practices

- Use JSON 6902 patches when you need array manipulation or conditional logic via `test` operations.
- Use JSON Merge Patches for simpler key-value additions and replacements.
- Always specify the full target selector including `group`, `version`, `kind`, and `name`.
- Keep patch operations ordered logically -- place `test` operations before their dependent `replace` or `remove` operations.

## Conclusion

JSON 6902 patches in Flux post-renderers provide operation-level precision for modifying Helm chart output. By using `spec.postRenderers[].kustomize.patchesJson6902`, you can add, remove, replace, test, move, and copy fields in rendered manifests. This is especially valuable when working with arrays or when you need to conditionally apply changes based on existing values.
