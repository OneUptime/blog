# How to Configure Kustomization JSON Patches in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Kustomize, JSON Patch, RFC 6902, Patches

Description: Learn how to use JSON patches (RFC 6902) in Flux Kustomization resources for precise, operation-based modifications to Kubernetes manifests.

---

## Introduction

While strategic merge patches are the default way to modify resources in Flux, there are situations where you need more precise control. JSON patches, defined by RFC 6902, use explicit operations (add, remove, replace, move, copy, test) to modify specific fields at exact paths. This makes them ideal for scenarios where strategic merge patches fall short, such as modifying list items by index, removing specific fields, or making changes that require exact positioning. This guide covers how to use JSON patches in Flux Kustomizations.

## JSON Patch vs Strategic Merge Patch

| Feature | Strategic Merge Patch | JSON Patch |
|---|---|---|
| Format | Partial YAML document | Array of operations |
| List handling | Merge by key | Access by index |
| Field removal | Set to null | Explicit remove operation |
| Precision | Field-level | Path-level |
| Readability | Looks like the resource | Explicit operations |

Use JSON patches when you need:
- To modify list items by their position (index)
- To perform operations that strategic merge patches cannot express
- Explicit add, remove, or replace operations with no ambiguity

## JSON Patch Format

A JSON patch is an array of operations. Each operation has:
- `op`: The operation type (add, remove, replace, move, copy, test)
- `path`: A JSON Pointer (RFC 6901) to the target field
- `value`: The new value (for add, replace, and test operations)

## Using JSON Patches in Flux

To use a JSON patch in `spec.patches`, format the `patch` field as a JSON array of operations (written in YAML).

```yaml
# kustomization-json-patch.yaml - JSON patch to change replicas
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy
  prune: true
  patches:
    # JSON patch using an array of operations
    - patch: |
        - op: replace
          path: /spec/replicas
          value: 5
      target:
        kind: Deployment
        name: web-app
```

## Common Operations

### Replace a Value

The `replace` operation changes an existing field's value. The field must already exist.

```yaml
# Replace the container image
patches:
  - patch: |
      - op: replace
        path: /spec/template/spec/containers/0/image
        value: nginx:1.26
    target:
      kind: Deployment
      name: web-app
```

Note the `/0` in the path, which refers to the first item in the `containers` array (zero-indexed).

### Add a Value

The `add` operation inserts a new value. For objects, it adds a new key. For arrays, it inserts at the specified index.

```yaml
# Add a new annotation
patches:
  - patch: |
      - op: add
        path: /metadata/annotations/prometheus.io~1scrape
        value: "true"
    target:
      kind: Deployment
      name: web-app
```

Note that forward slashes in key names must be escaped as `~1` in JSON Pointer syntax. The tilde character is escaped as `~0`.

### Add an Environment Variable

```yaml
# Add an environment variable to the first container
patches:
  - patch: |
      - op: add
        path: /spec/template/spec/containers/0/env/-
        value:
          name: LOG_LEVEL
          value: debug
    target:
      kind: Deployment
      name: web-app
```

The `/-` at the end of the path means "append to the end of the array."

### Remove a Value

The `remove` operation deletes a field or array element.

```yaml
# Remove an annotation
patches:
  - patch: |
      - op: remove
        path: /metadata/annotations/deprecated-key
    target:
      kind: Deployment
      name: web-app
```

### Remove a Container by Index

```yaml
# Remove the second container (index 1)
patches:
  - patch: |
      - op: remove
        path: /spec/template/spec/containers/1
    target:
      kind: Deployment
      name: web-app
```

## Multiple Operations in One Patch

You can chain multiple operations in a single patch. They are applied in order.

```yaml
# kustomization-multi-ops.yaml - Multiple JSON patch operations
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy
  prune: true
  patches:
    - patch: |
        # Operation 1: Change replicas
        - op: replace
          path: /spec/replicas
          value: 3
        # Operation 2: Update the image
        - op: replace
          path: /spec/template/spec/containers/0/image
          value: myregistry.io/app:v2.0
        # Operation 3: Add a resource limit
        - op: add
          path: /spec/template/spec/containers/0/resources
          value:
            limits:
              cpu: "1"
              memory: 512Mi
            requests:
              cpu: 250m
              memory: 256Mi
        # Operation 4: Add a label
        - op: add
          path: /metadata/labels/version
          value: v2.0
      target:
        kind: Deployment
        name: web-app
```

## Practical Examples

### Changing a Service Port

```yaml
# kustomization-service-port.yaml - Change a service port with JSON patch
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy
  prune: true
  patches:
    - patch: |
        - op: replace
          path: /spec/ports/0/port
          value: 8080
        - op: replace
          path: /spec/ports/0/targetPort
          value: 8080
      target:
        kind: Service
        name: web-app
```

### Adding Init Containers

```yaml
# kustomization-init-container.yaml - Add an init container
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy
  prune: true
  patches:
    - patch: |
        - op: add
          path: /spec/template/spec/initContainers
          value:
            - name: wait-for-db
              image: busybox:1.36
              command:
                - sh
                - -c
                - "until nc -z database 5432; do sleep 2; done"
      target:
        kind: Deployment
        name: web-app
```

### Modifying ConfigMap Data

```yaml
# kustomization-configmap-patch.yaml - Modify ConfigMap data
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy
  prune: true
  patches:
    - patch: |
        - op: add
          path: /data/DATABASE_HOST
          value: db.production.internal
        - op: replace
          path: /data/LOG_LEVEL
          value: warn
      target:
        kind: ConfigMap
        name: app-config
```

### Adding Security Context

```yaml
# kustomization-security.yaml - Add security context with JSON patch
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy
  prune: true
  patches:
    - patch: |
        - op: add
          path: /spec/template/spec/securityContext
          value:
            runAsNonRoot: true
            runAsUser: 1000
            fsGroup: 2000
        - op: add
          path: /spec/template/spec/containers/0/securityContext
          value:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
      target:
        kind: Deployment
```

## The Test Operation

The `test` operation verifies that a value at a path matches the expected value. If it does not match, the entire patch fails. This is useful as a safety check.

```yaml
# Test before patching - only apply if the current image matches
patches:
  - patch: |
      # Verify the current image before replacing
      - op: test
        path: /spec/template/spec/containers/0/image
        value: nginx:1.25
      # Only runs if the test passes
      - op: replace
        path: /spec/template/spec/containers/0/image
        value: nginx:1.26
    target:
      kind: Deployment
      name: web-app
```

## JSON Pointer Escaping

JSON Pointer (RFC 6901) requires escaping two special characters:

- `~` is escaped as `~0`
- `/` is escaped as `~1`

```yaml
# Escaping special characters in annotation keys
patches:
  - patch: |
      # The annotation key "app.kubernetes.io/name" contains slashes
      - op: add
        path: /metadata/annotations/app.kubernetes.io~1name
        value: my-app
    target:
      kind: Deployment
      name: web-app
```

## Debugging JSON Patches

```bash
# Preview the patched output
flux build kustomization my-app

# Check for patch errors in the Kustomization status
kubectl describe kustomization my-app -n flux-system
```

Common errors include:
- **Path not found**: The `replace` or `remove` operation targets a path that does not exist. Use `add` instead.
- **Index out of bounds**: The array index in the path exceeds the array length.
- **Test failed**: A `test` operation did not match the expected value.

## Best Practices

1. **Use JSON patches when you need index-based list access** or explicit operations that strategic merge patches cannot express.
2. **Prefer strategic merge patches for readability** when the modification is straightforward.
3. **Use the test operation** as a safety check before making changes to verify assumptions about the current state.
4. **Be careful with array indices**: If the order of items changes, index-based patches may target the wrong item. Consider using strategic merge patches with merge keys instead.
5. **Remember JSON Pointer escaping**: Forward slashes in keys must be escaped as `~1`.

## Conclusion

JSON patches give you precise, operation-based control over resource modifications in Flux Kustomizations. They complement strategic merge patches by handling scenarios that require index-based list access, explicit field removal, and conditional modifications with the test operation. While they are more verbose than strategic merge patches, their explicitness makes the intent of each modification unambiguous. Choose JSON patches when you need surgical precision and strategic merge patches when you need readable, intuitive modifications.
