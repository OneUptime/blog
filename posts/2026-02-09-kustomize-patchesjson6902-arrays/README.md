# How to use Kustomize patchesJson6902 for array element modifications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, JSON Patch

Description: Master Kustomize patchesJson6902 to perform precise array modifications in Kubernetes resources including adding, removing, and replacing specific array elements.

---

While strategic merge patches work well for simple modifications, they struggle with precise array manipulations. The patchesJson6902 field uses JSON Patch (RFC 6902) to provide fine-grained control over array elements. This precision is essential when you need to add a specific container to an existing list, modify environment variables, or update volume mounts.

Understanding JSON Patch syntax unlocks powerful capabilities for modifying complex Kubernetes resources. Unlike strategic merge patches that replace entire arrays, JSON Patch lets you target specific array indexes or append elements without affecting others.

## Understanding JSON Patch operations

JSON Patch defines six operations: add, remove, replace, move, copy, and test. Each operation works on a specific path in the resource:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml

patchesJson6902:
- target:
    group: apps
    version: v1
    kind: Deployment
    name: myapp
  patch: |-
    - op: add
      path: /spec/replicas
      value: 5
```

The path uses JSON Pointer syntax with forward slashes separating components.

## Adding elements to arrays

Append elements to arrays using the `-` index or specific positions:

```yaml
# kustomization.yaml
patchesJson6902:
- target:
    kind: Deployment
    name: webapp
  patch: |-
    - op: add
      path: /spec/template/spec/containers/-
      value:
        name: sidecar
        image: logging-agent:v1.0
        volumeMounts:
        - name: logs
          mountPath: /var/log
```

The `-` character appends to the array. For inserting at specific positions, use an index:

```yaml
patchesJson6902:
- target:
    kind: Deployment
    name: webapp
  patch: |-
    - op: add
      path: /spec/template/spec/containers/0
      value:
        name: init-container
        image: setup:v1.0
```

This inserts at index 0, shifting existing elements.

## Modifying environment variables

Add or replace specific environment variables without affecting others:

```yaml
# kustomization.yaml
patchesJson6902:
- target:
    kind: Deployment
    name: api
  patch: |-
    - op: add
      path: /spec/template/spec/containers/0/env/-
      value:
        name: NEW_FEATURE_FLAG
        value: "true"

    - op: add
      path: /spec/template/spec/containers/0/env/-
      value:
        name: DATABASE_URL
        valueFrom:
          secretKeyRef:
            name: db-credentials
            key: url
```

Each operation adds a new environment variable to the first container's env array.

## Replacing array elements

Replace specific array elements by index:

```yaml
# kustomization.yaml
patchesJson6902:
- target:
    kind: Deployment
    name: webapp
  patch: |-
    - op: replace
      path: /spec/template/spec/containers/0/image
      value: webapp:v2.0.0

    - op: replace
      path: /spec/template/spec/containers/0/ports/0/containerPort
      value: 8080
```

The replace operation requires the path to exist. Use add for paths that might not exist.

## Removing array elements

Remove specific elements from arrays:

```yaml
# kustomization.yaml
patchesJson6902:
- target:
    kind: Deployment
    name: webapp
  patch: |-
    # Remove the second container (index 1)
    - op: remove
      path: /spec/template/spec/containers/1

    # Remove a specific environment variable (index 3)
    - op: remove
      path: /spec/template/spec/containers/0/env/3
```

Be careful with indexes - removing an element shifts subsequent indexes.

## Complex volume mount modifications

Add volume mounts to containers:

```yaml
# kustomization.yaml
patchesJson6902:
- target:
    kind: Deployment
    name: webapp
  patch: |-
    - op: add
      path: /spec/template/spec/volumes/-
      value:
        name: config-volume
        configMap:
          name: app-config

    - op: add
      path: /spec/template/spec/containers/0/volumeMounts
      value: []

    - op: add
      path: /spec/template/spec/containers/0/volumeMounts/-
      value:
        name: config-volume
        mountPath: /etc/config
```

The second operation creates the volumeMounts array if it doesn't exist, then the third operation adds the mount.

## Working with security context arrays

Modify capabilities in security contexts:

```yaml
# kustomization.yaml
patchesJson6902:
- target:
    kind: Deployment
    name: webapp
  patch: |-
    - op: add
      path: /spec/template/spec/containers/0/securityContext
      value:
        capabilities:
          drop: []
          add: []

    - op: add
      path: /spec/template/spec/containers/0/securityContext/capabilities/drop/-
      value: ALL

    - op: add
      path: /spec/template/spec/containers/0/securityContext/capabilities/add/-
      value: NET_BIND_SERVICE
```

This drops all capabilities and adds back only NET_BIND_SERVICE.

## Conditional patches with test operation

Use test operations to make patches conditional:

```yaml
# kustomization.yaml
patchesJson6902:
- target:
    kind: Deployment
    name: webapp
  patch: |-
    - op: test
      path: /spec/replicas
      value: 1
    - op: replace
      path: /spec/replicas
      value: 3
```

The replace only applies if the test passes. If replicas isn't 1, the entire patch fails. This prevents unintended modifications.

## Handling special characters in paths

Escape special characters in JSON Pointer paths:

```yaml
# kustomization.yaml
patchesJson6902:
- target:
    kind: Service
    name: webapp
  patch: |-
    # Tilde (~) must be escaped as ~0
    # Forward slash (/) must be escaped as ~1
    - op: add
      path: /metadata/annotations/prometheus.io~1scrape
      value: "true"
```

The annotation key "prometheus.io/scrape" becomes "prometheus.io~1scrape" in the path.

## Multiple patches on the same resource

Apply several modifications in sequence:

```yaml
# kustomization.yaml
patchesJson6902:
- target:
    kind: Deployment
    name: webapp
  patch: |-
    - op: add
      path: /spec/template/spec/containers/0/resources
      value:
        requests:
          memory: "256Mi"
          cpu: "100m"

    - op: add
      path: /spec/template/spec/containers/0/livenessProbe
      value:
        httpGet:
          path: /health
          port: 8080
        initialDelaySeconds: 30
        periodSeconds: 10

    - op: add
      path: /spec/template/spec/containers/0/readinessProbe
      value:
        httpGet:
          path: /ready
          port: 8080
        initialDelaySeconds: 5
        periodSeconds: 5
```

Operations execute in order, so later operations can reference paths created by earlier ones.

## Patching init containers

Modify init containers independently from main containers:

```yaml
# kustomization.yaml
patchesJson6902:
- target:
    kind: Deployment
    name: webapp
  patch: |-
    - op: add
      path: /spec/template/spec/initContainers
      value: []

    - op: add
      path: /spec/template/spec/initContainers/-
      value:
        name: migration
        image: migrate:v1.0
        command: ["migrate", "up"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
```

This creates the initContainers array and adds a migration container.

## Using patch files for complex modifications

For large patches, use external files:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml

patchesJson6902:
- target:
    kind: Deployment
    name: webapp
  path: patches/add-monitoring.yaml
```

```yaml
# patches/add-monitoring.yaml
- op: add
  path: /spec/template/spec/containers/-
  value:
    name: metrics-exporter
    image: prometheus-exporter:v1.0
    ports:
    - containerPort: 9090
      name: metrics

- op: add
  path: /spec/template/spec/containers/0/env/-
  value:
    name: METRICS_ENABLED
    value: "true"

- op: add
  path: /metadata/annotations/prometheus.io~1scrape
  value: "true"
```

External files keep kustomization.yaml readable for complex patches.

## Debugging JSON Patch operations

When patches fail, examine the error message carefully:

```
Error: unable to find array element to replace at path /spec/template/spec/containers/5
```

This indicates the array doesn't have an element at index 5. Check your base resource structure.

Build and inspect output to verify patches:

```bash
kustomize build . | yq eval '.items[] | select(.kind=="Deployment")' -
```

This shows the final Deployment after patches apply.

## Comparing strategic merge vs JSON Patch

Strategic merge patches work well for simple modifications:

```yaml
# Strategic merge - simpler for adding labels
patches:
- patch: |-
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: webapp
      labels:
        new-label: value
```

JSON Patch excels at precise array operations:

```yaml
# JSON Patch - precise array insertion
patchesJson6902:
- target:
    kind: Deployment
    name: webapp
  patch: |-
    - op: add
      path: /spec/template/spec/containers/1
      value: {name: sidecar, image: logger:v1}
```

Choose the right tool for your use case.

## Patching StatefulSets and DaemonSets

JSON Patch works identically on all workload types:

```yaml
# kustomization.yaml
patchesJson6902:
- target:
    kind: StatefulSet
    name: database
  patch: |-
    - op: add
      path: /spec/volumeClaimTemplates/-
      value:
        metadata:
          name: data-new
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 100Gi
```

This adds a volume claim template to a StatefulSet.

## Best practices for JSON Patch

Use add operations for paths that might not exist. The add operation creates missing paths, while replace requires them to exist.

Test patches in non-production environments first. JSON Patch failures can prevent entire kustomizations from building.

Keep patches focused and well-documented. Comment complex paths to explain what they modify:

```yaml
patchesJson6902:
- target:
    kind: Deployment
    name: webapp
  patch: |-
    # Add logging sidecar to main container array
    - op: add
      path: /spec/template/spec/containers/-
      value:
        name: logger
        image: fluent-bit:v1.8
```

Use external patch files for multi-step modifications. This improves readability and maintainability.

## Conclusion

Kustomize patchesJson6902 provides surgical precision for modifying Kubernetes resources, especially when working with arrays. The JSON Patch format gives you complete control over array elements, allowing insertions, deletions, and replacements at specific positions without affecting other elements.

While strategic merge patches handle many common scenarios, JSON Patch becomes essential when you need to modify specific array elements or perform complex structural changes. By mastering the JSON Patch operations and understanding JSON Pointer syntax, you can handle any configuration modification requirement while maintaining clean, maintainable kustomizations.
