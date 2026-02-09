# How to configure Kustomize JSON 6902 patches for complex modifications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, Configuration

Description: Master JSON 6902 patches in Kustomize for precise surgical modifications to Kubernetes resources when strategic merge patches are insufficient.

---

JSON 6902 patches provide surgical precision for modifying Kubernetes resources when strategic merge patches cannot achieve the desired result. Based on RFC 6902, these patches use explicit operations like add, remove, replace, and test to modify specific paths in YAML documents. This precision is essential for complex modifications or when you need guaranteed execution order.

## When to use JSON 6902 patches

Use JSON 6902 patches when you need to remove array elements, reorder lists, or make modifications that strategic merge cannot handle. They are also useful when you want explicit control over patch operations or need to validate existing values before making changes.

Strategic merge patches work well for additive changes, but JSON 6902 patches excel at surgical modifications and deletions. The tradeoff is verbosity: you must specify exact JSON Pointer paths to target fields.

## Basic JSON 6902 patch syntax

Here's a simple example that replaces an image tag:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 8080
```

Create a JSON 6902 patch:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base

patches:
- target:
    kind: Deployment
    name: web-app
  patch: |-
    - op: replace
      path: /spec/template/spec/containers/0/image
      value: myapp:v2.1.5
    - op: replace
      path: /spec/replicas
      value: 10
```

This patch replaces the image and replica count with exact values.

## Adding array elements

Add items to arrays using the add operation:

```yaml
patches:
- target:
    kind: Deployment
    name: web-app
  patch: |-
    - op: add
      path: /spec/template/spec/containers/0/env
      value:
      - name: LOG_LEVEL
        value: info
      - name: DB_HOST
        value: prod-db.example.com

    - op: add
      path: /spec/template/spec/volumes
      value:
      - name: config
        configMap:
          name: app-config
```

The add operation creates new fields or appends to arrays.

## Removing specific array elements

Remove array elements by index:

```yaml
patches:
- target:
    kind: Deployment
    name: web-app
  patch: |-
    # Remove the first environment variable
    - op: remove
      path: /spec/template/spec/containers/0/env/0

    # Remove a specific volume
    - op: remove
      path: /spec/template/spec/volumes/1
```

Be careful with indices as they shift when you remove elements.

## Removing fields conditionally

Use the test operation to verify before removing:

```yaml
patches:
- target:
    kind: Deployment
    name: web-app
  patch: |-
    - op: test
      path: /spec/template/spec/containers/0/resources/limits
      value:
        memory: "128Mi"
        cpu: "100m"
    - op: remove
      path: /spec/template/spec/containers/0/resources/limits
```

The patch fails if the test operation doesn't match, preventing unintended changes.

## Complex nested modifications

Modify deeply nested structures:

```yaml
patches:
- target:
    kind: Deployment
    name: api-server
  patch: |-
    - op: add
      path: /spec/template/spec/affinity
      value:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - api-server
            topologyKey: kubernetes.io/hostname

    - op: add
      path: /spec/template/spec/containers/0/livenessProbe
      value:
        httpGet:
          path: /health
          port: 8080
        initialDelaySeconds: 30
        periodSeconds: 10
```

JSON 6902 patches handle complex nested structures effectively.

## Patching multiple containers

Target specific containers by index:

```yaml
patches:
- target:
    kind: Deployment
    name: web-app
  patch: |-
    # Patch first container
    - op: replace
      path: /spec/template/spec/containers/0/resources/limits/memory
      value: "1Gi"

    # Patch second container (sidecar)
    - op: replace
      path: /spec/template/spec/containers/1/resources/limits/memory
      value: "256Mi"

    # Add env to specific container
    - op: add
      path: /spec/template/spec/containers/0/env/-
      value:
        name: SIDECAR_ENABLED
        value: "true"
```

Use `-` to append to the end of an array.

## Modifying annotations and labels

Add or modify metadata fields:

```yaml
patches:
- target:
    kind: Deployment
    name: web-app
  patch: |-
    - op: add
      path: /metadata/annotations
      value:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"

    - op: add
      path: /metadata/labels/team
      value: platform

    - op: add
      path: /spec/template/metadata/annotations
      value:
        sidecar.istio.io/inject: "true"
```

Separate patches for deployment and pod template metadata.

## Conditional patching with test operations

Validate state before making changes:

```yaml
patches:
- target:
    kind: Deployment
    name: web-app
  patch: |-
    # Only proceed if current image is latest
    - op: test
      path: /spec/template/spec/containers/0/image
      value: myapp:latest

    # Update to specific version
    - op: replace
      path: /spec/template/spec/containers/0/image
      value: myapp:v3.0.0

    # Only add env if replicas is 3
    - op: test
      path: /spec/replicas
      value: 3

    - op: add
      path: /spec/template/spec/containers/0/env/-
      value:
        name: SCALING_MODE
        value: fixed
```

Test operations make patches safer and more predictable.

## Patching init containers

Modify init containers separately from main containers:

```yaml
patches:
- target:
    kind: Deployment
    name: web-app
  patch: |-
    - op: add
      path: /spec/template/spec/initContainers
      value:
      - name: migration
        image: myapp:v3.0.0
        command: ["/migrate"]
        env:
        - name: DB_HOST
          value: prod-db.example.com

    - op: add
      path: /spec/template/spec/initContainers/0/volumeMounts
      value:
      - name: migrations
        mountPath: /migrations
```

Init containers are a separate array from regular containers.

## Replacing entire sections

Replace complex sections entirely:

```yaml
patches:
- target:
    kind: Deployment
    name: web-app
  patch: |-
    - op: replace
      path: /spec/template/spec/containers/0/resources
      value:
        requests:
          memory: "512Mi"
          cpu: "500m"
        limits:
          memory: "2Gi"
          cpu: "2000m"

    - op: replace
      path: /spec/strategy
      value:
        type: RollingUpdate
        rollingUpdate:
          maxSurge: 1
          maxUnavailable: 0
```

Replace entire objects when strategic merge would merge fields.

## Patching services

Modify service specifications precisely:

```yaml
patches:
- target:
    kind: Service
    name: web-app
  patch: |-
    - op: replace
      path: /spec/type
      value: LoadBalancer

    - op: add
      path: /metadata/annotations
      value:
        service.beta.kubernetes.io/aws-load-balancer-type: nlb

    - op: add
      path: /spec/ports/-
      value:
        name: https
        port: 443
        targetPort: 8443
        protocol: TCP
```

Add ports and change service types precisely.

## Patching multiple resources

Apply patches to multiple resource types:

```yaml
patches:
- target:
    kind: Deployment
  patch: |-
    - op: add
      path: /metadata/labels/managed-by
      value: kustomize

- target:
    kind: Service
  patch: |-
    - op: add
      path: /metadata/labels/managed-by
      value: kustomize

- target:
    kind: ConfigMap
  patch: |-
    - op: add
      path: /metadata/labels/managed-by
      value: kustomize
```

Use targetless selectors to apply to all matching resources.

## Escaping special characters

Handle paths with special characters:

```yaml
patches:
- target:
    kind: Deployment
    name: web-app
  patch: |-
    # Escape / in annotation keys
    - op: add
      path: /metadata/annotations/example.com~1annotation
      value: "value"

    # Escape ~ using ~0
    - op: add
      path: /metadata/labels/version~0tag
      value: "v1"
```

Use `~1` for `/` and `~0` for `~` in JSON Pointer paths.

## Testing and validation

Validate JSON 6902 patches:

```bash
# Build and inspect
kustomize build overlays/production/ | grep -A 10 "kind: Deployment"

# Validate patch syntax
kustomize build overlays/production/ > /tmp/output.yaml && echo "Valid"

# Test specific paths exist
kustomize build overlays/production/ | yq eval '.spec.template.spec.containers[0].image' -

# Dry run application
kubectl apply -k overlays/production/ --dry-run=server
```

## Combining with strategic merge

Use both patch types together:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base

# Strategic merge for simple changes
patchesStrategicMerge:
- env-patch.yaml

# JSON 6902 for precise modifications
patches:
- target:
    kind: Deployment
    name: web-app
  patch: |-
    - op: remove
      path: /spec/template/spec/containers/0/resources/limits
    - op: add
      path: /spec/template/spec/containers/0/command
      value: ["/app/server", "--production"]
```

Use the right tool for each modification type.

## Common pitfalls

Avoid these mistakes:

```yaml
# Wrong - array indices shift after removal
- op: remove
  path: /spec/template/spec/containers/0/env/0
- op: remove
  path: /spec/template/spec/containers/0/env/1  # Now points to wrong element

# Correct - remove in reverse order
- op: remove
  path: /spec/template/spec/containers/0/env/1
- op: remove
  path: /spec/template/spec/containers/0/env/0

# Or use - to add to end
- op: add
  path: /spec/template/spec/containers/0/env/-
  value:
    name: NEW_VAR
    value: value
```

Always consider operation order when working with arrays.

## Conclusion

JSON 6902 patches provide surgical precision for Kubernetes resource modifications in Kustomize. While more verbose than strategic merge patches, they offer explicit control over operations and execution order. Use them for removing fields, reordering arrays, or when you need guaranteed behavior. Combined with test operations, JSON 6902 patches enable safe, predictable infrastructure modifications.
