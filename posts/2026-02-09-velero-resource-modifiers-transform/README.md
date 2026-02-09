# How to Configure Velero Resource Modifiers to Transform Resources During Restore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Velero, Disaster Recovery, Resource Transformation

Description: Learn how to configure Velero resource modifiers to transform Kubernetes resources during restore operations, enabling flexible disaster recovery scenarios through automated resource modifications.

---

Sometimes you need to modify resources as they're restored rather than restoring them exactly as they were backed up. Velero resource modifiers provide a powerful mechanism to transform resources during restore, allowing you to adapt workloads to different environments, fix configuration issues, or update deprecated APIs automatically.

## Understanding Resource Modifiers

Resource modifiers are JSON patches applied to resources during restore. They let you:

- Update image tags to newer versions
- Modify resource requests and limits
- Change storage class names
- Update API versions
- Remove or add labels and annotations
- Transform environment variables

This enables restoring production backups to test environments with appropriate modifications.

## Configuring Basic Resource Modifiers

Create a ConfigMap with resource modifiers:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: resource-modifiers
  namespace: velero
  labels:
    velero.io/plugin-config: ""
    velero.io/resource-modifier: "true"
data:
  resource-modifiers.yaml: |
    version: v1
    resourceModifierRules:
    - conditions:
        groupResource: deployments.apps
        resourceNameRegex: "^.*$"
        namespaces:
        - production
      patches:
      - operation: replace
        path: "/spec/replicas"
        value: "1"
```

This modifier reduces all deployment replicas to 1 during restore.

## Transforming Image Tags

Update images to use different versions or registries:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: resource-modifiers
  namespace: velero
  labels:
    velero.io/plugin-config: ""
    velero.io/resource-modifier: "true"
data:
  resource-modifiers.yaml: |
    version: v1
    resourceModifierRules:
    # Update image registry
    - conditions:
        groupResource: deployments.apps
        namespaces:
        - production
      patches:
      - operation: replace
        path: "/spec/template/spec/containers/0/image"
        value: "test-registry.example.com/myapp:latest"

    # Change image tag for all containers
    - conditions:
        groupResource: deployments.apps
      patches:
      - operation: test
        path: "/spec/template/spec/containers/0/image"
        value: ".*:v1.0.0"
      - operation: replace
        path: "/spec/template/spec/containers/0/image"
        value: "myapp:v1.1.0"
```

## Modifying Resource Requirements

Adjust CPU and memory limits for different environments:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: resource-modifiers
  namespace: velero
  labels:
    velero.io/plugin-config: ""
    velero.io/resource-modifier: "true"
data:
  resource-modifiers.yaml: |
    version: v1
    resourceModifierRules:
    # Reduce resources for test environment
    - conditions:
        groupResource: deployments.apps
        namespaces:
        - production
      patches:
      - operation: replace
        path: "/spec/template/spec/containers/0/resources/requests/memory"
        value: "128Mi"
      - operation: replace
        path: "/spec/template/spec/containers/0/resources/requests/cpu"
        value: "100m"
      - operation: replace
        path: "/spec/template/spec/containers/0/resources/limits/memory"
        value: "256Mi"
      - operation: replace
        path: "/spec/template/spec/containers/0/resources/limits/cpu"
        value: "200m"
```

## Updating Storage Classes

Transform PVCs to use different storage classes:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: resource-modifiers
  namespace: velero
  labels:
    velero.io/plugin-config: ""
    velero.io/resource-modifier: "true"
data:
  resource-modifiers.yaml: |
    version: v1
    resourceModifierRules:
    # Change storage class from premium to standard
    - conditions:
        groupResource: persistentvolumeclaims
        namespaces:
        - production
      patches:
      - operation: test
        path: "/spec/storageClassName"
        value: "premium-ssd"
      - operation: replace
        path: "/spec/storageClassName"
        value: "standard-ssd"

    # Reduce PVC size
    - conditions:
        groupResource: persistentvolumeclaims
      patches:
      - operation: replace
        path: "/spec/resources/requests/storage"
        value: "10Gi"
```

## Adding and Removing Labels

Modify labels during restore:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: resource-modifiers
  namespace: velero
  labels:
    velero.io/plugin-config: ""
    velero.io/resource-modifier: "true"
data:
  resource-modifiers.yaml: |
    version: v1
    resourceModifierRules:
    # Add environment label
    - conditions:
        groupResource: deployments.apps
        namespaces:
        - production
      patches:
      - operation: add
        path: "/metadata/labels/environment"
        value: "test"
      - operation: add
        path: "/metadata/labels/restored-from"
        value: "production-backup"

    # Remove production-specific labels
    - conditions:
        groupResource: deployments.apps
      patches:
      - operation: remove
        path: "/metadata/labels/production-only"
```

## Updating Environment Variables

Transform environment variables in deployments:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: resource-modifiers
  namespace: velero
  labels:
    velero.io/plugin-config: ""
    velero.io/resource-modifier: "true"
data:
  resource-modifiers.yaml: |
    version: v1
    resourceModifierRules:
    # Update database connection string
    - conditions:
        groupResource: deployments.apps
        resourceNameRegex: "^api-.*$"
      patches:
      - operation: replace
        path: "/spec/template/spec/containers/0/env/0/value"
        value: "postgres://test-db.internal:5432/testdb"

    # Add new environment variable
    - conditions:
        groupResource: deployments.apps
      patches:
      - operation: add
        path: "/spec/template/spec/containers/0/env/-"
        value:
          name: "ENVIRONMENT"
          value: "test"
```

## Conditional Modifications

Apply modifications based on resource properties:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: resource-modifiers
  namespace: velero
  labels:
    velero.io/plugin-config: ""
    velero.io/resource-modifier: "true"
data:
  resource-modifiers.yaml: |
    version: v1
    resourceModifierRules:
    # Only modify deployments with specific label
    - conditions:
        groupResource: deployments.apps
        labelSelector: "app=web-frontend"
        namespaces:
        - production
      patches:
      - operation: replace
        path: "/spec/replicas"
        value: "2"

    # Modify resources by name pattern
    - conditions:
        groupResource: services
        resourceNameRegex: "^db-.*$"
      patches:
      - operation: replace
        path: "/spec/type"
        value: "ClusterIP"
```

## Using Resource Modifiers During Restore

Apply resource modifiers to a restore operation:

```bash
# Restore with resource modifiers
velero restore create test-restore \
  --from-backup production-backup \
  --namespace-mappings production:test \
  --resource-modifier-configmap resource-modifiers
```

Or specify in a Restore resource:

```yaml
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: production-to-test
  namespace: velero
spec:
  backupName: production-backup-20260209
  includedNamespaces:
  - production
  namespaceMapping:
    production: test
  resourceModifier:
    kind: ConfigMap
    name: resource-modifiers
```

## Creating Environment-Specific Modifiers

Define different modifiers for different target environments:

```yaml
# Test environment modifiers
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-env-modifiers
  namespace: velero
  labels:
    velero.io/resource-modifier: "true"
data:
  resource-modifiers.yaml: |
    version: v1
    resourceModifierRules:
    - conditions:
        groupResource: deployments.apps
      patches:
      - operation: replace
        path: "/spec/replicas"
        value: "1"
      - operation: replace
        path: "/spec/template/spec/containers/0/resources/requests/memory"
        value: "128Mi"
---
# Production DR modifiers
apiVersion: v1
kind: ConfigMap
metadata:
  name: prod-dr-modifiers
  namespace: velero
  labels:
    velero.io/resource-modifier: "true"
data:
  resource-modifiers.yaml: |
    version: v1
    resourceModifierRules:
    - conditions:
        groupResource: services
        labelSelector: "type=LoadBalancer"
      patches:
      - operation: add
        path: "/metadata/annotations/service.beta.kubernetes.io~1aws-load-balancer-internal"
        value: "true"
```

## Handling API Version Migrations

Update deprecated API versions during restore:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-migration-modifiers
  namespace: velero
  labels:
    velero.io/resource-modifier: "true"
data:
  resource-modifiers.yaml: |
    version: v1
    resourceModifierRules:
    # Migrate old Ingress API
    - conditions:
        groupResource: ingresses.extensions
      patches:
      - operation: replace
        path: "/apiVersion"
        value: "networking.k8s.io/v1"

    # Update PodSecurityPolicy to Pod Security Standards
    - conditions:
        groupResource: podsecuritypolicies.policy
      patches:
      - operation: add
        path: "/metadata/annotations/pod-security.kubernetes.io~1enforce"
        value: "restricted"
```

## Testing Resource Modifiers

Validate modifications before applying to production:

```bash
#!/bin/bash
# test-resource-modifiers.sh

BACKUP_NAME=$1
MODIFIER_CONFIGMAP=$2

# Create test namespace
TEST_NS="modifier-test-$(date +%s)"
kubectl create namespace $TEST_NS

# Perform restore with modifiers
velero restore create ${TEST_NS}-restore \
  --from-backup $BACKUP_NAME \
  --namespace-mappings production:${TEST_NS} \
  --resource-modifier-configmap $MODIFIER_CONFIGMAP \
  --wait

# Inspect modified resources
echo "Checking modified resources..."
kubectl get deployments -n $TEST_NS -o yaml | grep -A 5 "replicas:\|image:\|resources:"

# Cleanup
kubectl delete namespace $TEST_NS
velero restore delete ${TEST_NS}-restore --confirm
```

## Combining with Restore Hooks

Use resource modifiers with restore hooks for complete transformation:

```yaml
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: complex-restore
  namespace: velero
spec:
  backupName: production-backup
  namespaceMapping:
    production: test
  resourceModifier:
    kind: ConfigMap
    name: resource-modifiers
  hooks:
    resources:
    - name: post-restore-config
      includedNamespaces:
      - test
      postHooks:
      - exec:
          container: app
          command:
          - /scripts/update-config.sh
          onError: Continue
```

## Complex Transformation Example

Real-world example of multi-step transformation:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: complex-modifiers
  namespace: velero
  labels:
    velero.io/resource-modifier: "true"
data:
  resource-modifiers.yaml: |
    version: v1
    resourceModifierRules:
    # 1. Update all images to test registry
    - conditions:
        groupResource: deployments.apps
      patches:
      - operation: replace
        path: "/spec/template/spec/containers/0/image"
        value: "test-registry.internal/myapp:test"

    # 2. Reduce all replicas
    - conditions:
        groupResource: deployments.apps
      patches:
      - operation: replace
        path: "/spec/replicas"
        value: "1"

    # 3. Add test environment labels
    - conditions:
        groupResource: deployments.apps
      patches:
      - operation: add
        path: "/metadata/labels/environment"
        value: "test"

    # 4. Update resource limits
    - conditions:
        groupResource: deployments.apps
      patches:
      - operation: replace
        path: "/spec/template/spec/containers/0/resources"
        value:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"

    # 5. Change service types
    - conditions:
        groupResource: services
        labelSelector: "type=external"
      patches:
      - operation: replace
        path: "/spec/type"
        value: "ClusterIP"

    # 6. Update ingress hosts
    - conditions:
        groupResource: ingresses.networking.k8s.io
      patches:
      - operation: replace
        path: "/spec/rules/0/host"
        value: "test.internal.example.com"

    # 7. Change storage classes
    - conditions:
        groupResource: persistentvolumeclaims
      patches:
      - operation: replace
        path: "/spec/storageClassName"
        value: "standard"
      - operation: replace
        path: "/spec/resources/requests/storage"
        value: "10Gi"
```

## Troubleshooting Resource Modifiers

Debug modifier issues:

```bash
# Check if modifiers are loaded
kubectl get configmap resource-modifiers -n velero -o yaml

# View restore logs for modification details
velero restore logs my-restore | grep -i "modifier\|patch"

# Describe restore to see errors
velero restore describe my-restore --details

# Test JSON patch syntax
echo '{"spec":{"replicas":3}}' | jq '. | .spec.replicas = 1'
```

Common issues:
- Invalid JSON patch path (use `/` separators)
- Patch applied to non-existent field
- Type mismatch in patch value
- Regex pattern doesn't match resources

## Conclusion

Velero resource modifiers provide powerful transformation capabilities during restore operations. They enable flexible disaster recovery scenarios where you need to adapt resources to different environments, update configurations, or migrate API versions automatically.

Start with simple modifications like updating replicas or storage classes, then build up to complex multi-step transformations as your needs grow. Always test modifiers in non-production environments before using them for critical restores.

Remember that resource modifiers execute during the restore process, allowing you to maintain a single backup while supporting multiple deployment scenarios through automated transformation.
