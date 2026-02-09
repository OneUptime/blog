# How to implement Kustomize replacements for advanced field substitution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, Configuration

Description: Learn how to use Kustomize replacements to dynamically substitute values across resources, enabling sophisticated configuration patterns.

---

Kustomize replacements provide advanced field substitution capabilities that go beyond simple patches. They allow you to copy values from one resource to another, extract parts of fields, and perform transformations. This enables dynamic configuration where values flow between resources without hardcoding.

## Understanding replacements

Replacements use a source and target pattern. The source specifies where to get a value, and targets specify where to put it. This is more powerful than vars, which are deprecated, and allows for complex value propagation across your Kubernetes manifests.

Replacements can extract values from metadata, spec fields, or even computed values. They work during the kustomize build process, substituting values before sending manifests to the cluster.

## Basic replacement example

Copy a value from one resource to another:

```yaml
# base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  app_version: "v2.1.0"
---
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    metadata:
      labels:
        version: placeholder
    spec:
      containers:
      - name: app
        image: myapp:placeholder
```

Create a replacement:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- configmap.yaml
- deployment.yaml

replacements:
- source:
    kind: ConfigMap
    name: app-config
    fieldPath: data.app_version
  targets:
  - select:
      kind: Deployment
      name: web-app
    fieldPaths:
    - spec.template.metadata.labels.version
    - spec.template.spec.containers.0.image
    options:
      delimiter: ':'
      index: 1
```

This copies the version from ConfigMap to deployment labels and image tags.

## Substituting namespace across resources

Propagate namespace to all resources:

```yaml
# base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
---
# base/kustomization.yaml
replacements:
- source:
    kind: Namespace
    fieldPath: metadata.name
  targets:
  - select:
      kind: Deployment
    fieldPaths:
    - metadata.namespace
  - select:
      kind: Service
    fieldPaths:
    - metadata.namespace
  - select:
      kind: ConfigMap
    fieldPaths:
    - metadata.namespace
```

## Using service name in ingress

Link service names automatically:

```yaml
# base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  selector:
    app: api
  ports:
  - port: 80
    targetPort: 8080
---
# base/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: placeholder
            port:
              number: 80
```

Create replacement:

```yaml
replacements:
- source:
    kind: Service
    name: api-service
    fieldPath: metadata.name
  targets:
  - select:
      kind: Ingress
      name: api-ingress
    fieldPaths:
    - spec.rules.0.http.paths.0.backend.service.name
```

## Extracting and transforming values

Extract port numbers from services:

```yaml
# base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  ports:
  - name: http
    port: 8080
    targetPort: 8080
---
# base/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: web-monitor
spec:
  selector:
    matchLabels:
      app: web
  endpoints:
  - port: http
    interval: 30s
```

Link port configuration:

```yaml
replacements:
- source:
    kind: Service
    name: web-service
    fieldPath: spec.ports.0.name
  targets:
  - select:
      kind: ServiceMonitor
      name: web-monitor
    fieldPaths:
    - spec.endpoints.0.port
```

## Referencing ConfigMap names with hash

Use generated ConfigMap names:

```yaml
configMapGenerator:
- name: app-config
  literals:
  - key=value

replacements:
- source:
    kind: ConfigMap
    name: app-config
    fieldPath: metadata.name
  targets:
  - select:
      kind: Deployment
    fieldPaths:
    - spec.template.spec.containers.0.envFrom.0.configMapRef.name
```

This automatically uses the hash-suffixed ConfigMap name.

## Cross-resource label propagation

Propagate labels consistently:

```yaml
# base/kustomization.yaml
commonLabels:
  app: myapp
  team: platform

replacements:
- source:
    kind: Deployment
    name: web-app
    fieldPath: metadata.labels.app
  targets:
  - select:
      kind: Service
    fieldPaths:
    - spec.selector.app
  - select:
      kind: NetworkPolicy
    fieldPaths:
    - spec.podSelector.matchLabels.app
```

## Using image digests

Replace image tags with digests:

```yaml
# base/kustomization.yaml
images:
- name: myapp
  newName: registry.example.com/myapp
  digest: sha256:abcd1234...

replacements:
- source:
    kind: Deployment
    name: web-app
    fieldPath: spec.template.spec.containers.0.image
  targets:
  - select:
      kind: CronJob
    fieldPaths:
    - spec.jobTemplate.spec.template.spec.containers.0.image
```

## Conditional replacements

Replace only in specific conditions:

```yaml
replacements:
- source:
    kind: ConfigMap
    name: feature-flags
    fieldPath: data.new_feature_enabled
  targets:
  - select:
      kind: Deployment
      name: web-app
      annotationSelector: feature.enabled=true
    fieldPaths:
    - spec.template.spec.containers.0.env.[name=FEATURE_ENABLED].value
```

## Multi-target replacements

Apply same value to multiple targets:

```yaml
replacements:
- source:
    kind: ConfigMap
    name: global-config
    fieldPath: data.api_endpoint
  targets:
  - select:
      kind: Deployment
    fieldPaths:
    - spec.template.spec.containers.[name=api-client].env.[name=API_ENDPOINT].value
  - select:
      kind: CronJob
    fieldPaths:
    - spec.jobTemplate.spec.template.spec.containers.0.env.[name=API_ENDPOINT].value
  - select:
      kind: ConfigMap
      name: client-config
    fieldPaths:
    - data.endpoint
```

## Using node selector values

Propagate node selector across workloads:

```yaml
# base/node-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: node-config
data:
  node_pool: high-memory
---
replacements:
- source:
    kind: ConfigMap
    name: node-config
    fieldPath: data.node_pool
  targets:
  - select:
      kind: Deployment
    fieldPaths:
    - spec.template.spec.nodeSelector.[node-pool]
  - select:
      kind: StatefulSet
    fieldPaths:
    - spec.template.spec.nodeSelector.[node-pool]
```

## Resource request propagation

Copy resource limits across containers:

```yaml
# base/resource-policy.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: resource-policy
data:
  memory_limit: "2Gi"
  cpu_limit: "1000m"
---
replacements:
- source:
    kind: ConfigMap
    name: resource-policy
    fieldPath: data.memory_limit
  targets:
  - select:
      kind: Deployment
    fieldPaths:
    - spec.template.spec.containers.[name=app].resources.limits.memory

- source:
    kind: ConfigMap
    name: resource-policy
    fieldPath: data.cpu_limit
  targets:
  - select:
      kind: Deployment
    fieldPaths:
    - spec.template.spec.containers.[name=app].resources.limits.cpu
```

## Delimiter-based splitting

Split and extract parts of values:

```yaml
# Source has version like "v2.1.0"
replacements:
- source:
    kind: ConfigMap
    name: app-config
    fieldPath: data.full_version
  targets:
  - select:
      kind: Deployment
    fieldPaths:
    - metadata.labels.version
    options:
      delimiter: '.'
      index: 0  # Extract major version
```

## Regular expression replacements

Transform values using regex patterns:

```yaml
replacements:
- source:
    kind: Service
    name: database
    fieldPath: metadata.name
  targets:
  - select:
      kind: ConfigMap
    fieldPaths:
    - data.db_connection_string
    options:
      delimiter: '//'
      index: 1
```

## Environment-specific replacements

Different replacements per overlay:

```yaml
# overlays/production/kustomization.yaml
replacements:
- source:
    kind: ConfigMap
    name: prod-config
    fieldPath: data.replicas
  targets:
  - select:
      kind: Deployment
    fieldPaths:
    - spec.replicas
    options:
      create: true
```

The `create: true` option creates the field if it doesn't exist.

## Validation and testing

Test replacements:

```bash
# Build and inspect
kustomize build base/ | yq eval 'select(.kind == "Deployment") | .spec.template.metadata.labels' -

# Verify specific replacement
kustomize build base/ | yq eval 'select(.kind == "Ingress") | .spec.rules[0].http.paths[0].backend.service.name' -

# Check all replaced values
kustomize build base/ | grep -A 2 "version:"
```

## Common use cases

Use replacements for service discovery where one service needs to reference another.

Propagate configuration values from centralized ConfigMaps to multiple resources.

Sync resource names between dependent resources like Services and Ingresses.

Apply organization-wide policies by copying values from policy ConfigMaps.

## Troubleshooting

If replacements don't work, check field paths are correct:

```bash
# Inspect source resource
kustomize build base/ | yq eval 'select(.metadata.name == "app-config")' -

# Verify target field exists
kustomize build base/ | yq eval 'select(.kind == "Deployment") | .spec.template.spec.containers[0].image' -
```

Enable verbose output:

```bash
kustomize build --enable-alpha-plugins base/
```

## Conclusion

Kustomize replacements enable sophisticated value propagation across Kubernetes resources. They eliminate hardcoded values and create dynamic configurations where changes to source values automatically update all dependent resources. Use replacements for service discovery, configuration synchronization, and implementing organizational policies. Combined with generators and transformers, replacements make Kustomize a powerful tool for managing complex Kubernetes configurations.
