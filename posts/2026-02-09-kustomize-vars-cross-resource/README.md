# How to implement Kustomize vars for cross-resource references

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, Configuration

Description: Learn how to use Kustomize vars to create dynamic cross-resource references, enabling flexible configuration that adapts to changing resource names and values.

---

Kustomize vars enable dynamic references between resources by extracting values from one resource and substituting them into others. While vars are deprecated in favor of replacements, understanding them is still valuable for maintaining existing configurations. This post covers both vars and their modern replacement alternatives.

## Understanding vars

Vars extract values from source resources and make them available for substitution in target resources. They work similarly to variables in programming languages, allowing you to reference computed or dynamic values throughout your configuration.

The primary use case for vars is handling generated names, such as ConfigMap or Secret names with hash suffixes, and propagating them to resources that reference them.

## Basic vars usage (deprecated)

Here's the traditional vars syntax:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml
- service.yaml

configMapGenerator:
- name: app-config
  literals:
  - database_host=postgres

vars:
- name: CONFIG_NAME
  objref:
    kind: ConfigMap
    name: app-config
    apiVersion: v1
  fieldref:
    fieldpath: metadata.name
```

Reference the var in your deployment:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      containers:
      - name: app
        env:
        - name: CONFIG_MAP_NAME
          value: $(CONFIG_NAME)
```

## Modern alternative using replacements

The recommended approach uses replacements:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml

configMapGenerator:
- name: app-config
  literals:
  - database_host=postgres

replacements:
- source:
    kind: ConfigMap
    name: app-config
    fieldPath: metadata.name
  targets:
  - select:
      kind: Deployment
    fieldPaths:
    - spec.template.spec.containers.0.env.[name=CONFIG_MAP_NAME].value
```

This achieves the same result without deprecated vars.

## Service name propagation

Reference service names dynamically:

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
  - port: 8080
---
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: client-app
spec:
  template:
    spec:
      containers:
      - name: client
        env:
        - name: API_SERVICE_HOST
          value: placeholder
```

Use replacements to fill the placeholder:

```yaml
replacements:
- source:
    kind: Service
    name: api-service
    fieldPath: metadata.name
  targets:
  - select:
      kind: Deployment
      name: client-app
    fieldPaths:
    - spec.template.spec.containers.0.env.[name=API_SERVICE_HOST].value
```

## Namespace propagation

Propagate namespace across resources:

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
```

## Port number references

Share port configurations:

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
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      containers:
      - name: app
        env:
        - name: PORT
          value: "8080"  # Will be replaced
```

Replace with actual service port:

```yaml
replacements:
- source:
    kind: Service
    name: web-service
    fieldPath: spec.ports.0.port
  targets:
  - select:
      kind: Deployment
    fieldPaths:
    - spec.template.spec.containers.0.env.[name=PORT].value
```

## ConfigMap data references

Reference ConfigMap values:

```yaml
# base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-settings
data:
  api_endpoint: "https://api.example.com"
  timeout: "30"
---
# base/deployment.yaml
spec:
  template:
    spec:
      containers:
      - name: app
        env:
        - name: API_ENDPOINT
          value: placeholder
```

Replace with ConfigMap data:

```yaml
replacements:
- source:
    kind: ConfigMap
    name: app-settings
    fieldPath: data.api_endpoint
  targets:
  - select:
      kind: Deployment
    fieldPaths:
    - spec.template.spec.containers.0.env.[name=API_ENDPOINT].value
```

## Image digest references

Propagate image digests:

```yaml
# base/deployment-main.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: main-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp@sha256:abc123...
---
# base/cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: maintenance
spec:
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: job
            image: placeholder
```

Copy image reference:

```yaml
replacements:
- source:
    kind: Deployment
    name: main-app
    fieldPath: spec.template.spec.containers.0.image
  targets:
  - select:
      kind: CronJob
    fieldPaths:
    - spec.jobTemplate.spec.template.spec.containers.0.image
```

## Label value propagation

Share label values:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  labels:
    version: v2.1.0
---
# base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
  labels:
    version: placeholder
```

Propagate version label:

```yaml
replacements:
- source:
    kind: Deployment
    name: web-app
    fieldPath: metadata.labels.version
  targets:
  - select:
      kind: Service
    fieldPaths:
    - metadata.labels.version
```

## Resource name construction

Build resource names from components:

```yaml
# base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-metadata
data:
  app_name: myapp
  version: v2
---
replacements:
- source:
    kind: ConfigMap
    name: app-metadata
    fieldPath: data.app_name
  targets:
  - select:
      kind: Deployment
    fieldPaths:
    - metadata.labels.app
```

## ServiceAccount references

Link ServiceAccounts correctly:

```yaml
# base/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
---
# base/deployment.yaml
spec:
  template:
    spec:
      serviceAccountName: placeholder
---
replacements:
- source:
    kind: ServiceAccount
    name: app-sa
    fieldPath: metadata.name
  targets:
  - select:
      kind: Deployment
    fieldPaths:
    - spec.template.spec.serviceAccountName
```

## Multiple source values

Use multiple replacements for complex scenarios:

```yaml
replacements:
- source:
    kind: ConfigMap
    name: config
    fieldPath: data.db_host
  targets:
  - select:
      kind: Deployment
    fieldPaths:
    - spec.template.spec.containers.0.env.[name=DB_HOST].value

- source:
    kind: ConfigMap
    name: config
    fieldPath: data.db_port
  targets:
  - select:
      kind: Deployment
    fieldPaths:
    - spec.template.spec.containers.0.env.[name=DB_PORT].value

- source:
    kind: Secret
    name: db-creds
    fieldPath: metadata.name
  targets:
  - select:
      kind: Deployment
    fieldPaths:
    - spec.template.spec.containers.0.envFrom.0.secretRef.name
```

## Computed values

Create computed environment variables:

```yaml
# base/deployment.yaml
spec:
  template:
    spec:
      containers:
      - name: app
        env:
        - name: SERVICE_URL
          value: "http://$(SERVICE_NAME).$(NAMESPACE).svc.cluster.local:$(PORT)"
```

Replace each component:

```yaml
replacements:
- source:
    kind: Service
    fieldPath: metadata.name
  targets:
  - select:
      kind: Deployment
    fieldPaths:
    - spec.template.spec.containers.0.env.[name=SERVICE_URL].value
    options:
      delimiter: '://'
      index: 1

- source:
    kind: Namespace
    fieldPath: metadata.name
  targets:
  - select:
      kind: Deployment
    fieldPaths:
    - spec.template.spec.containers.0.env.[name=SERVICE_URL].value
    options:
      delimiter: '.'
      index: 1
```

## Conditional references

Apply references conditionally:

```yaml
replacements:
- source:
    kind: ConfigMap
    name: feature-flags
    fieldPath: data.feature_enabled
  targets:
  - select:
      kind: Deployment
      annotationSelector: feature.toggle=enabled
    fieldPaths:
    - spec.template.spec.containers.0.env.[name=FEATURE_FLAG].value
```

## Testing cross-resource references

Validate replacements:

```bash
# Build and check substitution
kustomize build base/ | yq eval 'select(.kind == "Deployment") | .spec.template.spec.containers[0].env' -

# Verify service name propagated
kustomize build base/ | grep "API_SERVICE_HOST"

# Check all replacements applied
kustomize build base/ | grep -v "placeholder"
```

## Migration from vars to replacements

Convert old vars syntax:

```yaml
# Old vars approach
vars:
- name: SERVICE_NAME
  objref:
    kind: Service
    name: api-service
  fieldref:
    fieldpath: metadata.name

# New replacements approach
replacements:
- source:
    kind: Service
    name: api-service
    fieldPath: metadata.name
  targets:
  - select:
      kind: Deployment
    fieldPaths:
    - spec.template.spec.containers.0.env.[name=SERVICE_NAME].value
```

## Best practices

Use replacements instead of deprecated vars for new projects.

Keep replacement chains short and understandable.

Document what each replacement does for team clarity.

Test replacements thoroughly to ensure correct value propagation.

Use descriptive placeholder values that make intent clear.

Consider using external configuration management for complex scenarios.

## Troubleshooting

Debug replacement issues:

```bash
# Check source value exists
kustomize build base/ | yq eval 'select(.kind == "Service") | .metadata.name' -

# Verify target field path
kustomize build base/ | yq eval 'select(.kind == "Deployment") | .spec.template.spec.containers[0].env' -

# Test with simpler replacement first
# Gradually build up complexity
```

## Conclusion

While Kustomize vars are deprecated, the concept of cross-resource references remains essential. Modern replacements provide more flexibility and clarity for dynamic value propagation. Use replacements to link ConfigMaps, Services, and other resources, creating configurations that adapt automatically to generated names and computed values. This approach reduces hardcoding and creates more maintainable Kubernetes configurations that scale across environments.
